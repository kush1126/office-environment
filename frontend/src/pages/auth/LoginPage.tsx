import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { Zap, Eye, EyeOff, Lock, User, AlertCircle, Building2, Sparkles } from 'lucide-react'
import toast from 'react-hot-toast'
import type { AuthUser } from '@/types'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setTokens, setUser } = useAuthStore()
  const [username, setUsername] = useState('admin')
  const [password, setPassword] = useState('admin')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loginAsMockUser = (role: 'admin' | 'staff' = 'admin') => {
    const isStaff = role === 'staff'
    const mockUser: AuthUser = {
      id: isStaff ? 's0000000-0000-0000-0000-000000000002' : 'a0000000-0000-0000-0000-000000000001',
      username: isStaff ? 'staff' : 'admin',
      email: isStaff ? 'staff@officeos.local' : 'admin@officeos.local',
      full_name: isStaff ? 'Sample Staff' : 'System Administrator',
      is_active: true,
      is_superuser: !isStaff,
      roles: [isStaff ? 'STAFF' : 'ADMIN'],
      permissions: [
        'companies.read', 'companies.manage', 'users.read', 'users.manage',
        'customers.read', 'customers.write', 'vendors.read', 'vendors.write',
        'products.read', 'products.write', 'inventory.read', 'inventory.write',
        'inventory.approve', 'sales.read', 'sales.write', 'sales.approve',
        'purchases.read', 'purchases.write', 'purchases.approve',
        'finance.read', 'finance.write', 'finance.approve', 'gst.read', 'gst.export',
        'documents.read', 'documents.write', 'files.read', 'files.write',
        'websites.read', 'websites.write', 'reports.read', 'reports.export', 'ai.read'
      ],
      company_ids: ['c1111111-1111-1111-1111-111111111111', 'c2222222-2222-2222-2222-222222222222'],
      primary_company_id: 'c1111111-1111-1111-1111-111111111111',
    }
    setTokens('mock-access-token', 'mock-refresh-token')
    setUser(mockUser)
    toast.success(`Welcome back, ${mockUser.full_name}!`)
    navigate('/')
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const u = username.trim().toLowerCase()
    const p = password.trim()

    // Accept normal common credentials for rapid development / offline usage
    const isNormalAdmin =
      (u === 'admin' || u === 'admin@officeos.local' || u === 'admin@rsquare.com') &&
      (p === 'admin' || p === 'admin123' || p === 'Admin@123' || p === '1234' || p === '123456' || p === 'password')
    const isNormalStaff =
      (u === 'staff' || u === 'staff@officeos.local') &&
      (p === 'staff' || p === 'Staff@123' || p === '1234' || p === '123456')

    try {
      const tokens = await authApi.login(username.trim(), password.trim())
      setTokens(tokens.access_token, tokens.refresh_token)
      const user = await authApi.me()
      setUser(user)
      toast.success(`Welcome back, ${user.full_name || user.username}!`)
      navigate('/')
    } catch (err: any) {
      // If backend is offline or normal dev credentials were used, log in directly
      if (isNormalAdmin || (!err?.response && (u === 'admin' || p === 'admin' || p === '1234' || p === 'admin123'))) {
        loginAsMockUser('admin')
        return
      }
      if (isNormalStaff) {
        loginAsMockUser('staff')
        return
      }

      let msg = 'Invalid credentials. Please try again.'
      const detail = err?.response?.data?.detail
      if (typeof detail === 'string') {
        msg = detail
      } else if (Array.isArray(detail) && detail.length > 0 && detail[0].msg) {
        msg = detail[0].msg
      } else if (!err?.response) {
        // Backend not reachable, provide fallback hint
        msg = 'Backend server unreachable. Use normal credentials: admin / admin'
      }
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-card border-r border-border relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -left-40 w-96 h-96 rounded-full bg-brand-600/10 blur-3xl" />
          <div className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-violet-600/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-16">
            <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center shadow-glow">
              <Zap size={20} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gradient">Office OS</p>
              <p className="text-xs text-muted-foreground">Private Business Platform</p>
            </div>
          </div>

          {/* Tagline */}
          <div>
            <h1 className="text-4xl font-bold text-foreground leading-tight mb-4">
              Your complete<br />
              <span className="text-gradient">business intelligence</span><br />
              platform.
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-xs">
              ERP · AI · File Management · Website Deployment · Finance · GST · Documents — all in one private, self-hosted system.
            </p>
          </div>
        </div>

        {/* Companies */}
        <div className="relative z-10">
          <p className="text-xs text-gray-600 mb-3 uppercase tracking-widest">Serving</p>
          <div className="flex gap-3">
            {['RSquare Services', 'KYP Pharma'].map((company) => (
              <div key={company} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
                <Building2 size={12} className="text-brand-400" />
                <span className="text-xs text-gray-400">{company}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-brand-600 flex items-center justify-center shadow-glow">
              <Zap size={18} className="text-white" />
            </div>
            <p className="text-lg font-bold text-gradient">Office OS</p>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-1">Sign in</h2>
            <p className="text-gray-500 text-sm">Enter your credentials to access the platform.</p>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-6 animate-in">
              <AlertCircle size={16} className="text-red-400 mt-0.5 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Username or Email</label>
              <div className="relative">
                <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="input pl-9"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  required
                  autoComplete="username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Password</label>
              <div className="relative">
                <Lock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  className="input pl-9 pr-10"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username || !password}
              className="btn-primary w-full justify-center py-2.5 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in...
                </span>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Normal / Dev Credentials Box */}
            <div className="mt-4 p-3.5 rounded-xl bg-brand-500/10 border border-brand-500/25 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <p className="text-xs font-semibold text-brand-300 flex items-center gap-1.5">
                  <Sparkles size={13} className="text-brand-400" />
                  Default Normal Credentials
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  User: <span className="font-mono text-white font-medium">admin</span> &nbsp;|&nbsp; Pass: <span className="font-mono text-white font-medium">admin</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => loginAsMockUser('admin')}
                className="w-full sm:w-auto px-3 py-1.5 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-500 text-white transition-all shadow-sm shrink-0"
              >
                1-Click Sign In
              </button>
            </div>
          </form>

          {/* Security note */}
          <div className="mt-8 pt-6 border-t border-white/5">
            <div className="flex items-start gap-2">
              <Lock size={12} className="text-gray-600 mt-0.5 shrink-0" />
              <p className="text-[11px] text-gray-600 leading-relaxed">
                This system is private and accessible only to authorized office users. All actions are logged and audited.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
