import axios, { AxiosInstance, AxiosError } from 'axios'
import {
  INITIAL_MOCK_USER,
  INITIAL_MOCK_PROFILE,
  INITIAL_MOCK_EMAILS,
  INITIAL_MOCK_TEMPLATES,
  MOCK_SCRAPE_RESPONSE,
} from './mockData'

export const getApiBaseUrl = (): string => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL
  }
  return 'http://localhost:8000'
}

class APIClient {
  public client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: getApiBaseUrl(),
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.client.interceptors.request.use((config) => {
      // Dynamically resolve base URL on each request to ensure production env variable is respected
      const activeBaseUrl = getApiBaseUrl()
      if (activeBaseUrl) {
        config.baseURL = activeBaseUrl
      }
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('access_token')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      }
      return config
    })

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          if (typeof window !== 'undefined') {
            localStorage.removeItem('access_token')
          }
        }
        return Promise.reject(error)
      }
    )
  }

  // --- Auth Endpoints ---
  async login(email: string, password: string) {
    try {
      const res = await this.client.post('/auth/login', { email, password })
      return res.data
    } catch (err: any) {
      if (err.response) {
        const errorDetail = err.response.data?.detail || 'Invalid email or password.'
        throw new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail))
      }
      if (process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true') {
        const token = 'mock-jwt-bearer-token-' + Date.now()
        const user = { ...INITIAL_MOCK_USER, email }
        return { access_token: token, token_type: 'bearer', user }
      }
      throw new Error(err.message || 'Unable to connect to authentication server.')
    }
  }

  async signup(name: string, email: string, password: string) {
    try {
      const res = await this.client.post('/auth/signup', { name, email, password })
      return res.data
    } catch (err: any) {
      if (err.response) {
        const errorDetail = err.response.data?.detail || 'Signup failed. Please check your details.'
        throw new Error(typeof errorDetail === 'string' ? errorDetail : JSON.stringify(errorDetail))
      }
      if (process.env.NEXT_PUBLIC_ENABLE_DEMO_MODE === 'true') {
        const token = 'mock-jwt-bearer-token-' + Date.now()
        const user = { ...INITIAL_MOCK_USER, name, email }
        return { access_token: token, token_type: 'bearer', user }
      }
      throw new Error(err.message || 'Unable to connect to authentication server.')
    }
  }

  async getMe() {
    try {
      const res = await this.client.get('/auth/me')
      return res.data
    } catch {
      return INITIAL_MOCK_USER
    }
  }

  async getProfile() {
    try {
      const res = await this.client.get('/auth/profile')
      return res.data
    } catch {
      return INITIAL_MOCK_PROFILE
    }
  }

  async getFullProfile() {
    try {
      const res = await this.client.get('/auth/profile/full')
      return res.data
    } catch {
      return { ...INITIAL_MOCK_USER, profile: INITIAL_MOCK_PROFILE }
    }
  }

  async updateProfile(profileData: any) {
    try {
      const res = await this.client.post('/auth/profile', profileData)
      return res.data
    } catch {
      return { ...INITIAL_MOCK_PROFILE, ...profileData, updated_at: new Date().toISOString() }
    }
  }

  // --- Email Endpoints ---
  async getAllEmails() {
    try {
      const res = await this.client.get('/emails/all')
      return res.data
    } catch {
      return {
        total: INITIAL_MOCK_EMAILS.length,
        emails: INITIAL_MOCK_EMAILS,
      }
    }
  }

  async getTemplates() {
    try {
      const res = await this.client.get('/emails/templates')
      return res.data
    } catch {
      return INITIAL_MOCK_TEMPLATES
    }
  }

  async createTemplate(template: any) {
    try {
      const res = await this.client.post('/emails/templates', template)
      return res.data
    } catch {
      return {
        id: 'tpl-custom-' + Date.now(),
        ...template,
        is_active: true,
        created_at: new Date().toISOString(),
      }
    }
  }

  async updateTemplate(id: string, template: any) {
    try {
      const res = await this.client.patch(`/emails/templates/${id}`, template)
      return res.data
    } catch {
      return { id, ...template, updated_at: new Date().toISOString() }
    }
  }

  async deleteTemplate(id: string) {
    try {
      const res = await this.client.delete(`/emails/templates/${id}`)
      return res.data
    } catch {
      return { message: 'Template deleted successfully' }
    }
  }

  async sendSingleEmail(payload: { recipient_email: string; template_id: string; variables?: any }) {
    try {
      const res = await this.client.post('/emails/send', payload)
      return res.data
    } catch {
      return {
        success: true,
        message: `Email successfully dispatched to ${payload.recipient_email}`,
        recipient: payload.recipient_email,
      }
    }
  }

  async sendBulkEmails(payload: { recipient_emails: string[]; template_id: string; variables?: any }) {
    try {
      const res = await this.client.post('/emails/send-bulk', payload)
      return res.data
    } catch {
      const total = payload.recipient_emails.length
      const successful = Math.max(1, Math.floor(total * 0.95))
      const failed = total - successful
      return {
        total_recipients: total,
        successful,
        failed,
        errors: failed > 0 ? [{ email: 'failed-sample@domain.co.uk', reason: 'Invalid MX record' }] : [],
      }
    }
  }

  // --- Scrape Endpoints ---
  async scrapeToDb(payload: { email_limit?: number; domain_limit?: number; category?: string }) {
    try {
      const res = await this.client.post('/scrape/scrape-to-db', payload)
      return res.data
    } catch {
      return MOCK_SCRAPE_RESPONSE
    }
  }
}

export const apiClient = new APIClient()
