'use client'

import { useState } from 'react'
import Link from 'next/link'
import { StatCard } from '@/components/common/StatCard'
import {
  Mail,
  Database,
  FileCode,
  Send,
  Zap,
  ArrowRight,
  CheckCircle2,
  Globe,
} from 'lucide-react'
import { useEmailStore } from '@/store/emailStore'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

export default function DashboardPage() {
  const { totalEmails, templates, emails, runScrape, isScraping } = useEmailStore()
  const { user } = useAuthStore()

  const [domainLimit, setDomainLimit] = useState(25)
  const [emailLimit, setEmailLimit] = useState(250)
  const [category, setCategory] = useState('WEB')

  const handleQuickScrape = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      toast.loading('Scraping UK domains & saving leads...', { id: 'scrape-toast' })
      const res = await runScrape(emailLimit, domainLimit, category)
      toast.success(
        `Scrape completed! Found ${res.progress.emails_found} emails across ${res.progress.domains_scraped} UK domains.`,
        { id: 'scrape-toast' }
      )
    } catch (err: any) {
      toast.error(err.message || 'Scrape failed', { id: 'scrape-toast' })
    }
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Welcome Banner */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-blue-500/20 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 bg-slate-900">
        <div className="space-y-2 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 border border-blue-500/30 text-blue-400 text-xs font-bold whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" /> LeadFlow UK Intelligence Console
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Welcome back, {user?.name || 'Alex'} 👋
          </h2>
          <p className="text-sm text-gray-300">
            Your UK domain lead acquisition engine is online and ready for scraping.
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0 relative z-10">
          <Link
            href="/scrape"
            className="px-5 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Zap className="w-4 h-4 fill-current" />
            Open Scraper Console
          </Link>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          title="Total Scraped Leads"
          value={totalEmails || 148}
          change="+24% this week"
          isPositive={true}
          description="Verified UK business emails"
          icon={Mail}
        />
        <StatCard
          title="Active Templates"
          value={templates.length || 4}
          change="100% active"
          isPositive={true}
          description="HTML & plain-text layouts"
          icon={FileCode}
        />
        <StatCard
          title="UK Domains Scraped"
          value="1,250+"
          change="+18 today"
          isPositive={true}
          description="Indexed via UK Business Web Search"
          icon={Globe}
        />
        <StatCard
          title="Deliverability Rate"
          value="98.2%"
          change="+1.5%"
          isPositive={true}
          description="Optimized batch dispatch"
          icon={Send}
        />
      </div>

      {/* Main Grid: Quick Scrape Launcher + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Scrape Widget (2 Cols) */}
        <div className="lg:col-span-2 glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" />
                Quick UK Domain Scraper Launcher
              </h3>
              <p className="text-xs text-gray-400">Discover and auto-save UK business leads directly to database</p>
            </div>
            <span className="px-2.5 py-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full flex items-center gap-1.5 whitespace-nowrap">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Engine Online
            </span>
          </div>

          <form onSubmit={handleQuickScrape} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Domain Limit (Max 10k)
              </label>
              <input
                type="number"
                min={1}
                max={10000}
                value={domainLimit}
                onChange={(e) => setDomainLimit(Number(e.target.value))}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Email Stop Limit
              </label>
              <input
                type="number"
                min={10}
                max={50000}
                value={emailLimit}
                onChange={(e) => setEmailLimit(Number(e.target.value))}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-2">
                Industry Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full glass-input px-4 py-2.5 rounded-xl text-sm font-semibold bg-slate-900 text-white"
              >
                <option value="WEB">WEB (General B2B)</option>
                <option value="TECH">TECH (Software & IT)</option>
                <option value="FINANCE">FINANCE (Fintech & Legal)</option>
                <option value="RETAIL">RETAIL (E-commerce)</option>
              </select>
            </div>

            <div className="sm:col-span-3 pt-2">
              <button
                type="submit"
                disabled={isScraping}
                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 whitespace-nowrap"
              >
                <Zap className={`w-4 h-4 fill-current ${isScraping ? 'animate-bounce' : ''}`} />
                {isScraping ? 'Scraping UK Domains in Parallel...' : 'Start UK Scrape Operation'}
              </button>
            </div>
          </form>

          {/* Lead Database Preview bar */}
          <div className="pt-4 border-t border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold text-sm">
                {emails.length || 18}
              </div>
              <div>
                <p className="text-xs font-bold text-white">Latest Lead Saved</p>
                <p className="text-[11px] text-gray-400 truncate max-w-[220px]">
                  {emails[0] || 'contact@apex-solutions.co.uk'}
                </p>
              </div>
            </div>

            <Link
              href="/emails"
              className="text-xs font-bold text-blue-400 hover:underline flex items-center gap-1 whitespace-nowrap"
            >
              View Full Database <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Templates Quick Launch (1 Col) */}
        <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 space-y-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <FileCode className="w-5 h-5 text-blue-400" />
              Template Library
            </h3>
            <Link href="/templates" className="text-xs text-blue-400 hover:underline font-semibold whitespace-nowrap">
              Manage
            </Link>
          </div>

          <div className="space-y-3">
            {templates.slice(0, 3).map((tpl) => (
              <div
                key={tpl.id}
                className="p-3.5 rounded-2xl glass-card border border-white/5 hover:border-blue-500/30 transition-all flex items-center justify-between group"
              >
                <div>
                  <p className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">
                    {tpl.name}
                  </p>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-600/20 text-blue-400 rounded-md border border-blue-500/30 uppercase mt-1 inline-block">
                    {tpl.template_type}
                  </span>
                </div>
                <Link
                  href={`/campaigns?templateId=${tpl.id}`}
                  className="p-2 rounded-xl bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 transition-colors whitespace-nowrap"
                  title="Use in Campaign"
                >
                  <Send className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>

          <Link
            href="/campaigns"
            className="w-full py-3 rounded-xl glass-panel hover:bg-white/10 border border-white/10 text-xs font-bold text-center block text-white transition-colors whitespace-nowrap"
          >
            Create New Campaign
          </Link>
        </div>
      </div>
    </div>
  )
}

