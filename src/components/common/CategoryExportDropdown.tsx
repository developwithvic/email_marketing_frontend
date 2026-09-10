'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, ChevronDown, Check, CheckSquare, Sparkles } from 'lucide-react'
import { useEmailStore } from '@/store/emailStore'
import { TARGET_CATEGORIES, TargetCategoryKey } from '@/types/email'
import { apiClient } from '@/lib/api'
import { downloadCSV } from '@/lib/utils'
import toast from 'react-hot-toast'

interface CategoryExportDropdownProps {
  activeCategory?: TargetCategoryKey
  selectedEmails?: string[]
  variant?: 'primary' | 'secondary' | 'glass'
  className?: string
  buttonText?: string
}

export const CategoryExportDropdown = ({
  activeCategory = 'ALL',
  selectedEmails = [],
  variant = 'primary',
  className = '',
  buttonText,
}: CategoryExportDropdownProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const { emails, totalEmails, categoryCounts } = useEmailStore()

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleExport = async (categoryKey?: TargetCategoryKey, exportSelectedOnly = false) => {
    setIsOpen(false)
    setIsExporting(true)

    const targetCat = categoryKey || activeCategory

    // 1. Export selected rows if requested
    if (exportSelectedOnly && selectedEmails.length > 0) {
      try {
        const selectedList = emails.filter((e) => selectedEmails.includes(e.email))
        const headers = 'Email Address,Domain,Category,Subcategory\n'
        const csvContent =
          headers +
          selectedList
            .map((e) => `"${e.email}","${e.domain || ''}","${e.category || 'GENERAL'}","${e.subcategory || ''}"`)
            .join('\n')

        const filename = `leads-selected-${selectedEmails.length}-${Date.now()}.csv`
        downloadCSV(filename, csvContent)
        toast.success(`Exported ${selectedList.length} selected leads to CSV!`)
      } catch (err: any) {
        toast.error(err.message || 'Failed to export selected leads.')
      } finally {
        setIsExporting(false)
      }
      return
    }

    // 2. Export category via Backend endpoint
    const catLabel = targetCat === 'ALL' ? 'All Leads' : TARGET_CATEGORIES.find((c) => c.id === targetCat)?.name || targetCat
    const toastId = toast.loading(`Preparing ${catLabel} export...`)

    try {
      const { filename, blob } = await apiClient.exportEmails(targetCat)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', filename)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(`Successfully downloaded ${filename}!`, { id: toastId })
    } catch {
      // Fallback: client-side export from stored emails
      try {
        let filtered = emails
        if (targetCat !== 'ALL') {
          filtered = emails.filter((e) => {
            const catNorm = (e.category || 'GENERAL').toUpperCase()
            if (targetCat === 'GENERAL') {
              return catNorm === 'GENERAL' || catNorm === 'WEB' || catNorm === 'MARKETING'
            }
            return catNorm === targetCat
          })
        }

        if (filtered.length === 0) {
          toast.error(`No leads found in database for category: ${catLabel}`, { id: toastId })
          setIsExporting(false)
          return
        }

        const headers = 'Email Address,Domain,Category,Subcategory\n'
        const csvContent =
          headers +
          filtered
            .map((e) => `"${e.email}","${e.domain || ''}","${e.category || 'GENERAL'}","${e.subcategory || ''}"`)
            .join('\n')

        const fallbackName = `leads-${targetCat.toLowerCase().replace('_', '-')}-${Date.now()}.csv`
        downloadCSV(fallbackName, csvContent)
        toast.success(`Exported ${filtered.length} leads to ${fallbackName}!`, { id: toastId })
      } catch (fallbackErr: any) {
        toast.error(fallbackErr.message || 'Failed to export leads.', { id: toastId })
      }
    } finally {
      setIsExporting(false)
    }
  }

  const getButtonClasses = () => {
    switch (variant) {
      case 'secondary':
        return 'bg-slate-800 hover:bg-slate-700 text-gray-200 border border-white/10'
      case 'glass':
        return 'glass-panel hover:bg-white/10 text-white border border-white/10'
      case 'primary':
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20'
    }
  }

  const displayCategoryName =
    activeCategory === 'ALL'
      ? 'All'
      : TARGET_CATEGORIES.find((c) => c.id === activeCategory)?.name || activeCategory

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div className="flex items-center rounded-xl overflow-hidden shadow-sm">
        {/* Main Action Button */}
        <button
          onClick={() => (selectedEmails.length > 0 ? handleExport(activeCategory, true) : handleExport(activeCategory))}
          disabled={isExporting}
          className={`px-4 py-2.5 font-bold text-xs transition-all flex items-center gap-2 whitespace-nowrap ${getButtonClasses()} disabled:opacity-50`}
          title="Export CSV"
        >
          <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
          <span>
            {buttonText
              ? buttonText
              : selectedEmails.length > 0
              ? `Export ${selectedEmails.length} Selected`
              : `Export CSV (${displayCategoryName})`}
          </span>
        </button>

        {/* Dropdown Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isExporting}
          aria-expanded={isOpen}
          aria-label="Export category menu"
          className={`p-2.5 font-bold text-xs border-l border-white/20 transition-all ${getButtonClasses()} hover:brightness-110 disabled:opacity-50`}
        >
          <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-slate-900 border border-white/10 shadow-2xl z-50 overflow-hidden backdrop-blur-xl animate-in fade-in zoom-in-95 duration-150">
          <div className="p-3 border-b border-white/10 bg-slate-800/50 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              Export by Category
            </span>
            <span className="text-[11px] text-gray-400 font-mono">RFC 4180 CSV</span>
          </div>

          <div className="p-2 space-y-1">
            {/* If items are selected */}
            {selectedEmails.length > 0 && (
              <button
                onClick={() => handleExport(activeCategory, true)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-blue-600/20 text-blue-400 text-xs font-semibold flex items-center justify-between transition-colors border border-blue-500/20"
              >
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-blue-400" />
                  <span>Export Checked Selection</span>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-[10px] font-bold">
                  {selectedEmails.length} rows
                </span>
              </button>
            )}

            {/* Category Options */}
            {TARGET_CATEGORIES.map((cat) => {
              const count =
                cat.id === 'ALL'
                  ? totalEmails || emails.length
                  : cat.id === 'GENERAL'
                  ? (categoryCounts['GENERAL'] || 0) + (categoryCounts['WEB'] || 0) + (categoryCounts['MARKETING'] || 0)
                  : categoryCounts[cat.id] || 0

              const isCurrent = activeCategory === cat.id

              return (
                <button
                  key={cat.id}
                  onClick={() => handleExport(cat.id)}
                  className={`w-full text-left p-2.5 rounded-xl text-xs font-medium flex items-center justify-between transition-all group ${
                    isCurrent ? 'bg-white/10 text-white' : 'hover:bg-white/5 text-gray-300 hover:text-white'
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          cat.id === 'ALL'
                            ? 'bg-blue-400'
                            : cat.id === 'LOCAL_SERVICES'
                            ? 'bg-cyan-400'
                            : cat.id === 'HEALTH_CARE'
                            ? 'bg-emerald-400'
                            : cat.id === 'FOOD_HOSPITALITY'
                            ? 'bg-amber-400'
                            : cat.id === 'PROFESSIONAL_SERVICES'
                            ? 'bg-purple-400'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className="font-semibold truncate">{cat.name}</span>
                      {isCurrent && <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />}
                    </div>
                    <span className="text-[10px] text-gray-500 truncate pl-4 group-hover:text-gray-400 transition-colors">
                      {cat.description}
                    </span>
                  </div>

                  {count !== undefined && count > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-gray-400 font-mono font-bold border border-white/5 shrink-0">
                      {count}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
