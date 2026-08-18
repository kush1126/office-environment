"""Dashboard service — aggregated business metrics."""
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User


class DashboardService:
    """
    Returns aggregated dashboard metrics scoped to a company.
    As more business modules are built (invoices, payments, inventory, etc.),
    this service will be expanded to include real data.
    For Phase 1, returns placeholder structure with zeros.
    """

    async def get_summary(
        self, db: AsyncSession, company_id: Optional[uuid.UUID], user: User
    ) -> dict:
        today = date.today()
        this_month_start = today.replace(day=1)

        # These will be populated as business modules are added in Phases 2-3
        return {
            "company_id": str(company_id) if company_id else None,
            "as_of": datetime.now(timezone.utc).isoformat(),
            "today": {
                "sales": 0,
                "purchases": 0,
                "incoming_payments": 0,
                "outgoing_payments": 0,
            },
            "outstanding": {
                "receivables": 0,
                "payables": 0,
            },
            "inventory": {
                "low_stock_count": 0,
                "critical_stock_count": 0,
                "out_of_stock_count": 0,
            },
            "quotations": {
                "pending": 0,
                "expiring_soon": 0,
            },
            "invoices": {
                "draft": 0,
                "overdue": 0,
                "due_this_week": 0,
            },
            "emails": {
                "unread": 0,
                "high_priority": 0,
                "needs_action": 0,
            },
            "websites": {
                "healthy": 0,
                "degraded": 0,
                "down": 0,
                "last_deployment": None,
            },
            "ai_alerts": {
                "critical": 0,
                "high": 0,
                "open_total": 0,
            },
        }
