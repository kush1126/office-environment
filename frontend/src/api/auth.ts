import apiClient from './client'
import type { AuthUser, TokenResponse } from '@/types'

export const authApi = {
  login: async (username: string, password: string): Promise<TokenResponse> => {
    const params = new URLSearchParams()
    params.append('username', username)
    params.append('password', password)
    const { data } = await apiClient.post<TokenResponse>('/auth/login', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return data
  },

  logout: async (refreshToken: string): Promise<void> => {
    await apiClient.post('/auth/logout', { refresh_token: refreshToken })
  },

  me: async (): Promise<AuthUser> => {
    const { data } = await apiClient.get<AuthUser>('/auth/me')
    return data
  },

  changePassword: async (currentPassword: string, newPassword: string): Promise<void> => {
    await apiClient.post('/auth/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  },
}
