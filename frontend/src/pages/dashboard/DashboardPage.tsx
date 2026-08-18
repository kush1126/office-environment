import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Activity, CreditCard, DollarSign, Package, AlertTriangle, ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react"
import { useAuthStore } from '@/store/authStore'
import { getDashboardAnalytics } from '@/api/analytics'
import { DashboardAnalytics } from '@/types/erp'
import BatchUpload from '@/components/BatchUpload'

export default function DashboardPage() {
  const { user, activeCompanyId } = useAuthStore() // Note: previous code used `activeCompanyId`, ensure we use the correct state
  const [analytics, setAnalytics] = useState<DashboardAnalytics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true)
        const data = await getDashboardAnalytics()
        setAnalytics(data)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back, {user?.full_name}. Here's what's happening at your company.</p>
        </div>
      </div>

      <BatchUpload />

      {analytics && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Revenue MTD */}
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue (MTD)</CardTitle>
                <DollarSign className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{analytics.sales.total_revenue_mtd.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                  YTD: ₹{analytics.sales.total_revenue_ytd.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Expenses MTD */}
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Expenses (MTD)</CardTitle>
                <CreditCard className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{analytics.procurement.total_expenses_mtd.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1 flex items-center">
                  <TrendingUp className="mr-1 h-3 w-3 text-red-500" />
                  YTD: ₹{analytics.procurement.total_expenses_ytd.toLocaleString()}
                </p>
              </CardContent>
            </Card>

            {/* Pending Invoices (Receivables) */}
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Receivables</CardTitle>
                <ArrowDownRight className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{analytics.sales.pending_invoices_amount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {analytics.sales.pending_invoices_count} invoices
                </p>
              </CardContent>
            </Card>

            {/* Pending Bills (Payables) */}
            <Card className="border-none shadow-md bg-card/50 backdrop-blur-sm hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pending Payables</CardTitle>
                <ArrowUpRight className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{analytics.procurement.pending_bills_amount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {analytics.procurement.pending_bills_count} bills
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4 border-none shadow-md bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle>Cash Flow Overview</CardTitle>
                <CardDescription>Visual analytics will be implemented here.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center text-muted-foreground bg-muted/20 rounded-md mx-6 mb-6">
                <Activity className="h-12 w-12 opacity-20" />
              </CardContent>
            </Card>
            
            <Card className="col-span-3 border-none shadow-md bg-card/50 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-500">
                  <AlertTriangle className="mr-2 h-5 w-5" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>Products at or below their reorder point</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics.inventory_alerts.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-48 text-muted-foreground">
                    <Package className="h-10 w-10 mb-2 opacity-20" />
                    <p>All stock levels are healthy.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {analytics.inventory_alerts.map((alert) => (
                      <div key={alert.product_id} className="flex items-center justify-between bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                        <div>
                          <p className="font-medium text-sm">{alert.product_name}</p>
                          <p className="text-xs text-muted-foreground">Reorder at: {alert.reorder_point}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-orange-600 dark:text-orange-400">{alert.current_quantity}</p>
                          <p className="text-[10px] uppercase text-orange-500 font-semibold tracking-wider">In Stock</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
