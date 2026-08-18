// ─── Auth ──────────────────────────────────────────────────────────────────────

export interface LoginRequest {
  username: string
  password: string
}

export interface TokenResponse {
  access_token: string
  refresh_token: string
  token_type: string
  expires_in: number
}

export interface AuthUser {
  id: string
  username: string
  email: string
  full_name: string | null
  is_active: boolean
  is_superuser: boolean
  roles: string[]
  permissions: string[]
  company_ids: string[]
  primary_company_id: string | null
}

// ─── Common ────────────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  page_size: number
  total_pages: number
}

export interface MessageResponse {
  message: string
  success: boolean
}

// ─── Company ───────────────────────────────────────────────────────────────────

export interface Company {
  id: string
  name: string
  legal_name: string | null
  gstin: string | null
  pan: string | null
  address: string | null
  city: string | null
  state: string | null
  pincode: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo_path: string | null
  financial_year_start: number
  currency: string
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface CompanyCreate {
  name: string
  legal_name?: string
  gstin?: string
  pan?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  website?: string
}

// ─── User ──────────────────────────────────────────────────────────────────────

export interface Permission {
  id: string
  code: string
  description: string | null
  module: string | null
}

export interface Role {
  id: string
  name: string
  description: string | null
  is_system: boolean
  permissions: Permission[]
}

export interface User {
  id: string
  username: string
  email: string
  full_name: string | null
  is_active: boolean
  is_superuser: boolean
  last_login: string | null
  created_at: string
  updated_at: string
  roles: Role[]
  permissions: string[]
  company_ids: string[]
}

export interface UserCreate {
  username: string
  email: string
  password: string
  full_name?: string
  role_ids?: string[]
  company_ids?: string[]
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────

export interface DashboardSummary {
  company_id: string | null
  as_of: string
  today: {
    sales: number
    purchases: number
    incoming_payments: number
    outgoing_payments: number
  }
  outstanding: {
    receivables: number
    payables: number
  }
  inventory: {
    low_stock_count: number
    critical_stock_count: number
    out_of_stock_count: number
  }
  quotations: {
    pending: number
    expiring_soon: number
  }
  invoices: {
    draft: number
    overdue: number
    due_this_week: number
  }
  emails: {
    unread: number
    high_priority: number
    needs_action: number
  }
  websites: {
    healthy: number
    degraded: number
    down: number
    last_deployment: string | null
  }
  ai_alerts: {
    critical: number
    high: number
    open_total: number
  }
}
