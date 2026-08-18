import uuid
from typing import Optional, Tuple, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models import Quotation, QuotationItem, Invoice, InvoiceItem
from app.schemas.sales import QuotationCreate, QuotationUpdate, InvoiceCreate, InvoiceUpdate

class SalesService:
    # --- Quotations ---
    async def list_quotations(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, search: Optional[str] = None
    ) -> Tuple[Sequence[Quotation], int]:
        query = select(Quotation).where(Quotation.company_id == company_id, Quotation.deleted_at.is_(None)).options(selectinload(Quotation.items))
        
        if search:
            search_term = f"%{search}%"
            query = query.where(Quotation.quotation_number.ilike(search_term))
            
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Quotation.issue_date.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        
        return result.scalars().all(), total

    async def get_quotation(self, db: AsyncSession, company_id: uuid.UUID, quotation_id: uuid.UUID) -> Optional[Quotation]:
        query = select(Quotation).where(
            Quotation.id == quotation_id, 
            Quotation.company_id == company_id,
            Quotation.deleted_at.is_(None)
        ).options(selectinload(Quotation.items))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_quotation(self, db: AsyncSession, company_id: uuid.UUID, data: QuotationCreate, current_user: User) -> Quotation:
        # Calculate totals
        subtotal = sum((item.quantity * item.unit_price) for item in data.items)
        discount_total = sum(item.discount_amount for item in data.items)
        tax_total = sum((((item.quantity * item.unit_price) - item.discount_amount) * (item.tax_rate / 100)) for item in data.items)
        grand_total = subtotal - discount_total + tax_total

        quotation = Quotation(
            company_id=company_id,
            customer_id=data.customer_id,
            quotation_number=data.quotation_number,
            issue_date=data.issue_date,
            valid_until=data.valid_until,
            status=data.status,
            subtotal=subtotal,
            tax_total=tax_total,
            discount_total=discount_total,
            grand_total=grand_total,
            notes=data.notes,
            terms_conditions=data.terms_conditions,
            created_by=current_user.id
        )
        db.add(quotation)
        await db.flush()

        for item_data in data.items:
            item_tax_amount = ((item_data.quantity * item_data.unit_price) - item_data.discount_amount) * (item_data.tax_rate / 100)
            item_total = (item_data.quantity * item_data.unit_price) - item_data.discount_amount + item_tax_amount
            
            item = QuotationItem(
                quotation_id=quotation.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount_amount=item_data.discount_amount,
                tax_rate=item_data.tax_rate,
                tax_amount=item_tax_amount,
                total_amount=item_total,
                notes=item_data.notes
            )
            db.add(item)
            
        await db.flush()
        
        # Reload with items
        return await self.get_quotation(db, company_id, quotation.id)

    async def update_quotation(self, db: AsyncSession, quotation: Quotation, data: QuotationUpdate) -> Quotation:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(quotation, key, value)
        await db.flush()
        return quotation


    # --- Invoices ---
    async def list_invoices(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, search: Optional[str] = None
    ) -> Tuple[Sequence[Invoice], int]:
        query = select(Invoice).where(Invoice.company_id == company_id, Invoice.deleted_at.is_(None)).options(selectinload(Invoice.items))
        
        if search:
            search_term = f"%{search}%"
            query = query.where(Invoice.invoice_number.ilike(search_term))
            
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Invoice.issue_date.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        
        return result.scalars().all(), total

    async def get_invoice(self, db: AsyncSession, company_id: uuid.UUID, invoice_id: uuid.UUID) -> Optional[Invoice]:
        query = select(Invoice).where(
            Invoice.id == invoice_id, 
            Invoice.company_id == company_id,
            Invoice.deleted_at.is_(None)
        ).options(selectinload(Invoice.items))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_invoice(self, db: AsyncSession, company_id: uuid.UUID, data: InvoiceCreate, current_user: User) -> Invoice:
        # Calculate totals
        subtotal = sum((item.quantity * item.unit_price) for item in data.items)
        discount_total = sum(item.discount_amount for item in data.items)
        tax_total = sum((((item.quantity * item.unit_price) - item.discount_amount) * (item.tax_rate / 100)) for item in data.items)
        grand_total = subtotal - discount_total + tax_total

        invoice = Invoice(
            company_id=company_id,
            customer_id=data.customer_id,
            quotation_id=data.quotation_id,
            invoice_number=data.invoice_number,
            issue_date=data.issue_date,
            due_date=data.due_date,
            status=data.status,
            subtotal=subtotal,
            tax_total=tax_total,
            discount_total=discount_total,
            grand_total=grand_total,
            amount_paid=0,
            notes=data.notes,
            terms_conditions=data.terms_conditions,
            created_by=current_user.id
        )
        db.add(invoice)
        await db.flush()

        for item_data in data.items:
            item_tax_amount = ((item_data.quantity * item_data.unit_price) - item_data.discount_amount) * (item_data.tax_rate / 100)
            item_total = (item_data.quantity * item_data.unit_price) - item_data.discount_amount + item_tax_amount
            
            item = InvoiceItem(
                invoice_id=invoice.id,
                product_id=item_data.product_id,
                quantity=item_data.quantity,
                unit_price=item_data.unit_price,
                discount_amount=item_data.discount_amount,
                tax_rate=item_data.tax_rate,
                tax_amount=item_tax_amount,
                total_amount=item_total,
                notes=item_data.notes
            )
            db.add(item)
            
        await db.flush()
        
        return await self.get_invoice(db, company_id, invoice.id)

    async def update_invoice(self, db: AsyncSession, invoice: Invoice, data: InvoiceUpdate) -> Invoice:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(invoice, key, value)
        await db.flush()
        return invoice
