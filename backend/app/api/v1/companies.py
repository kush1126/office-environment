"""Companies API routes."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser, require_permission
from app.models.user import User
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyResponse, CompanySummary
from app.services.audit_service import AuditService
from app.services.company_service import CompanyService

router = APIRouter(prefix="/companies", tags=["Companies"])
company_service = CompanyService()
audit_service = AuditService()


@router.get("", response_model=PaginatedResponse[CompanySummary])
async def list_companies(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_permission("companies.read")),
    db: AsyncSession = Depends(get_db),
):
    """List companies accessible to the current user."""
    companies, total = await company_service.list_companies(
        db, page, page_size, search, is_active, user=current_user
    )
    items = [
        CompanySummary(
            id=c.id, name=c.name, legal_name=c.legal_name, gstin=c.gstin,
            city=c.city, state=c.state, is_active=c.is_active, created_at=c.created_at,
        )
        for c in companies
    ]
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=-(-total // page_size),
    )


@router.post("", response_model=CompanyResponse, status_code=status.HTTP_201_CREATED)
async def create_company(
    data: CompanyCreate,
    current_user: User = Depends(require_permission("companies.manage")),
    db: AsyncSession = Depends(get_db),
):
    try:
        company = await company_service.create_company(db, data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await audit_service.log(
        db, action="company.created", user_id=current_user.id,
        entity_type="Company", entity_id=company.id,
        new_value={"name": company.name, "gstin": company.gstin},
    )
    await db.commit()
    return CompanyResponse.model_validate(company)


@router.get("/{company_id}", response_model=CompanyResponse)
async def get_company(
    company_id: uuid.UUID,
    current_user: User = Depends(require_permission("companies.read")),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.has_company_access(company_id):
        raise HTTPException(status_code=403, detail="Access denied to this company.")
    company = await company_service.get_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    return CompanyResponse.model_validate(company)


@router.patch("/{company_id}", response_model=CompanyResponse)
async def update_company(
    company_id: uuid.UUID,
    data: CompanyUpdate,
    current_user: User = Depends(require_permission("companies.manage")),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.has_company_access(company_id):
        raise HTTPException(status_code=403, detail="Access denied to this company.")
    company = await company_service.get_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    old = {"name": company.name, "is_active": company.is_active}
    company = await company_service.update_company(db, company, data)
    await audit_service.log(
        db, action="company.updated", user_id=current_user.id, company_id=company_id,
        entity_type="Company", entity_id=company_id, old_value=old,
        new_value=data.model_dump(exclude_unset=True),
    )
    await db.commit()
    return CompanyResponse.model_validate(company)


@router.delete("/{company_id}", response_model=MessageResponse)
async def delete_company(
    company_id: uuid.UUID,
    current_user: User = Depends(require_permission("companies.manage")),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete a company. Requires superuser."""
    if not current_user.is_superuser:
        raise HTTPException(status_code=403, detail="Only superusers can delete companies.")
    company = await company_service.get_by_id(db, company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found.")
    await company_service.delete_company(db, company, current_user)
    await audit_service.log(
        db, action="company.deleted", user_id=current_user.id, company_id=company_id,
        entity_type="Company", entity_id=company_id, old_value={"name": company.name},
    )
    await db.commit()
    return MessageResponse(message=f"Company '{company.name}' has been deactivated.")
