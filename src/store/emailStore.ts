import { create } from 'zustand'
import { EmailTemplate, ScrapeToDbResponse, BulkSendResult } from '@/types'
import { ScrapeTaskProgress, ScrapeTaskResponse } from '@/types/scrape'
import { apiClient } from '@/lib/api'

interface EmailState {
  emails: string[]
  templates: EmailTemplate[]
  totalEmails: number
  isFetchingEmails: boolean
  isFetchingTemplates: boolean
  isScraping: boolean
  activeTaskId: string | null
  scrapeProgress: ScrapeTaskProgress | null
  scrapeStatus: ScrapeTaskResponse['status'] | null
  lastScrapeResult: ScrapeToDbResponse | null
  lastCampaignResult: BulkSendResult | null
  error: string | null

  fetchEmails: () => Promise<void>
  fetchTemplates: () => Promise<void>
  createTemplate: (template: Partial<EmailTemplate>) => Promise<EmailTemplate>
  deleteTemplate: (id: string) => Promise<void>
  runScrape: (emailLimit: number, domainLimit: number, category: string) => Promise<ScrapeTaskResponse>
  checkForActiveTask: () => Promise<void>
  cancelScrape: () => Promise<void>
  sendBulkCampaign: (emails: string[], templateId: string, variables?: Record<string, string>) => Promise<BulkSendResult>
  clearError: () => void
}

let pollingInterval: ReturnType<typeof setInterval> | null = null

function stopPolling() {
  if (pollingInterval) {
    clearInterval(pollingInterval)
    pollingInterval = null
  }
}

