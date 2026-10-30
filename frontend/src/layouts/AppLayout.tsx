import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from '@/components/shared/Sidebar'
import { Header } from '@/components/shared/Header'
import { useAuthStore } from '@/store/authStore'
import { useQuery } from '@tanstack/react-query'
import apiClient from '@/api/client'
import type { PaginatedResponse, Company } from '@/types'

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const { user } = useAuthStore()

  // Fetch companies accessible to current user
  const { data: companiesData } = useQuery({
    queryKey: ['companies', user?.company_ids],
    queryFn: async () => {
      try {
        const { data } = await apiClient.get<PaginatedResponse<Company>>('/companies?page_size=50')
        return data.items
      } catch {
        return [
          {
            id: 'c1111111-1111-1111-1111-111111111111',
            name: 'RSquare Services',
            legal_name: 'RSquare Services',
            currency: 'INR',
            financial_year_start: 4,
            is_active: true,
          } as Company,
          {
            id: 'c2222222-2222-2222-2222-222222222222',
            name: 'KYP Pharma',
            legal_name: 'KYP Pharma',
            currency: 'INR',
            financial_year_start: 4,
            is_active: true,
          } as Company,
        ]
      }
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  })

  const companies = companiesData || []

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar collapsed={sidebarCollapsed} />

      <div className="flex flex-col flex-1 min-w-0">
        <Header
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((c) => !c)}
          companies={companies.map((c) => ({ id: c.id, name: c.name }))}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
