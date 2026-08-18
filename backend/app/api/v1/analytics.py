import uuid
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission, get_company_id
from app.models.user import User
from app.schemas.analytics import DashboardAnalyticsResponse
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["Analytics"])
analytics_service = AnalyticsService()

@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
async def get_dashboard_analytics(
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(get_current_user), # All authenticated users can typically see some dashboard
    db: AsyncSession = Depends(get_db)
):
    """
    Returns aggregated data for the dashboard.
    """
    return await analytics_service.get_dashboard_analytics(db, company_id)
