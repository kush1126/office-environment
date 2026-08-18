import uuid
from typing import Optional, Tuple, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.models.user import User
from app.models import Customer
from app.schemas.customer import CustomerCreate, CustomerUpdate

class CustomerService:
    async def list_customers(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, 
        search: Optional[str] = None, is_active: Optional[bool] = None
    ) -> Tuple[Sequence[Customer], int]:
        query = select(Customer).where(Customer.company_id == company_id, Customer.deleted_at.is_(None))
        
        if is_active is not None:
            query = query.where(Customer.is_active == is_active)
            
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Customer.name.ilike(search_term),
                    Customer.customer_code.ilike(search_term),
                    Customer.email.ilike(search_term),
                    Customer.phone.ilike(search_term)
                )
            )
            
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        # Paginate
        query = query.order_by(Customer.name).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        customers = result.scalars().all()
        
        return customers, total

    async def get_by_id(self, db: AsyncSession, company_id: uuid.UUID, customer_id: uuid.UUID) -> Optional[Customer]:
        query = select(Customer).where(
            Customer.id == customer_id, 
            Customer.company_id == company_id,
            Customer.deleted_at.is_(None)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_customer(self, db: AsyncSession, company_id: uuid.UUID, data: CustomerCreate, current_user: User) -> Customer:
        customer = Customer(
            **data.model_dump(),
            company_id=company_id,
            created_by=current_user.id
        )
        db.add(customer)
        await db.flush()
        return customer

    async def update_customer(self, db: AsyncSession, customer: Customer, data: CustomerUpdate) -> Customer:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(customer, key, value)
        await db.flush()
        return customer

    async def delete_customer(self, db: AsyncSession, customer: Customer, current_user: User) -> None:
        await customer.soft_delete(db, current_user.id)
        await db.flush()
