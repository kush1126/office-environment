import uuid
from datetime import date
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission, get_company_id
from app.models.user import User
from app.schemas.finance import GSTReportResponse
from app.services.gst_service import GSTService

router = APIRouter(prefix="/gst", tags=["GST"])
gst_service = GSTService()

@router.get("/report", response_model=GSTReportResponse)
async def get_gst_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("finance.read")),
    db: AsyncSession = Depends(get_db)
):
    """
    Generates a consolidated GST report for the given date range.
    Includes both Output Tax (from Sales Invoices) and Input Tax (from Purchases).
    """
    if start_date > end_date:
        raise HTTPException(status_code=400, detail="start_date must be before end_date")
        
    return await gst_service.generate_report(db, company_id, start_date, end_date)
