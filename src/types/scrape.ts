export interface ScrapeToDbPayload {
  email_limit?: number
  domain_limit?: number
  category?: string
}

export interface DomainScrapeResult {
  domain: string
  emails: string[]
  status: 'success' | 'error' | 'skipped' | 'no_emails_found'
  error_message?: string
}

export interface ScrapeToDbResponse {
  total_processed: number
  successful_leads: number
  total_emails_found: number
  total_emails_saved: number
  duplicates_skipped: number
  errors: number
  results: DomainScrapeResult[]
}

export interface ScrapeTaskProgress {
  domains_scraped: number
  total_domains: number
  emails_found: number
  emails_saved: number
  duplicates_skipped: number
  errors: number
}

export interface ScrapeTaskResponse {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'
  request_type: string
  message: string
  progress: ScrapeTaskProgress
  created_at: string
  started_at: string | null
  completed_at: string | null
  error: string | null
  results: DomainScrapeResult[]
}

export interface ScrapeTaskListResponse {
  total: number
  tasks: ScrapeTaskResponse[]
}
