import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_permission, require_company_access, get_company_id
from app.models.user import User
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.services.audit_service import AuditService
from app.services.customer_service import CustomerService

router = APIRouter(prefix="/customers", tags=["Customers"])
customer_service = CustomerService()
audit_service = AuditService()

@router.get("", response_model=PaginatedResponse[CustomerResponse])
async def list_customers(
    company_id: uuid.UUID = Depends(get_company_id),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_permission("customers.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    customers, total = await customer_service.list_customers(
        db, company_id, page, page_size, search, is_active
    )
    items = [CustomerResponse.model_validate(c) for c in customers]
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=-(-total // page_size),
    )

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
async def create_customer(
    data: CustomerCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("customers.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    customer = await customer_service.create_customer(db, company_id, data, current_user)
    await audit_service.log(
        db, action="customer.created", user_id=current_user.id, company_id=company_id,
        entity_type="Customer", entity_id=customer.id, new_value={"name": customer.name}
    )
    await db.commit()
    return CustomerResponse.model_validate(customer)

@router.get("/{customer_id}", response_model=CustomerResponse)
async def get_customer(
    customer_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("customers.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    customer = await customer_service.get_by_id(db, company_id, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    return CustomerResponse.model_validate(customer)

@router.patch("/{customer_id}", response_model=CustomerResponse)
async def update_customer(
    customer_id: uuid.UUID,
    data: CustomerUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("customers.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    customer = await customer_service.get_by_id(db, company_id, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
    
    old_val = {"name": customer.name, "is_active": customer.is_active}
    customer = await customer_service.update_customer(db, customer, data)
    
    await audit_service.log(
        db, action="customer.updated", user_id=current_user.id, company_id=company_id,
        entity_type="Customer", entity_id=customer_id, old_value=old_val,
        new_value=data.model_dump(exclude_unset=True)
    )
    await db.commit()
    return CustomerResponse.model_validate(customer)

@router.delete("/{customer_id}", response_model=MessageResponse)
async def delete_customer(
    customer_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("customers.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    customer = await customer_service.get_by_id(db, company_id, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found.")
        
    await customer_service.delete_customer(db, customer, current_user)
    
    await audit_service.log(
        db, action="customer.deleted", user_id=current_user.id, company_id=company_id,
        entity_type="Customer", entity_id=customer_id, old_value={"name": customer.name}
    )
    await db.commit()
    return MessageResponse(message=f"Customer '{customer.name}' deleted.")
