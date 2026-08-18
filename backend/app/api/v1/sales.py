import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission, get_company_id
from app.models.user import User
from app.schemas.sales import QuotationCreate, QuotationResponse, QuotationUpdate, InvoiceCreate, InvoiceResponse, InvoiceUpdate
from app.services.sales_service import SalesService
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/sales", tags=["Sales"])
sales_service = SalesService()

# --- Quotations ---
@router.get("/quotations", response_model=PaginatedResponse[QuotationResponse])
async def list_quotations(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("sales.read")),
    db: AsyncSession = Depends(get_db)
):
    items, total = await sales_service.list_quotations(db, company_id, page, page_size, search)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("/quotations", response_model=QuotationResponse, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    data: QuotationCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("sales.write")),
    db: AsyncSession = Depends(get_db)
):
    quotation = await sales_service.create_quotation(db, company_id, data, current_user)
    await db.commit()
    return quotation

@router.get("/quotations/{quotation_id}", response_model=QuotationResponse)
async def get_quotation(
    quotation_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("sales.read")),
    db: AsyncSession = Depends(get_db)
):
    quotation = await sales_service.get_quotation(db, company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return quotation

@router.patch("/quotations/{quotation_id}", response_model=QuotationResponse)
async def update_quotation(
    quotation_id: uuid.UUID,
    data: QuotationUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("sales.write")),
    db: AsyncSession = Depends(get_db)
):
    quotation = await sales_service.get_quotation(db, company_id, quotation_id)
    if not quotation:
        raise HTTPException(status_code=404, detail="Quotation not found")
    quotation = await sales_service.update_quotation(db, quotation, data)
    await db.commit()
    return quotation


# --- Invoices ---
@router.get("/invoices", response_model=PaginatedResponse[InvoiceResponse])
async def list_invoices(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("sales.read")),
    db: AsyncSession = Depends(get_db)
):
    items, total = await sales_service.list_invoices(db, company_id, page, page_size, search)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("/invoices", response_model=InvoiceResponse, status_code=status.HTTP_201_CREATED)
async def create_invoice(
    data: InvoiceCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("sales.write")),
    db: AsyncSession = Depends(get_db)
):
    invoice = await sales_service.create_invoice(db, company_id, data, current_user)
    await db.commit()
    return invoice

@router.get("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def get_invoice(
    invoice_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("sales.read")),
    db: AsyncSession = Depends(get_db)
):
    invoice = await sales_service.get_invoice(db, company_id, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    return invoice

@router.patch("/invoices/{invoice_id}", response_model=InvoiceResponse)
async def update_invoice(
    invoice_id: uuid.UUID,
    data: InvoiceUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("sales.write")),
    db: AsyncSession = Depends(get_db)
):
    invoice = await sales_service.get_invoice(db, company_id, invoice_id)
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
    invoice = await sales_service.update_invoice(db, invoice, data)
    await db.commit()
    return invoice
