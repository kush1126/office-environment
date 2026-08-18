import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission, get_company_id
from app.models.user import User
from app.schemas.finance import (
    PaymentCreate, PaymentResponse, PaymentUpdate, 
    ExpenseCreate, ExpenseResponse, ExpenseUpdate,
    ExpenseCategoryCreate, ExpenseCategoryResponse, ExpenseCategoryUpdate
)
from app.services.finance_service import FinanceService
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/finance", tags=["Finance"])
finance_service = FinanceService()

# --- Payments ---
@router.get("/payments", response_model=PaginatedResponse[PaymentResponse])
async def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("finance.read")),
    db: AsyncSession = Depends(get_db)
):
    items, total = await finance_service.list_payments(db, company_id, page, page_size, search)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
async def create_payment(
    data: PaymentCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("finance.write")),
    db: AsyncSession = Depends(get_db)
):
    payment = await finance_service.create_payment(db, company_id, data, current_user)
    await db.commit()
    return payment

@router.get("/payments/{payment_id}", response_model=PaymentResponse)
async def get_payment(
    payment_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("finance.read")),
    db: AsyncSession = Depends(get_db)
):
    payment = await finance_service.get_payment(db, company_id, payment_id)
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")
    return payment


# --- Expense Categories ---
@router.get("/expense-categories", response_model=List[ExpenseCategoryResponse])
async def list_expense_categories(
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("finance.read")),
    db: AsyncSession = Depends(get_db)
):
    return await finance_service.list_expense_categories(db, company_id)

@router.post("/expense-categories", response_model=ExpenseCategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_expense_category(
    data: ExpenseCategoryCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("finance.write")),
    db: AsyncSession = Depends(get_db)
):
    category = await finance_service.create_expense_category(db, company_id, data)
    await db.commit()
    return category


# --- Expenses ---
@router.get("/expenses", response_model=PaginatedResponse[ExpenseResponse])
async def list_expenses(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("finance.read")),
    db: AsyncSession = Depends(get_db)
):
    items, total = await finance_service.list_expenses(db, company_id, page, page_size, search)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("/expenses", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    data: ExpenseCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("finance.write")),
    db: AsyncSession = Depends(get_db)
):
    expense = await finance_service.create_expense(db, company_id, data, current_user)
    await db.commit()
    return expense

@router.get("/expenses/{expense_id}", response_model=ExpenseResponse)
async def get_expense(
    expense_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("finance.read")),
    db: AsyncSession = Depends(get_db)
):
    expense = await finance_service.get_expense(db, company_id, expense_id)
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    return expense
