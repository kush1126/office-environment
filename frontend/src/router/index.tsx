import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { AppLayout } from '@/layouts/AppLayout'
import LoginPage from '@/pages/auth/LoginPage'
import DashboardPage from '@/pages/dashboard/DashboardPage'
import { Suspense, lazy } from 'react'

// Lazy-loaded pages (loaded only when navigated to)
const CompaniesPage  = lazy(() => import('@/pages/companies/CompaniesPage'))
const UsersPage      = lazy(() => import('@/pages/users/UsersPage'))
const CustomersPage  = lazy(() => import('@/pages/customers/CustomersPage'))
const VendorsPage    = lazy(() => import('@/pages/vendors/VendorsPage'))
const ProductsPage   = lazy(() => import('@/pages/products/ProductsPage'))
const InventoryPage  = lazy(() => import('@/pages/inventory/InventoryPage'))

// Phase 3: Sales & Procurement
const SalesPage      = lazy(() => import('@/pages/sales/SalesPage'))
const QuotationsPage = lazy(() => import('@/pages/sales/QuotationsPage'))
const InvoicesPage   = lazy(() => import('@/pages/sales/InvoicesPage'))
const PurchasesPage  = lazy(() => import('@/pages/procurement/PurchasesPage'))

// Phase 4: Finance
const PaymentsPage   = lazy(() => import('@/pages/finance/PaymentsPage'))
const ExpensesPage   = lazy(() => import('@/pages/finance/ExpensesPage'))
const GSTReportPage  = lazy(() => import('@/pages/finance/GSTReportPage'))

// Phase 5: Files & Websites
const DocumentsPage  = lazy(() => import('@/pages/files/DocumentsPage'))
const WebsiteManagerPage = lazy(() => import('@/pages/websites/WebsiteManagerPage'))

// Phase 6: Email
const EmailClientPage = lazy(() => import('@/pages/email/EmailClientPage'))

// Phase 7: AI Assistant & Image Studio
const AIAssistantPage = lazy(() => import('@/pages/ai/AIAssistantPage'))
const AIImageStudioPage = lazy(() => import('@/pages/ai/AIImageStudioPage'))

// ─── Protected Route ──────────────────────────────────────────────────────────
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return <>{children}</>
}

// ─── Page Loader ─────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-brand-600/30 border-t-brand-500 rounded-full animate-spin" />
        <p className="text-xs text-gray-600">Loading...</p>
      </div>
    </div>
  )
}

// ─── Coming Soon placeholder ──────────────────────────────────────────────────
function ComingSoon({ module }: { module: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-16 h-16 rounded-2xl bg-surface-700 border border-white/10 flex items-center justify-center">
        <span className="text-3xl">🚧</span>
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold text-white mb-1">{module}</h2>
        <p className="text-sm text-gray-500">This module is coming in a future phase.</p>
      </div>
    </div>
  )
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected — all routes inside AppLayout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />

        <Route path="companies" element={
          <Suspense fallback={<PageLoader />}><CompaniesPage /></Suspense>
        } />

        <Route path="users" element={
          <Suspense fallback={<PageLoader />}><UsersPage /></Suspense>
        } />

        {/* Phase 2 modules */}
        <Route path="customers"   element={<Suspense fallback={<PageLoader />}><CustomersPage /></Suspense>} />
        <Route path="vendors"     element={<Suspense fallback={<PageLoader />}><VendorsPage /></Suspense>} />
        <Route path="products"    element={<Suspense fallback={<PageLoader />}><ProductsPage /></Suspense>} />
        <Route path="inventory"   element={<Suspense fallback={<PageLoader />}><InventoryPage /></Suspense>} />

        {/* Phase 3 modules: Sales & Procurement */}
        <Route path="sales"       element={<Suspense fallback={<PageLoader />}><SalesPage /></Suspense>} />
        <Route path="quotations"  element={<Suspense fallback={<PageLoader />}><QuotationsPage /></Suspense>} />
        <Route path="invoices"    element={<Suspense fallback={<PageLoader />}><InvoicesPage /></Suspense>} />
        <Route path="purchases"   element={<Suspense fallback={<PageLoader />}><PurchasesPage /></Suspense>} />

        {/* Phase 4 modules: Finance */}
        <Route path="payments"    element={<Suspense fallback={<PageLoader />}><PaymentsPage /></Suspense>} />
        <Route path="expenses"    element={<Suspense fallback={<PageLoader />}><ExpensesPage /></Suspense>} />
        <Route path="gst"         element={<Suspense fallback={<PageLoader />}><GSTReportPage /></Suspense>} />

        {/* Phase 5 modules: Files & Websites */}
        <Route path="files"       element={<Suspense fallback={<PageLoader />}><DocumentsPage /></Suspense>} />
        <Route path="documents"   element={<Suspense fallback={<PageLoader />}><DocumentsPage /></Suspense>} />
        <Route path="websites"    element={<Suspense fallback={<PageLoader />}><WebsiteManagerPage /></Suspense>} />

        {/* Phase 6 & 7 modules: Email, Analytics, AI */}
        <Route path="email"       element={<Suspense fallback={<PageLoader />}><EmailClientPage /></Suspense>} />
        <Route path="ai"          element={<Suspense fallback={<PageLoader />}><AIAssistantPage /></Suspense>} />
        <Route path="ai/images"   element={<Suspense fallback={<PageLoader />}><AIImageStudioPage /></Suspense>} />

        {/* Phase 8+ modules — placeholders */}
        <Route path="deployments" element={<ComingSoon module="Deployments" />} />
        <Route path="reports"     element={<ComingSoon module="Reports" />} />
        <Route path="audit"       element={<ComingSoon module="Audit Logs" />} />
        <Route path="settings"    element={<ComingSoon module="Settings" />} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
