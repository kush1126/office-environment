import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_permission, require_company_access, get_company_id
from app.models.user import User
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.vendor import VendorCreate, VendorUpdate, VendorResponse
from app.services.audit_service import AuditService
from app.services.vendor_service import VendorService

router = APIRouter(prefix="/vendors", tags=["Vendors"])
vendor_service = VendorService()
audit_service = AuditService()

@router.get("", response_model=PaginatedResponse[VendorResponse])
async def list_vendors(
    company_id: uuid.UUID = Depends(get_company_id),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_permission("vendors.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    vendors, total = await vendor_service.list_vendors(
        db, company_id, page, page_size, search, is_active
    )
    items = [VendorResponse.model_validate(v) for v in vendors]
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=-(-total // page_size),
    )

@router.post("", response_model=VendorResponse, status_code=status.HTTP_201_CREATED)
async def create_vendor(
    data: VendorCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("vendors.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    vendor = await vendor_service.create_vendor(db, company_id, data, current_user)
    await audit_service.log(
        db, action="vendor.created", user_id=current_user.id, company_id=company_id,
        entity_type="Vendor", entity_id=vendor.id, new_value={"name": vendor.name}
    )
    await db.commit()
    return VendorResponse.model_validate(vendor)

@router.get("/{vendor_id}", response_model=VendorResponse)
async def get_vendor(
    vendor_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("vendors.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    vendor = await vendor_service.get_by_id(db, company_id, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    return VendorResponse.model_validate(vendor)

@router.patch("/{vendor_id}", response_model=VendorResponse)
async def update_vendor(
    vendor_id: uuid.UUID,
    data: VendorUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("vendors.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    vendor = await vendor_service.get_by_id(db, company_id, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
    
    old_val = {"name": vendor.name, "is_active": vendor.is_active}
    vendor = await vendor_service.update_vendor(db, vendor, data)
    
    await audit_service.log(
        db, action="vendor.updated", user_id=current_user.id, company_id=company_id,
        entity_type="Vendor", entity_id=vendor_id, old_value=old_val,
        new_value=data.model_dump(exclude_unset=True)
    )
    await db.commit()
    return VendorResponse.model_validate(vendor)

@router.delete("/{vendor_id}", response_model=MessageResponse)
async def delete_vendor(
    vendor_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("vendors.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    vendor = await vendor_service.get_by_id(db, company_id, vendor_id)
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found.")
        
    await vendor_service.delete_vendor(db, vendor, current_user)
    
    await audit_service.log(
        db, action="vendor.deleted", user_id=current_user.id, company_id=company_id,
        entity_type="Vendor", entity_id=vendor_id, old_value={"name": vendor.name}
    )
    await db.commit()
    return MessageResponse(message=f"Vendor '{vendor.name}' deleted.")
