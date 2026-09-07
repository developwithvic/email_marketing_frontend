'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Send,
  Zap,
  BarChart,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { useEmailStore } from '@/store/emailStore'
import { useAuthStore } from '@/store/authStore'
import { BulkSendResult } from '@/types'
import toast from 'react-hot-toast'

function CampaignContent() {
  const searchParams = useSearchParams()
  const templateIdParam = searchParams.get('templateId')

  const { emails, templates, fetchEmails, fetchTemplates, sendBulkCampaign } = useEmailStore()
  const { profile } = useAuthStore()

  const [recipientSource, setRecipientSource] = useState<'DATABASE' | 'CUSTOM'>('DATABASE')
  const [customEmailsInput, setCustomEmailsInput] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('')

  // Variable Overrides
  const [companyNameVar, setCompanyNameVar] = useState('LeadFlow Enterprise')
  const [senderNameVar, setSenderNameVar] = useState('Marketing Team')
  const [offerPercentageVar, setOfferPercentageVar] = useState('20%')

  const [isSending, setIsSending] = useState(false)
  const [campaignResult, setCampaignResult] = useState<BulkSendResult | null>(null)

  useEffect(() => {
    fetchEmails()
    fetchTemplates()
  }, [])

  useEffect(() => {
    if (templateIdParam && templates.length > 0) {
      const match = templates.find((t) => t.id === templateIdParam)
      if (match) setSelectedTemplateId(match.id)
    } else if (templates.length > 0 && !selectedTemplateId) {
      setSelectedTemplateId(templates[0].id)
    }
  }, [templateIdParam, templates])

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId)

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplateId) {
      toast.error('Please select an email template.')
      return
    }

    let targetRecipients: string[] = []
    if (recipientSource === 'DATABASE') {
      targetRecipients = emails.map((e: any) => (typeof e === 'string' ? e : e.email)).filter(Boolean)
    } else {
      targetRecipients = customEmailsInput
        .split('\n')
        .map((e) => e.trim())
        .filter((e) => e.length > 3 && e.includes('@'))
    }

    if (targetRecipients.length === 0) {
      toast.error('No valid recipient emails found for campaign.')
      return
    }

    setIsSending(true)
    setCampaignResult(null)

    try {
      toast.loading(`Dispatching campaign to ${targetRecipients.length} recipients...`, { id: 'campaign-toast' })
      const res = await sendBulkCampaign(targetRecipients, selectedTemplateId, {
        company_name: companyNameVar,
        sender_name: senderNameVar,
        offer_percentage: offerPercentageVar,
      })
      setCampaignResult(res)
      toast.success(
        `Campaign dispatched! ${res.successful} emails successfully sent (${res.failed} failed).`,
        { id: 'campaign-toast' }
      )
    } catch (err: any) {
      toast.error(err.message || 'Campaign execution failed', { id: 'campaign-toast' })
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10">
        <div>
          <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
            <Send className="w-6 h-6 text-blue-400" />
            Bulk Campaign Mailer Center
          </h2>
          <p className="text-xs text-gray-400 mt-1">
            Dispatch personalized outreach emails in optimized batches with delivery tracking.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Campaign Configuration Form (2 Cols) */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
            <Zap className="w-5 h-5 text-blue-400" />
            Campaign Parameters & Dispatcher
          </h3>

          <form onSubmit={handleLaunchCampaign} className="space-y-6">
            {/* Template Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                1. Select Email Outreach Template
              </label>
              <select
                value={selectedTemplateId}
                onChange={(e) => setSelectedTemplateId(e.target.value)}
                required
                className="w-full glass-input px-4 py-3 rounded-xl text-sm font-semibold bg-slate-900 text-white"
              >
                {templates.map((tpl) => (
                  <option key={tpl.id} value={tpl.id}>
                    {tpl.name} — ({tpl.template_type})
                  </option>
                ))}
              </select>

              {selectedTemplate && (
                <div className="mt-3 p-3.5 rounded-xl bg-slate-900 border border-white/5 text-xs space-y-1">
                  <p className="text-gray-400 font-semibold">Subject Preview:</p>
                  <p className="text-blue-400 font-mono">{selectedTemplate.subject}</p>
                </div>
              )}
            </div>

            {/* Recipient Source Selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                2. Target Recipient Source
              </label>

              <div className="grid grid-cols-2 gap-4 mb-3">
                <button
                  type="button"
                  onClick={() => setRecipientSource('DATABASE')}
                  className={`p-4 rounded-2xl border text-left transition-all whitespace-nowrap ${
                    recipientSource === 'DATABASE'
                      ? 'bg-blue-600/20 border-blue-500/50 text-white font-bold'
                      : 'glass-card border-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-1">Scraped Lead Database</p>
                  <p className="text-xl font-extrabold text-white">{emails.length} Verified Contacts</p>
                </button>

                <button
                  type="button"
                  onClick={() => setRecipientSource('CUSTOM')}
                  className={`p-4 rounded-2xl border text-left transition-all whitespace-nowrap ${
                    recipientSource === 'CUSTOM'
                      ? 'bg-blue-600/20 border-blue-500/50 text-white font-bold'
                      : 'glass-card border-white/5 text-gray-400 hover:text-white'
                  }`}
                >
                  <p className="text-xs font-bold uppercase tracking-wider mb-1">Custom Recipient List</p>
                  <p className="text-sm font-medium text-gray-300">Paste line-separated emails</p>
                </button>
              </div>

              {recipientSource === 'CUSTOM' && (
                <textarea
                  value={customEmailsInput}
                  onChange={(e) => setCustomEmailsInput(e.target.value)}
                  rows={4}
                  placeholder={`contact@company1.co.uk\ninfo@company2.co.uk\nsales@company3.co.uk`}
                  className="w-full glass-input p-4 rounded-xl text-xs font-mono"
                />
              )}
            </div>

            {/* Dynamic Variables Overrides */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                3. Dynamic Variable Overrides
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">{`{company_name}`}</label>
                  <input
                    type="text"
                    value={companyNameVar}
                    onChange={(e) => setCompanyNameVar(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">{`{sender_name}`}</label>
                  <input
                    type="text"
                    value={senderNameVar}
                    onChange={(e) => setSenderNameVar(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-gray-400 mb-1">{`{offer_percentage}`}</label>
                  <input
                    type="text"
                    value={offerPercentageVar}
                    onChange={(e) => setOfferPercentageVar(e.target.value)}
                    className="w-full glass-input px-3 py-2 rounded-xl text-xs font-medium"
                  />
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full py-4 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
            >
              {isSending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing Batched Delivery...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Dispatch Bulk Email Campaign Now
                </>
              )}
            </button>
          </form>
        </div>

        {/* Campaign Execution Results Log (1 Col) */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2 border-b border-white/10 pb-4">
            <BarChart className="w-5 h-5 text-blue-400" />
            Dispatch Live Report
          </h3>

          {!campaignResult ? (
            <div className="py-12 text-center text-gray-500 text-xs italic">
              Configure your campaign settings and press 'Dispatch Bulk Email Campaign' to start.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Success Delivery</p>
                <p className="text-3xl font-extrabold text-emerald-400 mt-1">
                  {campaignResult.successful} / {campaignResult.total_recipients}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3 rounded-xl glass-card">
                  <p className="text-[11px] text-gray-400">Total Targets</p>
                  <p className="text-lg font-bold text-white mt-0.5">{campaignResult.total_recipients}</p>
                </div>
                <div className="p-3 rounded-xl glass-card">
                  <p className="text-[11px] text-gray-400">Failed Mails</p>
                  <p className="text-lg font-bold text-rose-400 mt-0.5">{campaignResult.failed}</p>
                </div>
              </div>

              {campaignResult.errors.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Failed Recipient Breakdown
                  </p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-3 rounded-xl bg-slate-950 text-xs font-mono">
                    {campaignResult.errors.map((err, idx) => (
                      <div key={idx} className="text-rose-300 flex justify-between">
                        <span>{err.email}</span>
                        <span className="text-gray-500">{err.reason}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CampaignsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Loading Campaign Studio...</div>}>
      <CampaignContent />
    </Suspense>
  )
}

