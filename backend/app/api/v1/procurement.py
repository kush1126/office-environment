import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission, get_company_id
from app.models.user import User
from app.schemas.procurement import PurchaseOrderCreate, PurchaseOrderResponse, PurchaseOrderUpdate, BillCreate, BillResponse, BillUpdate
from app.services.procurement_service import ProcurementService
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/procurement", tags=["Procurement"])
procurement_service = ProcurementService()

# --- Purchase Orders ---
@router.get("/purchase-orders", response_model=PaginatedResponse[PurchaseOrderResponse])
async def list_purchase_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("procurement.read")),
    db: AsyncSession = Depends(get_db)
):
    items, total = await procurement_service.list_purchase_orders(db, company_id, page, page_size, search)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("/purchase-orders", response_model=PurchaseOrderResponse, status_code=status.HTTP_201_CREATED)
async def create_purchase_order(
    data: PurchaseOrderCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("procurement.write")),
    db: AsyncSession = Depends(get_db)
):
    po = await procurement_service.create_purchase_order(db, company_id, data, current_user)
    await db.commit()
    return po

@router.get("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def get_purchase_order(
    po_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("procurement.read")),
    db: AsyncSession = Depends(get_db)
):
    po = await procurement_service.get_purchase_order(db, company_id, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return po

@router.patch("/purchase-orders/{po_id}", response_model=PurchaseOrderResponse)
async def update_purchase_order(
    po_id: uuid.UUID,
    data: PurchaseOrderUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("procurement.write")),
    db: AsyncSession = Depends(get_db)
):
    po = await procurement_service.get_purchase_order(db, company_id, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    po = await procurement_service.update_purchase_order(db, po, data)
    await db.commit()
    return po


# --- Bills ---
@router.get("/bills", response_model=PaginatedResponse[BillResponse])
async def list_bills(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("procurement.read")),
    db: AsyncSession = Depends(get_db)
):
    items, total = await procurement_service.list_bills(db, company_id, page, page_size, search)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("/bills", response_model=BillResponse, status_code=status.HTTP_201_CREATED)
async def create_bill(
    data: BillCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("procurement.write")),
    db: AsyncSession = Depends(get_db)
):
    bill = await procurement_service.create_bill(db, company_id, data, current_user)
    await db.commit()
    return bill

@router.get("/bills/{bill_id}", response_model=BillResponse)
async def get_bill(
    bill_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("procurement.read")),
    db: AsyncSession = Depends(get_db)
):
    bill = await procurement_service.get_bill(db, company_id, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    return bill

@router.patch("/bills/{bill_id}", response_model=BillResponse)
async def update_bill(
    bill_id: uuid.UUID,
    data: BillUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("procurement.write")),
    db: AsyncSession = Depends(get_db)
):
    bill = await procurement_service.get_bill(db, company_id, bill_id)
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    bill = await procurement_service.update_bill(db, bill, data)
    await db.commit()
    return bill