export const useEmailStore = create<EmailState>((set, get) => ({
  emails: [],
  templates: [],
  totalEmails: 0,
  isFetchingEmails: false,
  isFetchingTemplates: false,
  isScraping: false,
  activeTaskId: null,
  scrapeProgress: null,
  scrapeStatus: null,
  lastScrapeResult: null,
  lastCampaignResult: null,
  error: null,

  fetchEmails: async () => {
    set({ isFetchingEmails: true, error: null })
    try {
      const data = await apiClient.getAllEmails()
      set({
        emails: data.emails || [],
        totalEmails: data.total || (data.emails ? data.emails.length : 0),
        isFetchingEmails: false,
      })
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || 'Failed to fetch email database.',
        isFetchingEmails: false,
      })
    }
  },

  fetchTemplates: async () => {
    set({ isFetchingTemplates: true, error: null })
    try {
      const templates = await apiClient.getTemplates()
      set({ templates: templates || [], isFetchingTemplates: false })
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || 'Failed to fetch templates.',
        isFetchingTemplates: false,
      })
    }
  },

  createTemplate: async (templateData) => {
    set({ error: null })
    try {
      const newTemplate = await apiClient.createTemplate(templateData)
      set((state) => ({ templates: [newTemplate, ...state.templates] }))
      return newTemplate
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to create template.'
      set({ error: msg })
      throw new Error(msg)
    }
  },

  deleteTemplate: async (id) => {
    set({ error: null })
    try {
      await apiClient.deleteTemplate(id)
      set((state) => ({ templates: state.templates.filter((t) => t.id !== id) }))
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to delete template.' })
    }
  },

  runScrape: async (emailLimit, domainLimit, category) => {
    set({ isScraping: true, error: null, lastScrapeResult: null, scrapeProgress: null, scrapeStatus: 'pending' })

    try {
      // Step 1: Kick off the background task
      const taskResponse = await apiClient.scrapeToDb({
        email_limit: emailLimit,
        domain_limit: domainLimit,
        category,
      })

      const taskId = taskResponse.task_id
      set({
        activeTaskId: taskId,
        scrapeStatus: taskResponse.status,
        scrapeProgress: taskResponse.progress,
      })

      // Step 2: Start polling for live progress
      return await new Promise<ScrapeTaskResponse>((resolve, reject) => {
        stopPolling()

        pollingInterval = setInterval(async () => {
          try {
            const status = await apiClient.getScrapeTaskStatus(taskId)

            set({
              scrapeProgress: status.progress,
              scrapeStatus: status.status,
            })

            if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
              stopPolling()

              if (status.status === 'completed') {
                // Build a ScrapeToDbResponse-compatible result for the UI
                const finalResult: ScrapeToDbResponse = {
                  total_processed: status.progress.domains_scraped,
                  successful_leads: status.results?.filter(r => r.status === 'success').length || 0,
                  total_emails_found: status.progress.emails_found,
                  total_emails_saved: status.progress.emails_saved,
                  duplicates_skipped: status.progress.duplicates_skipped,
                  errors: status.progress.errors,
                  results: status.results || [],
                }
                set({
                  lastScrapeResult: finalResult,
                  isScraping: false,
                  activeTaskId: null,
                  scrapeStatus: 'completed',
                })
                // Refresh email list after scrape completes
                get().fetchEmails()
                resolve(status)
              } else if (status.status === 'cancelled') {
                set({ isScraping: false, activeTaskId: null, scrapeStatus: 'cancelled' })
                resolve(status)
              } else {
                // failed
                set({
                  isScraping: false,
                  activeTaskId: null,
                  scrapeStatus: 'failed',
                  error: status.error || 'Scrape task failed.',
                })
                reject(new Error(status.error || 'Scrape task failed.'))
              }
            }
          } catch (pollErr: any) {
            // If polling itself fails, keep trying — backend might be temporarily slow
            console.warn('Poll error:', pollErr.message)
          }
        }, 3000)
      })
    } catch (err: any) {
      stopPolling()

      // Detect 409 Conflict — scrape already in progress
      const statusCode = err.response?.status
      const detail = err.response?.data?.detail

      if (statusCode === 409) {
        set({ error: detail || 'A scrape task is already in progress.', isScraping: false, scrapeStatus: null })
        throw new Error(detail || 'A scrape task is already in progress.')
      }

      const msg = detail || err.message || 'Scraping failed.'
      set({ error: msg, isScraping: false, activeTaskId: null, scrapeStatus: null })
      throw new Error(msg)
    }
  },

  checkForActiveTask: async () => {
    try {
      const tasksData = await apiClient.getScrapeTasks()
      const activeTask = tasksData.tasks.find(
        (t) => t.status === 'running' || t.status === 'pending'
      )

      if (activeTask) {
        set({
          isScraping: true,
          activeTaskId: activeTask.task_id,
          scrapeProgress: activeTask.progress,
          scrapeStatus: activeTask.status,
        })

        // Resume polling
        stopPolling()
        pollingInterval = setInterval(async () => {
          try {
            const status = await apiClient.getScrapeTaskStatus(activeTask.task_id)

            set({
              scrapeProgress: status.progress,
              scrapeStatus: status.status,
            })

            if (status.status === 'completed' || status.status === 'failed' || status.status === 'cancelled') {
              stopPolling()

              if (status.status === 'completed') {
                const finalResult: ScrapeToDbResponse = {
                  total_processed: status.progress.domains_scraped,
                  successful_leads: status.results?.filter(r => r.status === 'success').length || 0,
                  total_emails_found: status.progress.emails_found,
                  total_emails_saved: status.progress.emails_saved,
                  duplicates_skipped: status.progress.duplicates_skipped,
                  errors: status.progress.errors,
                  results: status.results || [],
                }
                set({
                  lastScrapeResult: finalResult,
                  isScraping: false,
                  activeTaskId: null,
                  scrapeStatus: 'completed',
                })
                get().fetchEmails()
              } else {
                set({
                  isScraping: false,
                  activeTaskId: null,
                  scrapeStatus: status.status,
                  error: status.error || undefined,
                })
              }
            }
          } catch (pollErr: any) {
            console.warn('Resume poll error:', pollErr.message)
          }
        }, 3000)
      }
    } catch {
      // Silently ignore — server might not be reachable
    }
  },

  cancelScrape: async () => {
    const taskId = get().activeTaskId
    if (!taskId) return

    try {
      await apiClient.cancelScrapeTask(taskId)
      stopPolling()
      set({
        isScraping: false,
        activeTaskId: null,
        scrapeStatus: 'cancelled',
        scrapeProgress: null,
      })
    } catch (err: any) {
      set({ error: err.response?.data?.detail || 'Failed to cancel scrape task.' })
    }
  },

  sendBulkCampaign: async (recipientEmails, templateId, variables) => {
    set({ error: null })
    try {
      const res = await apiClient.sendBulkEmails({
        recipient_emails: recipientEmails,
        template_id: templateId,
        variables,
      })
      set({ lastCampaignResult: res })
      return res
    } catch (err: any) {
      const msg = err.response?.data?.detail || 'Failed to dispatch bulk campaign.'
      set({ error: msg })
      throw new Error(msg)
    }
  },

  clearError: () => set({ error: null }),
}))
