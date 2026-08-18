"""Dashboard API — aggregated business metrics, company-scoped."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser, get_current_active_user
from app.models.user import User
from app.services.dashboard_service import DashboardService

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])
dashboard_service = DashboardService()


@router.get("/summary")
async def get_dashboard_summary(
    company_id: Optional[uuid.UUID] = Query(None, description="Filter by company. Omit for all accessible companies."),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns aggregated business metrics for the dashboard.
    Scoped to specified company, or all companies accessible to user if omitted.
    """
    # Company access check
    if company_id and not current_user.has_company_access(company_id):
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Access denied to this company.")

    return await dashboard_service.get_summary(db, company_id, current_user)
