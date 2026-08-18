import uuid
from typing import Optional, Tuple, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models import Payment, ExpenseCategory, Expense
from app.models import Invoice
from app.models import Bill
from app.schemas.finance import PaymentCreate, PaymentUpdate, ExpenseCreate, ExpenseUpdate, ExpenseCategoryCreate, ExpenseCategoryUpdate

class FinanceService:
    # --- Payments ---
    async def list_payments(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, search: Optional[str] = None
    ) -> Tuple[Sequence[Payment], int]:
        query = select(Payment).where(Payment.company_id == company_id, Payment.deleted_at.is_(None))
        
        if search:
            search_term = f"%{search}%"
            query = query.where(Payment.payment_number.ilike(search_term))
            
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Payment.payment_date.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        
        return result.scalars().all(), total

    async def get_payment(self, db: AsyncSession, company_id: uuid.UUID, payment_id: uuid.UUID) -> Optional[Payment]:
        query = select(Payment).where(
            Payment.id == payment_id, 
            Payment.company_id == company_id,
            Payment.deleted_at.is_(None)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_payment(self, db: AsyncSession, company_id: uuid.UUID, data: PaymentCreate, current_user: User) -> Payment:
        payment = Payment(
            company_id=company_id,
            payment_type=data.payment_type,
            customer_id=data.customer_id,
            vendor_id=data.vendor_id,
            invoice_id=data.invoice_id,
            bill_id=data.bill_id,
            payment_number=data.payment_number,
            payment_date=data.payment_date,
            amount=data.amount,
            payment_mode=data.payment_mode,
            reference_number=data.reference_number,
            notes=data.notes,
            created_by=current_user.id
        )
        db.add(payment)
        
        # Auto-update Invoice/Bill status if linked
        if data.invoice_id:
            invoice = await db.get(Invoice, data.invoice_id)
            if invoice:
                invoice.amount_paid += data.amount
                if invoice.amount_paid >= invoice.grand_total:
                    invoice.status = "PAID"
                elif invoice.amount_paid > 0:
                    invoice.status = "PARTIAL"

        if data.bill_id:
            bill = await db.get(Bill, data.bill_id)
            if bill:
                bill.amount_paid += data.amount
                if bill.amount_paid >= bill.grand_total:
                    bill.status = "PAID"
                elif bill.amount_paid > 0:
                    bill.status = "PARTIAL"

        await db.flush()
        return payment

    async def update_payment(self, db: AsyncSession, payment: Payment, data: PaymentUpdate) -> Payment:
        update_data = data.model_dump(exclude_unset=True)
        # Note: If amount is updated, we would technically need to revert and re-apply to the invoice. 
        # For this version, we assume payments are immutable or amount changes are manual.
        for key, value in update_data.items():
            setattr(payment, key, value)
        await db.flush()
        return payment


    # --- Expense Categories ---
    async def list_expense_categories(self, db: AsyncSession, company_id: uuid.UUID) -> Sequence[ExpenseCategory]:
        query = select(ExpenseCategory).where(ExpenseCategory.company_id == company_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def create_expense_category(self, db: AsyncSession, company_id: uuid.UUID, data: ExpenseCategoryCreate) -> ExpenseCategory:
        category = ExpenseCategory(
            company_id=company_id,
            name=data.name,
            description=data.description
        )
        db.add(category)
        await db.flush()
        return category

    
    # --- Expenses ---
    async def list_expenses(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, search: Optional[str] = None
    ) -> Tuple[Sequence[Expense], int]:
        query = select(Expense).where(Expense.company_id == company_id, Expense.deleted_at.is_(None))
        
        if search:
            search_term = f"%{search}%"
            query = query.where(Expense.expense_number.ilike(search_term))
            
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Expense.expense_date.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        
        return result.scalars().all(), total

    async def get_expense(self, db: AsyncSession, company_id: uuid.UUID, expense_id: uuid.UUID) -> Optional[Expense]:
        query = select(Expense).where(
            Expense.id == expense_id, 
            Expense.company_id == company_id,
            Expense.deleted_at.is_(None)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_expense(self, db: AsyncSession, company_id: uuid.UUID, data: ExpenseCreate, current_user: User) -> Expense:
        expense = Expense(
            company_id=company_id,
            category_id=data.category_id,
            expense_number=data.expense_number,
            expense_date=data.expense_date,
            amount=data.amount,
            paid_to=data.paid_to,
            payment_mode=data.payment_mode,
            reference_number=data.reference_number,
            description=data.description,
            receipt_path=data.receipt_path,
            created_by=current_user.id
        )
        db.add(expense)
        await db.flush()
        return expense

    async def update_expense(self, db: AsyncSession, expense: Expense, data: ExpenseUpdate) -> Expense:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(expense, key, value)
        await db.flush()
        return expense
