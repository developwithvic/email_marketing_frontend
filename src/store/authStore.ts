import { create } from 'zustand'
import { User, Profile } from '@/types'
import { apiClient } from '@/lib/api'

interface AuthState {
  user: User | null
  profile: Profile | null
  token: string | null
  isLoading: boolean
  error: string | null

  login: (email: string, pass: string) => Promise<void>
  signup: (name: string, email: string, pass: string) => Promise<void>
  logout: () => void
  fetchProfile: () => Promise<void>
  updateProfile: (profileData: Partial<Profile>) => Promise<void>
  clearError: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user_data') || 'null') : null,
  profile: null,
  token: typeof window !== 'undefined' ? localStorage.getItem('access_token') : null,
  isLoading: false,
  error: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await apiClient.login(email, password)
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
      }
      set({
        user: data.user,
        token: data.access_token,
        isLoading: false,
      })
    } catch (err: any) {
      const msg = err.message || err.response?.data?.detail || 'Login failed. Please check your credentials.'
      set({
        error: msg,
        isLoading: false,
      })
      throw new Error(msg)
    }
  },

  signup: async (name, email, password) => {
    set({ isLoading: true, error: null })
    try {
      const data = await apiClient.signup(name, email, password)
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', data.access_token)
        localStorage.setItem('user_data', JSON.stringify(data.user))
      }
      set({
        user: data.user,
        token: data.access_token,
        isLoading: false,
      })
    } catch (err: any) {
      const msg = err.message || err.response?.data?.detail || 'Signup failed. Please try again.'
      set({
        error: msg,
        isLoading: false,
      })
      throw new Error(msg)
    }
  },

  logout: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token')
      localStorage.removeItem('user_data')
    }
    set({ user: null, profile: null, token: null })
  },

  fetchProfile: async () => {
    try {
      const profile = await apiClient.getProfile()
      set({ profile })
    } catch (err) {
      // Handled silently
    }
  },

  updateProfile: async (profileData) => {
    set({ isLoading: true, error: null })
    try {
      const updated = await apiClient.updateProfile(profileData)
      set({ profile: updated, isLoading: false })
    } catch (err: any) {
      set({
        error: err.response?.data?.detail || 'Failed to update profile.',
        isLoading: false,
      })
      throw err
    }
  },

  clearError: () => set({ error: null }),
}))
