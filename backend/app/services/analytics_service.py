import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from datetime import date, datetime
from decimal import Decimal

from app.models import Invoice, Bill, Product, Inventory
from app.schemas.analytics import DashboardAnalyticsResponse, SalesAnalytics, ProcurementAnalytics, InventoryAlert

class AnalyticsService:
    async def get_dashboard_analytics(self, db: AsyncSession, company_id: uuid.UUID) -> DashboardAnalyticsResponse:
        today = date.today()
        first_day_of_month = date(today.year, today.month, 1)
        first_day_of_year = date(today.year, 1, 1)

        # --- Sales Analytics ---
        # 1. Total Revenue (MTD & YTD)
        sales_query = select(Invoice.issue_date, Invoice.grand_total).where(
            Invoice.company_id == company_id,
            Invoice.status.in_(["PAID", "PARTIAL", "ISSUED"]),
            Invoice.deleted_at.is_(None)
        )
        sales_result = await db.execute(sales_query)
        invoices = sales_result.all()

        revenue_mtd = Decimal(0)
        revenue_ytd = Decimal(0)
        for issue_date, grand_total in invoices:
            if issue_date >= first_day_of_year:
                revenue_ytd += Decimal(str(grand_total))
                if issue_date >= first_day_of_month:
                    revenue_mtd += Decimal(str(grand_total))

        # 2. Pending Invoices (ISSUED or PARTIAL)
        pending_invoices_query = select(func.count(), func.sum(Invoice.grand_total - Invoice.amount_paid)).where(
            Invoice.company_id == company_id,
            Invoice.status.in_(["ISSUED", "PARTIAL"]),
            Invoice.deleted_at.is_(None)
        )
        pending_inv_result = await db.execute(pending_invoices_query)
        pending_inv_count, pending_inv_amount = pending_inv_result.first()

        sales_analytics = SalesAnalytics(
            total_revenue_mtd=revenue_mtd,
            total_revenue_ytd=revenue_ytd,
            pending_invoices_count=pending_inv_count or 0,
            pending_invoices_amount=Decimal(str(pending_inv_amount or 0))
        )

        # --- Procurement Analytics ---
        # 1. Total Expenses (MTD & YTD) from Bills
        bills_query = select(Bill.issue_date, Bill.grand_total).where(
            Bill.company_id == company_id,
            Bill.status.in_(["PAID", "PARTIAL", "ISSUED"]),
            Bill.deleted_at.is_(None)
        )
        bills_result = await db.execute(bills_query)
        bills = bills_result.all()

        expenses_mtd = Decimal(0)
        expenses_ytd = Decimal(0)
        for issue_date, grand_total in bills:
            if issue_date >= first_day_of_year:
                expenses_ytd += Decimal(str(grand_total))
                if issue_date >= first_day_of_month:
                    expenses_mtd += Decimal(str(grand_total))

        # 2. Pending Bills
        pending_bills_query = select(func.count(), func.sum(Bill.grand_total - Bill.amount_paid)).where(
            Bill.company_id == company_id,
            Bill.status.in_(["ISSUED", "PARTIAL"]),
            Bill.deleted_at.is_(None)
        )
        pending_bill_result = await db.execute(pending_bills_query)
        pending_bill_count, pending_bill_amount = pending_bill_result.first()

        procurement_analytics = ProcurementAnalytics(
            total_expenses_mtd=expenses_mtd,
            total_expenses_ytd=expenses_ytd,
            pending_bills_count=pending_bill_count or 0,
            pending_bills_amount=Decimal(str(pending_bill_amount or 0))
        )

        # --- Inventory Alerts ---
        # Find products where current quantity is <= reorder_level
        alerts_query = select(Product, func.sum(Inventory.quantity).label("total_qty")).outerjoin(
            Inventory, Product.id == Inventory.product_id
        ).where(
            Product.company_id == company_id,
            Product.deleted_at.is_(None)
        ).group_by(Product.id).having(
            func.sum(Inventory.quantity) <= Product.reorder_level
        ).limit(5)
        
        alerts_result = await db.execute(alerts_query)
        alerts_data = alerts_result.all()

        inventory_alerts = []
        for product, total_qty in alerts_data:
            inventory_alerts.append(InventoryAlert(
                product_id=product.id,
                product_name=product.name,
                current_quantity=int(total_qty or 0),
                reorder_point=product.reorder_level
            ))

        return DashboardAnalyticsResponse(
            company_id=company_id,
            date_generated=today,
            sales=sales_analytics,
            procurement=procurement_analytics,
            inventory_alerts=inventory_alerts
        )
