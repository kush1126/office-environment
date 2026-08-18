import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { AuthUser } from '@/types'

interface AuthState {
  accessToken: string | null
  refreshToken: string | null
  user: AuthUser | null
  activeCompanyId: string | null
  isAuthenticated: boolean
  isLoading: boolean

  // Actions
  setTokens: (accessToken: string, refreshToken: string) => void
  setUser: (user: AuthUser) => void
  setActiveCompany: (companyId: string) => void
  logout: () => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      activeCompanyId: null,
      isAuthenticated: false,
      isLoading: false,

      setTokens: (accessToken, refreshToken) =>
        set({ accessToken, refreshToken, isAuthenticated: true }),

      setUser: (user) => {
        const current = get()
        // Auto-select primary company if none selected
        let activeCompanyId = current.activeCompanyId
        if (!activeCompanyId && user.primary_company_id) {
          activeCompanyId = user.primary_company_id
        } else if (!activeCompanyId && user.company_ids.length > 0) {
          activeCompanyId = user.company_ids[0]
        }
        set({ user, activeCompanyId })
      },

      setActiveCompany: (companyId) => set({ activeCompanyId: companyId }),

      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          user: null,
          activeCompanyId: null,
          isAuthenticated: false,
        }),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'office-os-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        user: state.user,
        activeCompanyId: state.activeCompanyId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
