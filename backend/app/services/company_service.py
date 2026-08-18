"""Company management service."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import structlog
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.company import Company
from app.models.user import User
from app.schemas.company import CompanyCreate, CompanyUpdate

log = structlog.get_logger()


class CompanyService:

    async def get_by_id(self, db: AsyncSession, company_id: uuid.UUID) -> Optional[Company]:
        result = await db.execute(
            select(Company).where(Company.id == company_id, Company.deleted_at.is_(None))
        )
        return result.scalar_one_or_none()

    async def list_companies(
        self,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 25,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
        user: Optional[User] = None,
    ) -> tuple[List[Company], int]:
        """List companies. Superusers see all; others see only accessible ones."""
        query = select(Company).where(Company.deleted_at.is_(None))

        if user and not user.is_superuser:
            accessible_ids = [ca.company_id for ca in user.company_access]
            query = query.where(Company.id.in_(accessible_ids))

        if search:
            query = query.where(
                or_(
                    Company.name.ilike(f"%{search}%"),
                    Company.legal_name.ilike(f"%{search}%"),
                    Company.gstin.ilike(f"%{search}%"),
                )
            )
        if is_active is not None:
            query = query.where(Company.is_active == is_active)

        total_result = await db.execute(select(func.count()).select_from(query.subquery()))
        total = total_result.scalar_one()

        query = query.offset((page - 1) * page_size).limit(page_size).order_by(Company.name)
        result = await db.execute(query)
        return result.scalars().all(), total

    async def create_company(self, db: AsyncSession, data: CompanyCreate, created_by: User) -> Company:
        # Check GSTIN uniqueness if provided
        if data.gstin:
            existing = await db.execute(
                select(Company).where(Company.gstin == data.gstin.upper(), Company.deleted_at.is_(None))
            )
            if existing.scalar_one_or_none():
                raise ValueError(f"A company with GSTIN {data.gstin} already exists.")

        company = Company(
            **data.model_dump(),
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        if company.gstin:
            company.gstin = company.gstin.upper()
        if company.pan:
            company.pan = company.pan.upper()

        db.add(company)
        await db.commit()
        await db.refresh(company)
        log.info("company.created", company_id=str(company.id), by=str(created_by.id))
        return company

    async def update_company(self, db: AsyncSession, company: Company, data: CompanyUpdate) -> Company:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(company, field, value)
        company.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(company)
        return company

    async def delete_company(self, db: AsyncSession, company: Company, deleted_by: User) -> None:
        company.soft_delete()
        await db.commit()
        log.info("company.deleted", company_id=str(company.id), by=str(deleted_by.id))
