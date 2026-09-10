export type TemplateType =
  | 'NEWSLETTER'
  | 'PROMOTIONAL'
  | 'ANNOUNCEMENT'
  | 'PRODUCT'
  | 'EVENT'
  | 'WEBINAR'
  | 'ONBOARDING'
  | 'FEEDBACK'
  | 'RETENTION'
  | 'SALES'

export type TargetCategoryKey =
  | 'ALL'
  | 'LOCAL_SERVICES'
  | 'HEALTH_CARE'
  | 'FOOD_HOSPITALITY'
  | 'PROFESSIONAL_SERVICES'
  | 'GENERAL'

export interface CategoryMeta {
  id: TargetCategoryKey
  name: string
  description: string
  color: string
  badgeBg: string
  badgeText: string
  badgeBorder: string
}

export const TARGET_CATEGORIES: CategoryMeta[] = [
  {
    id: 'ALL',
    name: 'All Leads',
    description: 'All scraped business contacts',
    color: 'blue',
    badgeBg: 'bg-blue-600/10',
    badgeText: 'text-blue-400',
    badgeBorder: 'border-blue-500/20',
  },
  {
    id: 'LOCAL_SERVICES',
    name: 'Local Service Businesses',
    description: 'Barbers, Hair salons, Cleaners, Electricians, Plumbers, Builders...',
    color: 'cyan',
    badgeBg: 'bg-cyan-500/10',
    badgeText: 'text-cyan-400',
    badgeBorder: 'border-cyan-500/20',
  },
  {
    id: 'HEALTH_CARE',
    name: 'Health and Care Related',
    description: 'Care agencies, Supported living, Day nurseries, Therapists...',
    color: 'emerald',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/20',
  },
  {
    id: 'FOOD_HOSPITALITY',
    name: 'Food and Hospitality',
    description: 'Takeaways, African food vendors, Caterers, Bakers, Cafés...',
    color: 'amber',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/20',
  },
  {
    id: 'PROFESSIONAL_SERVICES',
    name: 'Professional Services',
    description: 'Travel agents, Property sourcing, Legal, Accountants...',
    color: 'purple',
    badgeBg: 'bg-purple-500/10',
    badgeText: 'text-purple-400',
    badgeBorder: 'border-purple-500/20',
  },
  {
    id: 'GENERAL',
    name: 'General Business',
    description: 'Uncategorized and general UK enterprise websites',
    color: 'slate',
    badgeBg: 'bg-slate-700/30',
    badgeText: 'text-gray-300',
    badgeBorder: 'border-slate-600/30',
  },
]

export interface EmailRecord {
  id?: string
  email: string
  domain?: string
  category?: string
  subcategory?: string
  country?: string
  location?: string
  is_verified?: boolean
  created_at?: string
}

export interface EmailTemplate {
  id: string
  name: string
  template_type: TemplateType
  subject: string
  body: string
  description?: string
  is_active: boolean
  created_at?: string
  updated_at?: string
}

export interface SendSingleEmailPayload {
  recipient_email: string
  template_id: string
  variables?: Record<string, string>
}

export interface SendBulkEmailPayload {
  recipient_emails: string[]
  template_id: string
  variables?: Record<string, string>
}

export interface BulkSendResult {
  total_recipients: number
  successful: number
  failed: number
  errors: Array<{ email: string; reason: string }>
}
