import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { PaginatedResponse, User } from '@/types'
import { Users, Search, Shield, CheckCircle, XCircle } from 'lucide-react'
import { format } from 'date-fns'
import { clsx } from 'clsx'

const ROLE_COLORS: Record<string, string> = {
  ADMIN:      'bg-red-600/20 text-red-300',
  MANAGER:    'bg-purple-600/20 text-purple-300',
  ACCOUNTANT: 'bg-blue-600/20 text-blue-300',
  INVENTORY:  'bg-green-600/20 text-green-300',
  STAFF:      'bg-gray-600/20 text-gray-300',
  AI_ADMIN:   'bg-violet-600/20 text-violet-300',
  WEB_ADMIN:  'bg-cyan-600/20 text-cyan-300',
  VIEWER:     'bg-slate-600/20 text-slate-300',
}

export default function UsersPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery({
    queryKey: ['users', search],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: '50' })
      if (search) params.set('search', search)
      const { data } = await apiClient.get<PaginatedResponse<User>>(`/users?${params}`)
      return data
    },
  })

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Users</h1>
          <p className="text-sm text-gray-500 mt-1">Manage system users, roles, and company access.</p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input pl-9"
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['User', 'Roles', 'Companies', 'Status', 'Last Login', 'Joined'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 5 }).map((_, i) => (
              <tr key={i} className="table-row">
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-white/5 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {data?.items.map((user) => (
              <tr key={user.id} className="table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-brand-600/20 border border-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-400">
                      {user.username[0].toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{user.full_name || user.username}</p>
                      <p className="text-xs text-gray-600">{user.email}</p>
                    </div>
                    {user.is_superuser && (
                      <span title="Superuser">
                        <Shield size={12} className="text-amber-400" />
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map((role) => (
                      <span key={typeof role === 'string' ? role : role.name}
                        className={clsx('badge text-[10px]',
                          ROLE_COLORS[typeof role === 'string' ? role : role.name] || 'bg-gray-600/20 text-gray-400'
                        )}>
                        {typeof role === 'string' ? role : role.name}
                      </span>
                    ))}
                    {user.roles.length === 0 && <span className="text-xs text-gray-600">No roles</span>}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-500">{user.company_ids?.length || 0} companies</span>
                </td>
                <td className="px-4 py-3">
                  {user.is_active ? (
                    <span className="flex items-center gap-1.5 text-xs text-green-400">
                      <CheckCircle size={12} /> Active
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs text-red-400">
                      <XCircle size={12} /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {user.last_login && !isNaN(new Date(user.last_login).getTime()) ? format(new Date(user.last_login), 'dd MMM HH:mm') : 'Never'}
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  {user.created_at && !isNaN(new Date(user.created_at).getTime()) ? format(new Date(user.created_at), 'dd MMM yyyy') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data && (
        <p className="text-xs text-gray-600">{data.total} {data.total === 1 ? 'user' : 'users'}</p>
      )}
    </div>
  )
}
