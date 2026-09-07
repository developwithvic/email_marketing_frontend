'use client'

import { useState, useEffect } from 'react'
import {
  Mail,
  Search,
  Download,
  Send,
  CheckSquare,
  Square,
  RefreshCw,
  Tag,
  Building2,
  ChevronDown,
} from 'lucide-react'
import { useEmailStore } from '@/store/emailStore'
import { TARGET_CATEGORIES, TargetCategoryKey, EmailRecord } from '@/types/email'
import { downloadCSV } from '@/lib/utils'
import { Modal } from '@/components/common/Modal'
import { apiClient } from '@/lib/api'
import toast from 'react-hot-toast'

export default function EmailsPage() {
  const { emails, totalEmails, categoryCounts, isFetchingEmails, fetchEmails, templates } = useEmailStore()

  const [search, setSearch] = useState('')
  const [selectedEmails, setSelectedEmails] = useState<string[]>([])
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<TargetCategoryKey>('ALL')

  // Send single modal state
  const [sendModalOpen, setSendModalOpen] = useState(false)
  const [targetEmail, setTargetEmail] = useState('')
  const [selectedTemplateId, setSelectedTemplateId] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    fetchEmails()
  }, [])

  // Filter logic
  const filteredEmails = emails.filter((item: EmailRecord) => {
    const emailStr = item.email || ''
    const domainStr = item.domain || ''
    const subcatStr = item.subcategory || ''
    const catStr = item.category || 'GENERAL'

    const query = search.toLowerCase()
    const matchesSearch =
      emailStr.toLowerCase().includes(query) ||
      domainStr.toLowerCase().includes(query) ||
      subcatStr.toLowerCase().includes(query) ||
      catStr.toLowerCase().includes(query)

    if (!matchesSearch) return false

    if (activeCategoryFilter === 'ALL') return true

    const itemCatNorm = catStr.toUpperCase()
    if (activeCategoryFilter === 'GENERAL') {
      return itemCatNorm === 'GENERAL' || itemCatNorm === 'WEB' || itemCatNorm === 'MARKETING'
    }

    return itemCatNorm === activeCategoryFilter
  })

  const toggleSelectAll = () => {
    if (selectedEmails.length === filteredEmails.length && filteredEmails.length > 0) {
      setSelectedEmails([])
    } else {
      setSelectedEmails(filteredEmails.map((e) => e.email))
    }
  }

  const toggleSelect = (email: string) => {
    if (selectedEmails.includes(email)) {
      setSelectedEmails(selectedEmails.filter((e) => e !== email))
    } else {
      setSelectedEmails([...selectedEmails, email])
    }
  }

  const handleExportCSV = (exportCategory?: TargetCategoryKey) => {
    const catToExport = exportCategory || activeCategoryFilter

    let targetList: EmailRecord[] = []
    if (selectedEmails.length > 0) {
      targetList = emails.filter((e) => selectedEmails.includes(e.email))
    } else if (catToExport === 'ALL') {
      targetList = filteredEmails
    } else {
      targetList = emails.filter((e) => {
        const catNorm = (e.category || 'GENERAL').toUpperCase()
        if (catToExport === 'GENERAL') {
          return catNorm === 'GENERAL' || catNorm === 'WEB' || catNorm === 'MARKETING'
        }
        return catNorm === catToExport
      })
    }

    if (targetList.length === 0) {
      toast.error('No emails available to export for this category.')
      return
    }

    const headers = 'Email Address,Domain,Category,Subcategory\n'
    const csvContent =
      headers +
      targetList
        .map((e) => `"${e.email}","${e.domain || ''}","${e.category || 'GENERAL'}","${e.subcategory || ''}"`)
        .join('\n')

    const categoryLabel = catToExport.toLowerCase().replace('_', '-')
    downloadCSV(`leads-${categoryLabel}-${Date.now()}.csv`, csvContent)
    toast.success(`Exported ${targetList.length} leads (${catToExport}) to CSV!`)
  }

  const openSendSingleModal = (email: string) => {
    setTargetEmail(email)
    if (templates.length > 0) {
      setSelectedTemplateId(templates[0].id)
    }
    setSendModalOpen(true)
  }

  const handleSendSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedTemplateId) {
      toast.error('Please select an email template.')
      return
    }
    setIsSending(true)
    try {
      await apiClient.sendSingleEmail({
        recipient_email: targetEmail,
        template_id: selectedTemplateId,
        variables: { recipient_name: targetEmail.split('@')[0], company_name: targetEmail.split('@')[1] },
      })
      toast.success(`Email successfully sent to ${targetEmail}!`)
      setSendModalOpen(false)
    } catch (err: any) {
      toast.error(err.message || 'Failed to send email.')
    } finally {
      setIsSending(false)
    }
  }

  const getCategoryBadgeClass = (category?: string) => {
    const cat = (category || 'GENERAL').toUpperCase()
    switch (cat) {
      case 'LOCAL_SERVICES':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
      case 'HEALTH_CARE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
      case 'FOOD_HOSPITALITY':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20'
      case 'PROFESSIONAL_SERVICES':
        return 'bg-purple-500/10 text-purple-400 border-purple-500/20'
      default:
        return 'bg-slate-700/30 text-gray-300 border-slate-600/30'
    }
  }

  const getCategoryLabel = (category?: string) => {
    const cat = (category || 'GENERAL').toUpperCase()
    const found = TARGET_CATEGORIES.find((c) => c.id === cat)
    return found ? found.name : category || 'General Business'
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-3xl border border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-extrabold text-white flex items-center gap-3">
              <Mail className="w-6 h-6 text-blue-400" />
              Categorized Email Lead Database
            </h2>
            <span className="px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 font-bold text-xs whitespace-nowrap">
              {totalEmails || emails.length} Total Verified
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            Categorized automatically by scraped website. Filter, inspect by sector, and export targeted leads to CSV.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchEmails()}
            disabled={isFetchingEmails}
            className="p-2.5 rounded-xl bg-slate-800 text-gray-300 hover:text-white border border-white/10 text-xs font-semibold whitespace-nowrap transition-colors"
            title="Refresh lead database"
          >
            <RefreshCw className={`w-4 h-4 ${isFetchingEmails ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => handleExportCSV()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap shadow-lg shadow-blue-600/20"
          >
            <Download className="w-4 h-4" />
            Export CSV ({selectedEmails.length > 0 ? `${selectedEmails.length} Selected` : activeCategoryFilter === 'ALL' ? 'All' : getCategoryLabel(activeCategoryFilter)})
          </button>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
        {/* Search input */}
        <div className="relative w-full">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email handle, domain, sector, or subcategory (e.g., Plumbers, Care agencies, Takeaway)..."
            className="w-full glass-input pl-10 pr-4 py-2.5 rounded-xl text-sm font-medium"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {TARGET_CATEGORIES.map((cat) => {
            const count =
              cat.id === 'ALL'
                ? totalEmails || emails.length
                : cat.id === 'GENERAL'
                ? (categoryCounts['GENERAL'] || 0) + (categoryCounts['WEB'] || 0) + (categoryCounts['MARKETING'] || 0)
                : categoryCounts[cat.id] || 0

            const isActive = activeCategoryFilter === cat.id

            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryFilter(cat.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                  isActive
                    ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-md shadow-blue-500/10'
                    : 'text-gray-400 hover:text-white hover:bg-white/5 border-transparent'
                }`}
              >
                <span>{cat.name}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isActive ? 'bg-blue-500/30 text-blue-200' : 'bg-slate-800 text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Database Table */}
      <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-gray-400 uppercase font-bold text-[10px] tracking-wider border-b border-white/10">
              <tr>
                <th className="py-4 px-6 w-12 text-center">
                  <button onClick={toggleSelectAll} className="text-gray-400 hover:text-white whitespace-nowrap">
                    {selectedEmails.length > 0 && selectedEmails.length === filteredEmails.length ? (
                      <CheckSquare className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Domain</th>
                <th className="py-4 px-6">Industry Category</th>
                <th className="py-4 px-6">Subcategory / Niche</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium">
              {filteredEmails.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-500 italic">
                    No emails found matching your query or filter. Try running the UK Scraper to acquire new leads.
                  </td>
                </tr>
              ) : (
                filteredEmails.map((item: EmailRecord, idx: number) => {
                  const email = item.email
                  const domain = item.domain || (email.split('@')[1] || 'domain.co.uk')
                  const category = item.category || 'GENERAL'
                  const subcategory = item.subcategory
                  const isSelected = selectedEmails.includes(email)

                  return (
                    <tr
                      key={item.id || idx}
                      className={`hover:bg-white/5 transition-colors ${
                        isSelected ? 'bg-blue-600/10' : ''
                      }`}
                    >
                      <td className="py-3.5 px-6 text-center">
                        <button onClick={() => toggleSelect(email)} className="text-gray-400 hover:text-white whitespace-nowrap">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-400" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                      <td className="py-3.5 px-6 font-bold text-white flex items-center gap-2">
                        <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                        <span className="truncate max-w-[240px]">{email}</span>
                      </td>
                      <td className="py-3.5 px-6 text-gray-300 font-mono text-[11px]">{domain}</td>
                      <td className="py-3.5 px-6">
                        <span
                          className={`px-2.5 py-1 rounded-full border text-[10px] font-bold whitespace-nowrap inline-flex items-center gap-1.5 ${getCategoryBadgeClass(
                            category
                          )}`}
                        >
                          <Building2 className="w-3 h-3" />
                          {getCategoryLabel(category)}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        {subcategory ? (
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-gray-300 text-[11px] font-medium inline-flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-blue-400" />
                            {subcategory}
                          </span>
                        ) : (
                          <span className="text-gray-600 text-[11px] italic">General Lead</span>
                        )}
                      </td>
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => openSendSingleModal(email)}
                          className="px-3 py-1.5 rounded-lg bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 text-xs font-semibold transition-all inline-flex items-center gap-1.5 whitespace-nowrap"
                        >
                          <Send className="w-3 h-3" />
                          Send Mail
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Single Email Modal */}
      <Modal
        isOpen={sendModalOpen}
        onClose={() => setSendModalOpen(false)}
        title="Send Email to Contact"
        subtitle={`Recipient: ${targetEmail}`}
      >
        <form onSubmit={handleSendSingleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
              Select Email Template
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              required
              className="w-full glass-input px-4 py-3 rounded-xl text-sm font-semibold bg-slate-900 text-white"
            >
              {templates.map((tpl) => (
                <option key={tpl.id} value={tpl.id}>
                  {tpl.name} ({tpl.template_type})
                </option>
              ))}
            </select>
          </div>

          <div className="p-4 rounded-xl bg-slate-900 border border-white/5 text-xs space-y-2">
            <p className="text-gray-400 font-semibold">Dynamic Variables Auto-Filled:</p>
            <p className="text-gray-300 font-mono">
              recipient_name: <span className="text-blue-400">{targetEmail.split('@')[0]}</span>
            </p>
            <p className="text-gray-300 font-mono">
              company_name: <span className="text-blue-400">{targetEmail.split('@')[1]}</span>
            </p>
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
          >
            {isSending ? 'Dispatching...' : 'Confirm & Send Email'}
          </button>
        </form>
      </Modal>
    </div>
  )
}
