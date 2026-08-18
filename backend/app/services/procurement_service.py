import uuid
from typing import Optional, Tuple, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models import PurchaseOrder, PurchaseOrderItem, Bill, BillItem
from app.schemas.procurement import PurchaseOrderCreate, PurchaseOrderUpdate, BillCreate, BillUpdate

class ProcurementService:
    # --- Purchase Orders ---
    async def list_purchase_orders(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, search: Optional[str] = None
    ) -> Tuple[Sequence[PurchaseOrder], int]:
        query = select(PurchaseOrder).where(PurchaseOrder.company_id == company_id, PurchaseOrder.deleted_at.is_(None)).options(selectinload(PurchaseOrder.items))
        
        if search:
            search_term = f"%{search}%"
            query = query.where(PurchaseOrder.po_number.ilike(search_term))
            
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(PurchaseOrder.issue_date.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        
        return result.scalars().all(), total

    async def get_purchase_order(self, db: AsyncSession, company_id: uuid.UUID, po_id: uuid.UUID) -> Optional[PurchaseOrder]:
        query = select(PurchaseOrder).where(
            PurchaseOrder.id == po_id, 
            PurchaseOrder.company_id == company_id,
            PurchaseOrder.deleted_at.is_(None)
        ).options(selectinload(PurchaseOrder.items))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_purchase_order(self, db: AsyncSession, company_id: uuid.UUID, data: PurchaseOrderCreate, current_user: User) -> PurchaseOrder:
        subtotal = sum((item.quantity * item.unit_price) for item in data.items)
        discount_total = sum(item.discount_amount for item in data.items)
        tax_total = sum((((item.quantity * item.unit_price) - item.discount_amount) * (item.tax_rate / 100)) for item in data.items)
        grand_total = subtotal - discount_total + tax_total

        po = PurchaseOrder(
            company_id=company_id,
            vendor_id=data.vendor_id,
            po_number=data.po_number,
            issue_date=data.issue_date,
            expected_delivery=data.expected_delivery,
            status=data.status,
            subtotal=subtotal,
            tax_total=tax_total,
            discount_total=discount_total,
            grand_total=grand_total,
            notes=data.notes,
            terms_conditions=data.terms_conditions,
            created_by=current_user.id
        )
        db.add(po)
        await db.flush()

        for item_data in data.items:
            item_tax_amount = ((item_data.quantity * item_data.unit_price) - item_data.discount_amount) * (item_data.tax_rate / 100)
            item_total = (item_data.quantity * item_data.unit_price) - item_data.discount_amount + item_tax_amount
            
            item = PurchaseOrderItem(
                po_id=po.id,
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
        return await self.get_purchase_order(db, company_id, po.id)

    async def update_purchase_order(self, db: AsyncSession, po: PurchaseOrder, data: PurchaseOrderUpdate) -> PurchaseOrder:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(po, key, value)
        await db.flush()
        return po


    # --- Bills ---
    async def list_bills(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, search: Optional[str] = None
    ) -> Tuple[Sequence[Bill], int]:
        query = select(Bill).where(Bill.company_id == company_id, Bill.deleted_at.is_(None)).options(selectinload(Bill.items))
        
        if search:
            search_term = f"%{search}%"
            query = query.where(Bill.bill_number.ilike(search_term))
            
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Bill.issue_date.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        
        return result.scalars().all(), total

    async def get_bill(self, db: AsyncSession, company_id: uuid.UUID, bill_id: uuid.UUID) -> Optional[Bill]:
        query = select(Bill).where(
            Bill.id == bill_id, 
            Bill.company_id == company_id,
            Bill.deleted_at.is_(None)
        ).options(selectinload(Bill.items))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_bill(self, db: AsyncSession, company_id: uuid.UUID, data: BillCreate, current_user: User) -> Bill:
        subtotal = sum((item.quantity * item.unit_price) for item in data.items)
        discount_total = sum(item.discount_amount for item in data.items)
        tax_total = sum((((item.quantity * item.unit_price) - item.discount_amount) * (item.tax_rate / 100)) for item in data.items)
        grand_total = subtotal - discount_total + tax_total

        bill = Bill(
            company_id=company_id,
            vendor_id=data.vendor_id,
            po_id=data.po_id,
            bill_number=data.bill_number,
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
        db.add(bill)
        await db.flush()

        for item_data in data.items:
            item_tax_amount = ((item_data.quantity * item_data.unit_price) - item_data.discount_amount) * (item_data.tax_rate / 100)
            item_total = (item_data.quantity * item_data.unit_price) - item_data.discount_amount + item_tax_amount
            
            item = BillItem(
                bill_id=bill.id,
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
        return await self.get_bill(db, company_id, bill.id)

    async def update_bill(self, db: AsyncSession, bill: Bill, data: BillUpdate) -> Bill:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(bill, key, value)
        await db.flush()
        return bill
