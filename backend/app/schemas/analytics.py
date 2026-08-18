import uuid
from typing import List, Optional
from pydantic import BaseModel
from decimal import Decimal
from datetime import date

class SalesAnalytics(BaseModel):
    total_revenue_mtd: Decimal
    total_revenue_ytd: Decimal
    pending_invoices_count: int
    pending_invoices_amount: Decimal

class ProcurementAnalytics(BaseModel):
    total_expenses_mtd: Decimal
    total_expenses_ytd: Decimal
    pending_bills_count: int
    pending_bills_amount: Decimal

class InventoryAlert(BaseModel):
    product_id: uuid.UUID
    product_name: str
    current_quantity: int
    reorder_point: int

class DashboardAnalyticsResponse(BaseModel):
    company_id: uuid.UUID
    date_generated: date
    sales: SalesAnalytics
    procurement: ProcurementAnalytics
    inventory_alerts: List[InventoryAlert]
    # In a real app, we'd include chart data (e.g. monthly revenue breakdown)
