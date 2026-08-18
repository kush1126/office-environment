import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { PaginatedResponse, Company, CompanyCreate } from '@/types'
import { Building2, Plus, Search, Edit2, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import { clsx } from 'clsx'

export default function CompaniesPage() {
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState<Partial<CompanyCreate>>({ name: '' })

  const { data, isLoading } = useQuery({
    queryKey: ['companies', search],
    queryFn: async () => {
      const params = new URLSearchParams({ page_size: '50' })
      if (search) params.set('search', search)
      const { data } = await apiClient.get<PaginatedResponse<Company>>(`/companies?${params}`)
      return data
    },
  })

  const createMutation = useMutation({
    mutationFn: (body: CompanyCreate) => apiClient.post('/companies', body),
    onSuccess: () => {
      toast.success('Company created successfully.')
      qc.invalidateQueries({ queryKey: ['companies'] })
      setShowCreate(false)
      setForm({ name: '' })
    },
  })

  return (
    <div className="space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">Companies</h1>
          <p className="text-sm text-gray-500 mt-1">Manage your business entities and their settings.</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary">
          <Plus size={15} />
          Add Company
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          className="input pl-9"
          placeholder="Search companies..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="card p-6 border-brand-500/30 animate-in">
          <h3 className="text-sm font-semibold text-foreground mb-4">New Company</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Company Name *</label>
              <input className="input" value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Legal Name</label>
              <input className="input" value={form.legal_name || ''} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">GSTIN</label>
              <input className="input" value={form.gstin || ''} onChange={(e) => setForm({ ...form, gstin: e.target.value })} placeholder="15-character GSTIN" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">City</label>
              <input className="input" value={form.city || ''} onChange={(e) => setForm({ ...form, city: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">State</label>
              <input className="input" value={form.state || ''} onChange={(e) => setForm({ ...form, state: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Phone</label>
              <input className="input" value={form.phone || ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button
              onClick={() => createMutation.mutate(form as CompanyCreate)}
              disabled={!form.name || createMutation.isPending}
              className="btn-primary"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Company'}
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary">Cancel</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-container">
        <table className="w-full">
          <thead className="table-header">
            <tr>
              {['Company', 'GSTIN', 'Location', 'Currency', 'Status', 'Created'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading && Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="table-row">
                {Array.from({ length: 6 }).map((_, j) => (
                  <td key={j} className="px-4 py-3">
                    <div className="h-4 bg-white/5 rounded animate-pulse" />
                  </td>
                ))}
              </tr>
            ))}
            {data?.items.map((company) => (
              <tr key={company.id} className="table-row">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-brand-600/20 border border-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400">
                      {company.name[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{company.name}</p>
                      {company.legal_name && company.legal_name !== company.name && (
                        <p className="text-xs text-gray-600">{company.legal_name}</p>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-400 font-mono">{company.gstin || '—'}</span>
                </td>
                <td className="px-4 py-3">
                  <span className="text-sm text-gray-400">
                    {[company.city, company.state].filter(Boolean).join(', ') || '—'}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="badge bg-brand-600/20 text-brand-400">{company.currency}</span>
                </td>
                <td className="px-4 py-3">
                  {company.is_active ? (
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
                  {format(new Date(company.created_at), 'dd MMM yyyy')}
                </td>
              </tr>
            ))}
            {data?.items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-sm text-gray-600">
                  No companies found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {data && (
        <p className="text-xs text-gray-600">{data.total} {data.total === 1 ? 'company' : 'companies'}</p>
      )}
    </div>
  )
}
