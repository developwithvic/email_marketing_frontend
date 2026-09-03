'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Database,
  Play,
  Download,
  Filter,
  Globe,
  Loader2,
  Terminal,
  RefreshCw,
  XCircle,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react'
import { useEmailStore } from '@/store/emailStore'
import { DomainScrapeResult } from '@/types'
import { downloadCSV } from '@/lib/utils'
import toast from 'react-hot-toast'

export default function ScrapePage() {
  const {
    runScrape,
    isScraping,
    scrapeProgress,
    scrapeStatus,
    activeTaskId,
    lastScrapeResult,
    checkForActiveTask,
    cancelScrape,
    error,
    clearError,
  } = useEmailStore()

  const [domainLimit, setDomainLimit] = useState(50)
  const [emailLimit, setEmailLimit] = useState(500)
  const [category, setCategory] = useState('WEB')

  const [logs, setLogs] = useState<string[]>([])
  const logEndRef = useRef<HTMLDivElement>(null)
  const prevProgressRef = useRef(scrapeProgress)

  // On mount, check if there's an active task from the backend (e.g. page was refreshed mid-scrape)
  useEffect(() => {
    checkForActiveTask()
  }, [])

  // Auto-scroll log console to bottom
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  // Stream real progress into the log console
  useEffect(() => {
    const prev = prevProgressRef.current
    const curr = scrapeProgress

    if (!curr) return

    const newLogs: string[] = []
    const ts = new Date().toLocaleTimeString()

    if (!prev && curr) {
      // First progress update
      newLogs.push(`[${ts}] ▶ Scrape task started. Discovering ${curr.total_domains} UK domains...`)
    }

    if (prev && curr.domains_scraped > prev.domains_scraped) {
      const newDomains = curr.domains_scraped - prev.domains_scraped
      const newEmails = curr.emails_found - prev.emails_found
      newLogs.push(
        `[${ts}] Scraped ${newDomains} new domain(s) → ${newEmails} email(s) found. ` +
        `Total: ${curr.domains_scraped}/${curr.total_domains} domains, ${curr.emails_found} emails.`
      )
    }

    if (prev && curr.emails_saved > prev.emails_saved) {
      newLogs.push(`[${ts}] 💾 Saved ${curr.emails_saved} emails to database (${curr.duplicates_skipped} duplicates skipped).`)
    }

    if (newLogs.length > 0) {
      setLogs((l) => [...l, ...newLogs])
    }

    prevProgressRef.current = curr
  }, [scrapeProgress])

  // Log status transitions
  useEffect(() => {
    const ts = new Date().toLocaleTimeString()

    if (scrapeStatus === 'completed' && scrapeProgress) {
      setLogs((l) => [
        ...l,
        `[${ts}] ✅ SUCCESS: Operation complete! Saved ${scrapeProgress.emails_saved} emails, skipped ${scrapeProgress.duplicates_skipped} duplicates, ${scrapeProgress.errors} errors.`,
      ])
      toast.success(`Scraped ${scrapeProgress.emails_saved} new UK emails!`)
    }

    if (scrapeStatus === 'failed') {
      setLogs((l) => [...l, `[${ts}] ❌ ERROR: Scrape task failed. ${error || ''}`])
      toast.error(error || 'Scrape operation failed')
    }

    if (scrapeStatus === 'cancelled') {
      setLogs((l) => [...l, `[${ts}] ⚠️ Scrape task was cancelled.`])
      toast('Scrape cancelled', { icon: '⚠️' })
    }
  }, [scrapeStatus])

  const handleStartScrape = async (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    prevProgressRef.current = null

    setLogs([
      `[${new Date().toLocaleTimeString()}] Initializing UK Lead Discovery Engine...`,
      `[${new Date().toLocaleTimeString()}] Parameters: ${domainLimit} domains, max ${emailLimit} emails, category: ${category}`,
    ])

    try {
      await runScrape(emailLimit, domainLimit, category)
    } catch (err: any) {
      if (!logs.some((l) => l.includes('ERROR') || l.includes('already in progress'))) {
        setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ❌ ${err.message}`])
      }
      toast.error(err.message || 'Scrape operation failed')
    }
  }

  const handleCancel = async () => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Sending cancel request...`])
    await cancelScrape()
  }

  const handleExportResultsCSV = () => {
    if (!lastScrapeResult || !lastScrapeResult.results) return
    const allEmails: string[] = []
    lastScrapeResult.results.forEach((r) => {
      r.emails.forEach((e) => allEmails.push(`${e},${r.domain},${r.status}`))
    })
    const csv = `Email,Domain,Status\n` + allEmails.join('\n')
    downloadCSV(`scraped-uk-emails-${Date.now()}.csv`, csv)
    toast.success('Exported results to CSV!')
  }

  // Calculate progress percentage from real data
  const progressPercent =
    scrapeProgress && scrapeProgress.total_domains > 0
      ? Math.round((scrapeProgress.domains_scraped / scrapeProgress.total_domains) * 100)
      : scrapeStatus === 'pending'
      ? 2
      : 0

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-400" />
            UK Email Scraper Command Center
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Automated UK domain discovery via web archive search with duplicate filtering.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isScraping && activeTaskId && (
            <button
              onClick={handleCancel}
              className="px-4 py-2.5 rounded-xl bg-rose-600/20 text-rose-400 hover:bg-rose-600/30 border border-rose-500/30 text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <XCircle className="w-4 h-4" />
              Cancel Scrape
            </button>
          )}

          {lastScrapeResult && (
            <button
              onClick={handleExportResultsCSV}
              className="px-4 py-2.5 rounded-xl bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap"
            >
              <Download className="w-4 h-4" />
              Export Scrape CSV
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Scrape Controls Form (1 Col) */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
            <Filter className="w-4 h-4 text-blue-400" />
            Scraper Configuration
          </h3>

          <form onSubmit={handleStartScrape} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                UK Domains Limit (1 - 10,000)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={domainLimit}
                onChange={(e) => setDomainLimit(Number(e.target.value))}
                required
                disabled={isScraping}
                className="w-full glass-input px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              />
              <p className="text-[11px] text-gray-400 mt-1">Number of UK registered domains to crawl.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Max Email Stop Threshold
              </label>
              <input
                type="number"
                min={10}
                max={100000}
                value={emailLimit}
                onChange={(e) => setEmailLimit(Number(e.target.value))}
                required
                disabled={isScraping}
                className="w-full glass-input px-4 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
              />
              <p className="text-[11px] text-gray-400 mt-1">Stops crawling automatically once target is hit.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Lead Classification Tag
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={isScraping}
                className="w-full glass-input px-4 py-3 rounded-xl text-sm font-semibold bg-slate-900 text-white disabled:opacity-50"
              >
                <option value="WEB">WEB - General Business</option>
                <option value="TECH">TECH - Software &amp; Engineering</option>
                <option value="FINANCE">FINANCE - Banking &amp; Accounting</option>
                <option value="RETAIL">RETAIL - E-Commerce &amp; Stores</option>
                <option value="HEALTH">HEALTH - Medical &amp; Biotech</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isScraping}
                className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Scraping In Progress...
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current" />
                    Execute Scrape Operation
                  </>
                )}
              </button>
            </div>

            {/* Active scrape warning */}
            {isScraping && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold">Scrape in progress</p>
                  <p className="text-amber-400/80 mt-0.5">
                    A scrape task is currently running. Wait for it to complete or cancel it before starting a new one.
                  </p>
                  {activeTaskId && (
                    <p className="text-amber-400/60 mt-1 font-mono text-[10px]">
                      Task ID: {activeTaskId.slice(0, 8)}...
                    </p>
                  )}
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Live Terminal & Stream Logs (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Bar Panel */}
          {(isScraping || scrapeStatus === 'completed') && scrapeProgress && (
            <div className="glass-panel p-6 rounded-3xl border border-blue-500/30 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-blue-400 flex items-center gap-2">
                  {isScraping ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                  {isScraping ? (
                    <>
                      Scanning: <span className="text-white">{scrapeProgress.domains_scraped}/{scrapeProgress.total_domains} domains</span>
                    </>
                  ) : (
                    <span className="text-emerald-400">Scrape Complete</span>
                  )}
                </span>
                <span className="text-white">{progressPercent}%</span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-900 overflow-hidden border border-white/10">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    scrapeStatus === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${progressPercent}%` }}
                />
              </div>

              {/* Live Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Domains</p>
                  <p className="text-lg font-extrabold text-white">
                    {scrapeProgress.domains_scraped}
                    <span className="text-gray-500 text-xs font-normal">/{scrapeProgress.total_domains}</span>
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Emails Found</p>
                  <p className="text-lg font-extrabold text-blue-400">{scrapeProgress.emails_found}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Saved to DB</p>
                  <p className="text-lg font-extrabold text-emerald-400">{scrapeProgress.emails_saved}</p>
                </div>
                <div className="text-center">
                  <p className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Duplicates</p>
                  <p className="text-lg font-extrabold text-amber-400">{scrapeProgress.duplicates_skipped}</p>
                </div>
              </div>
            </div>
          )}

          {/* Console Output */}
          <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden">
            <div className="px-6 py-4 bg-slate-950 border-b border-white/10 flex items-center justify-between">
              <span className="text-xs font-bold text-gray-300 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-blue-400" />
                Live Scrape Console Output
              </span>
              <span className="text-[10px] font-mono text-gray-400">
                {isScraping ? (
                  <span className="text-emerald-400 animate-pulse">● LIVE</span>
                ) : (
                  'session_log.txt'
                )}
              </span>
            </div>
            <div className="p-6 bg-slate-950 font-mono text-xs text-gray-300 h-64 overflow-y-auto space-y-2">
              {logs.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-500 italic">
                  Press &apos;Execute Scrape Operation&apos; to launch UK domain crawling...
                </div>
              ) : (
                <>
                  {logs.map((log, idx) => (
                    <div
                      key={idx}
                      className={
                        log.includes('SUCCESS') || log.includes('✅')
                          ? 'text-emerald-400 font-bold'
                          : log.includes('ERROR') || log.includes('❌')
                          ? 'text-rose-400 font-bold'
                          : log.includes('⚠️')
                          ? 'text-amber-400 font-bold'
                          : 'text-gray-300'
                      }
                    >
                      {log}
                    </div>
                  ))}
                  <div ref={logEndRef} />
                </>
              )}
            </div>
          </div>

          {/* Scrape Metrics Breakdown */}
          {lastScrapeResult && !isScraping && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="glass-panel p-4 rounded-2xl border border-white/10 text-center">
                <p className="text-xs font-semibold text-gray-400">Total Processed</p>
                <p className="text-2xl font-extrabold text-white mt-1">{lastScrapeResult.total_processed}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-emerald-500/20 text-center">
                <p className="text-xs font-semibold text-gray-400">Leads Saved</p>
                <p className="text-2xl font-extrabold text-emerald-400 mt-1">{lastScrapeResult.total_emails_saved}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-amber-500/20 text-center">
                <p className="text-xs font-semibold text-gray-400">Duplicates Skipped</p>
                <p className="text-2xl font-extrabold text-amber-400 mt-1">{lastScrapeResult.duplicates_skipped}</p>
              </div>
              <div className="glass-panel p-4 rounded-2xl border border-rose-500/20 text-center">
                <p className="text-xs font-semibold text-gray-400">Errors</p>
                <p className="text-2xl font-extrabold text-rose-400 mt-1">{lastScrapeResult.errors}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Results Breakdown Table */}
      {lastScrapeResult && lastScrapeResult.results && lastScrapeResult.results.length > 0 && !isScraping && (
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden space-y-4">
          <div className="p-6 border-b border-white/10 flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-blue-400" />
              Scraped Domain Breakdown Details
            </h3>
            <span className="text-xs text-gray-400 font-semibold">
              Showing {lastScrapeResult.results.length} domains
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-white/10">
                <tr>
                  <th className="py-3.5 px-6">Domain</th>
                  <th className="py-3.5 px-6">Status</th>
                  <th className="py-3.5 px-6">Extracted Emails</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {lastScrapeResult.results.map((r: DomainScrapeResult, idx: number) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6 text-white font-bold">{r.domain}</td>
                    <td className="py-4 px-6">
                      {r.status === 'success' ? (
                        <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold whitespace-nowrap">
                          Success
                        </span>
                      ) : r.status === 'no_emails_found' ? (
                        <span className="px-2.5 py-1 rounded-full bg-gray-500/10 text-gray-400 border border-gray-500/20 text-[10px] font-bold whitespace-nowrap">
                          No Emails
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold whitespace-nowrap">
                          Error
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {r.emails.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {r.emails.map((email, eIdx) => (
                            <span
                              key={eIdx}
                              className="px-2 py-0.5 rounded-md bg-blue-600/20 text-blue-300 border border-blue-500/30 text-[11px]"
                            >
                              {email}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">No emails found</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
