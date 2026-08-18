import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '@/api/auth'
import { PanelLeftClose, PanelLeftOpen, Bell, LogOut, ChevronDown, Building2, Check } from 'lucide-react'
import toast from 'react-hot-toast'

interface HeaderProps {
  sidebarCollapsed: boolean
  onToggleSidebar: () => void
  companies: Array<{ id: string; name: string }>
}

export function Header({ sidebarCollapsed, onToggleSidebar, companies }: HeaderProps) {
  const { user, activeCompanyId, setActiveCompany, logout, refreshToken } = useAuthStore()
  const navigate = useNavigate()
  const [companyOpen, setCompanyOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  const activeCompany = companies.find((c) => c.id === activeCompanyId)

  const handleLogout = async () => {
    try {
      if (refreshToken) await authApi.logout(refreshToken)
    } catch {}
    logout()
    navigate('/login')
    toast.success('Logged out successfully')
  }

  return (
    <header className="h-16 bg-card border-b border-border flex items-center px-4 gap-4 shrink-0 z-10">
      {/* Sidebar toggle */}
      <button
        onClick={onToggleSidebar}
        className="btn-ghost p-2 rounded-lg"
        aria-label="Toggle sidebar"
      >
        {sidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
      </button>

      {/* Page breadcrumb placeholder */}
      <div className="flex-1" />

      {/* Company Selector */}
      {companies.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setCompanyOpen(!companyOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-muted border border-border hover:border-primary/40 transition-colors text-sm"
          >
            <Building2 size={14} className="text-primary" />
            <span className="text-foreground font-medium max-w-32 truncate">
              {activeCompany?.name || 'Select Company'}
            </span>
            <ChevronDown size={12} className="text-muted-foreground" />
          </button>

          {companyOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 card shadow-glass animate-in z-50">
              <div className="p-1">
                <p className="px-2 py-1 text-[10px] font-semibold tracking-widest text-gray-600 uppercase">Companies</p>
                {companies.map((company) => (
                  <button
                    key={company.id}
                    onClick={() => {
                      setActiveCompany(company.id)
                      setCompanyOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-muted text-left transition-colors"
                  >
                    <div className="w-6 h-6 rounded bg-primary/20 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                      {company.name[0]}
                    </div>
                    <span className="flex-1 text-sm text-foreground">{company.name}</span>
                    {company.id === activeCompanyId && (
                      <Check size={12} className="text-primary" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notification bell */}
      <button className="btn-ghost p-2 rounded-lg relative">
        <Bell size={18} />
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* User menu */}
      <div className="relative">
        <button
          onClick={() => setUserOpen(!userOpen)}
          className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary">
            {user?.username?.[0]?.toUpperCase() ?? '?'}
          </div>
          <span className="text-sm text-foreground hidden sm:block">{user?.full_name || user?.username}</span>
          <ChevronDown size={12} className="text-muted-foreground" />
        </button>

        {userOpen && (
          <div className="absolute right-0 top-full mt-2 w-48 card shadow-glass animate-in z-50">
            <div className="p-1">
              <div className="px-3 py-2 border-b border-border mb-1">
                <p className="text-xs font-medium text-foreground">{user?.full_name || user?.username}</p>
                <p className="text-[10px] text-muted-foreground">{user?.email}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {user?.roles?.slice(0, 2).map((r) => (
                    <span key={r} className="badge bg-primary/20 text-primary">{r}</span>
                  ))}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-600/10 text-red-400 text-sm transition-colors"
              >
                <LogOut size={14} />
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Close dropdowns on outside click */}
      {(companyOpen || userOpen) && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => { setCompanyOpen(false); setUserOpen(false) }}
        />
      )}
    </header>
  )
}
