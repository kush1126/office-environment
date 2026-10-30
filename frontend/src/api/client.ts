import axios, { AxiosError } from 'axios'
import { useAuthStore } from '@/store/authStore'
import toast from 'react-hot-toast'

const API_URL = import.meta.env.VITE_API_URL || '/api'

export const apiClient = axios.create({
  baseURL: `${API_URL}/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
})

// ─── Request interceptor — inject auth token ──────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  const activeCompany = useAuthStore.getState().activeCompanyId
  if (activeCompany) {
    config.headers['X-Company-ID'] = activeCompany
  }
  return config
})

// ─── Response interceptor — handle 401, errors ───────────────────────────────
let isRefreshing = false
let failedQueue: Array<{ resolve: (value: any) => void; reject: (reason?: any) => void }> = []

const processQueue = (error: Error | null, token: string | null = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error)
    else prom.resolve(token)
  })
  failedQueue = []
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url?.includes('/auth/login')) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject })
        })
          .then((token) => {
            originalRequest.headers.Authorization = `Bearer ${token}`
            return apiClient(originalRequest)
          })
          .catch((err) => Promise.reject(err))
      }

      originalRequest._retry = true
      isRefreshing = true

      const refreshToken = useAuthStore.getState().refreshToken
      if (!refreshToken) {
        isRefreshing = false
        useAuthStore.getState().logout()
        return Promise.reject(error)
      }

      try {
        const { data } = await axios.post(`${API_URL}/v1/auth/refresh`, {
          refresh_token: refreshToken,
        })
        useAuthStore.getState().setTokens(data.access_token, refreshToken)
        processQueue(null, data.access_token)
        originalRequest.headers.Authorization = `Bearer ${data.access_token}`
        return apiClient(originalRequest)
      } catch (refreshError) {
        processQueue(refreshError as Error, null)
        useAuthStore.getState().logout()
        return Promise.reject(refreshError)
      } finally {
        isRefreshing = false
      }
    }

    // Show error toast only when backend returns a specific error message
    if (error.response && error.response.status !== 401 && error.response.status !== 502 && error.response.status !== 504) {
      let message = ''
      const data = error.response?.data as any
      if (data) {
        if (Array.isArray(data.detail) && data.detail.length > 0 && data.detail[0].msg) {
          const missingFields = data.detail.map((err: any) => {
            const field = err.loc && err.loc.length > 1 ? err.loc[err.loc.length - 1] : 'field';
            return `${field}: ${err.msg}`;
          });
          message = `Validation Error: ${missingFields.join(', ')}`;
        } else if (typeof data.detail === 'string') {
          message = data.detail
        } else if (typeof data.message === 'string') {
          message = data.message
        }
      }
      if (message) {
        toast.error(message, { duration: 4000 })
      }
    }

    return Promise.reject(error)
  }
)

export default apiClient
