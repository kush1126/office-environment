import uuid
from typing import Optional, Tuple, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.models.user import User
from app.models import Vendor
from app.schemas.vendor import VendorCreate, VendorUpdate

class VendorService:
    async def list_vendors(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, 
        search: Optional[str] = None, is_active: Optional[bool] = None
    ) -> Tuple[Sequence[Vendor], int]:
        query = select(Vendor).where(Vendor.company_id == company_id, Vendor.deleted_at.is_(None))
        
        if is_active is not None:
            query = query.where(Vendor.is_active == is_active)
            
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Vendor.name.ilike(search_term),
                    Vendor.vendor_code.ilike(search_term),
                    Vendor.email.ilike(search_term),
                    Vendor.phone.ilike(search_term)
                )
            )
            
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        # Paginate
        query = query.order_by(Vendor.name).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        vendors = result.scalars().all()
        
        return vendors, total

    async def get_by_id(self, db: AsyncSession, company_id: uuid.UUID, vendor_id: uuid.UUID) -> Optional[Vendor]:
        query = select(Vendor).where(
            Vendor.id == vendor_id, 
            Vendor.company_id == company_id,
            Vendor.deleted_at.is_(None)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_vendor(self, db: AsyncSession, company_id: uuid.UUID, data: VendorCreate, current_user: User) -> Vendor:
        vendor = Vendor(
            **data.model_dump(),
            company_id=company_id,
            created_by=current_user.id
        )
        db.add(vendor)
        await db.flush()
        return vendor

    async def update_vendor(self, db: AsyncSession, vendor: Vendor, data: VendorUpdate) -> Vendor:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(vendor, key, value)
        await db.flush()
        return vendor

    async def delete_vendor(self, db: AsyncSession, vendor: Vendor, current_user: User) -> None:
        await vendor.soft_delete(db, current_user.id)
        await db.flush()
