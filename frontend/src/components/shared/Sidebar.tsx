import { NavLink, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Building2, Mail, Users, Package, Archive,
  ShoppingCart, ShoppingBag, FileText, Receipt, CreditCard,
  TrendingUp, BarChart3, FolderOpen, Globe, Rocket, Bot,
  BellRing, GraduationCap, ClipboardList, Settings, Boxes,
  Briefcase, AlertTriangle, ChevronRight, Zap,
} from 'lucide-react'

interface NavItem {
  label: string
  to: string
  icon: React.ElementType
  permission?: string
  badge?: string | number
}

interface NavSection {
  label: string
  items: NavItem[]
}

const NAV: NavSection[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard',    to: '/',              icon: LayoutDashboard },
      { label: 'Companies',    to: '/companies',     icon: Building2,   permission: 'companies.read' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { label: 'Email',        to: '/email',         icon: Mail,        permission: 'email.read' },
    ],
  },
  {
    label: 'Customers & Sales',
    items: [
      { label: 'Customers',    to: '/customers',     icon: Users,       permission: 'customers.read' },
      { label: 'Quotations',   to: '/quotations',    icon: FileText,    permission: 'sales.read' },
      { label: 'Invoices',     to: '/invoices',      icon: Receipt,     permission: 'sales.read' },
      { label: 'Sales',        to: '/sales',         icon: ShoppingCart,permission: 'sales.read' },
    ],
  },
  {
    label: 'Procurement',
    items: [
      { label: 'Vendors',      to: '/vendors',       icon: Briefcase,   permission: 'vendors.read' },
      { label: 'Purchases',    to: '/purchases',     icon: ShoppingBag, permission: 'purchases.read' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { label: 'Products',     to: '/products',      icon: Package,     permission: 'products.read' },
      { label: 'Inventory',    to: '/inventory',     icon: Boxes,       permission: 'inventory.read' },
    ],
  },
  {
    label: 'Finance',
    items: [
      { label: 'Payments',     to: '/payments',      icon: CreditCard,  permission: 'finance.read' },
      { label: 'Expenses',     to: '/expenses',      icon: TrendingUp,  permission: 'finance.read' },
      { label: 'GST',          to: '/gst',           icon: ClipboardList,permission: 'gst.read' },
    ],
  },
  {
    label: 'Documents & Files',
    items: [
      { label: 'Documents',    to: '/documents',     icon: Archive,     permission: 'documents.read' },
      { label: 'File Manager', to: '/files',         icon: FolderOpen,  permission: 'files.read' },
    ],
  },
  {
    label: 'Web & Deploy',
    items: [
      { label: 'Websites',     to: '/websites',      icon: Globe,       permission: 'websites.read' },
      { label: 'Deployments',  to: '/deployments',   icon: Rocket,      permission: 'deploy.staging' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { label: 'Reports',      to: '/reports',       icon: BarChart3,   permission: 'reports.read' },
      { label: 'AI Assistant', to: '/ai',            icon: Bot,         permission: 'ai.read' },
      { label: 'AI Alerts',    to: '/ai/alerts',     icon: BellRing,    permission: 'ai.read' },
      { label: 'AI Training',  to: '/ai/training',   icon: GraduationCap,permission: 'ai.train' },
    ],
  },
  {
    label: 'Administration',
    items: [
      { label: 'Users',        to: '/users',         icon: Users,       permission: 'users.read' },
      { label: 'Audit Logs',   to: '/audit',         icon: AlertTriangle,permission: 'audit.read' },
      { label: 'Settings',     to: '/settings',      icon: Settings },
    ],
  },
]

export function Sidebar({ collapsed }: { collapsed: boolean }) {
  const { user } = useAuthStore()
  const permissions = new Set(user?.permissions || [])

  const canSee = (permission?: string): boolean => {
    if (!permission) return true
    if (user?.is_superuser) return true
    return permissions.has(permission)
  }

  return (
    <aside
      className={clsx(
        'flex flex-col h-full bg-card border-r border-border transition-all duration-300 overflow-hidden',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 h-16 border-b border-white/5 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center shrink-0 shadow-glow">
          <Zap size={16} className="text-white" />
        </div>
        {!collapsed && (
          <div className="animate-in">
            <p className="text-sm font-bold text-gradient leading-none">Office OS</p>
            <p className="text-[10px] text-gray-500 mt-0.5">Business Platform</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 space-y-1 px-2">
        {NAV.map((section) => {
          const visibleItems = section.items.filter((item) => canSee(item.permission))
          if (visibleItems.length === 0) return null

          return (
            <div key={section.label} className="mb-1">
              {!collapsed && (
                <p className="px-3 py-2 text-xs font-semibold text-muted-foreground tracking-wider">{section.label}</p>
              )}
              {visibleItems.map((item) => (
                <SidebarNavItem key={item.to} item={item} collapsed={collapsed} />
              ))}
            </div>
          )
        })}
      </nav>

      {/* User footer */}
      {!collapsed && user && (
        <div className="px-3 py-3 border-t border-border shrink-0">
          <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted cursor-pointer transition-colors">
            <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
              {user.username[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-foreground truncate">{user.full_name || user.username}</p>
              <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}

function SidebarNavItem({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation()
  const isActive =
    item.to === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(item.to)

  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={clsx(
        'nav-item w-full relative',
        isActive && 'active',
        collapsed && 'justify-center px-0'
      )}
    >
      <item.icon size={16} className="shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <span className="badge bg-brand-600/20 text-brand-400 text-[10px] px-1.5">
              {item.badge}
            </span>
          )}
        </>
      )}
      {isActive && !collapsed && (
        <ChevronRight size={12} className="text-brand-500 ml-auto" />
      )}
    </NavLink>
  )
}
