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
      const { data } = await apiClient.get<PaginatedResponse<Company>>('/companies?page_size=50')
      return data.items
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
