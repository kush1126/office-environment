"""User management service: CRUD, role assignment, company access."""
import uuid
from datetime import datetime, timezone
from typing import List, Optional

import structlog
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import hash_password
from app.models.user import User, Role, Permission
from app.models.company import UserCompanyAccess
from app.schemas.user import UserCreate, UserUpdate, UserAssignRoles, UserAssignCompanies

log = structlog.get_logger()


class UserService:

    async def get_by_id(self, db: AsyncSession, user_id: uuid.UUID) -> Optional[User]:
        result = await db.execute(
            select(User)
            .options(selectinload(User.roles).selectinload(Role.permissions))
            .options(selectinload(User.company_access))
            .where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def list_users(
        self,
        db: AsyncSession,
        page: int = 1,
        page_size: int = 25,
        search: Optional[str] = None,
        is_active: Optional[bool] = None,
    ) -> tuple[List[User], int]:
        query = (
            select(User)
            .options(selectinload(User.roles))
            .options(selectinload(User.company_access))
        )
        if search:
            query = query.where(
                or_(
                    User.username.ilike(f"%{search}%"),
                    User.email.ilike(f"%{search}%"),
                    User.full_name.ilike(f"%{search}%"),
                )
            )
        if is_active is not None:
            query = query.where(User.is_active == is_active)

        total_result = await db.execute(select(func.count()).select_from(query.subquery()))
        total = total_result.scalar_one()

        query = query.offset((page - 1) * page_size).limit(page_size).order_by(User.created_at.desc())
        result = await db.execute(query)
        return result.scalars().all(), total

    async def create_user(self, db: AsyncSession, data: UserCreate, created_by: User) -> User:
        # Check uniqueness
        existing = await db.execute(
            select(User).where(
                or_(User.username == data.username.lower(), User.email == data.email.lower())
            )
        )
        if existing.scalar_one_or_none():
            raise ValueError("Username or email already exists.")

        user = User(
            username=data.username.lower(),
            email=data.email.lower(),
            password_hash=hash_password(data.password),
            full_name=data.full_name,
            is_active=True,
            created_at=datetime.now(timezone.utc),
            updated_at=datetime.now(timezone.utc),
        )
        db.add(user)
        await db.flush()  # get user.id without committing

        # Assign roles
        if data.role_ids:
            roles = await db.execute(select(Role).where(Role.id.in_(data.role_ids)))
            user.roles = roles.scalars().all()

        # Assign companies
        for i, company_id in enumerate(data.company_ids):
            access = UserCompanyAccess(
                user_id=user.id,
                company_id=company_id,
                is_primary=(i == 0),
                granted_at=datetime.now(timezone.utc),
                granted_by=created_by.id,
            )
            db.add(access)

        await db.commit()
        await db.refresh(user)
        log.info("user.created", user_id=str(user.id), by=str(created_by.id))
        return user

    async def update_user(self, db: AsyncSession, user: User, data: UserUpdate) -> User:
        if data.email is not None:
            user.email = data.email.lower()
        if data.full_name is not None:
            user.full_name = data.full_name
        if data.is_active is not None:
            user.is_active = data.is_active
        user.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
        return user

    async def assign_roles(self, db: AsyncSession, user: User, role_ids: List[uuid.UUID]) -> User:
        roles_result = await db.execute(select(Role).where(Role.id.in_(role_ids)))
        user.roles = roles_result.scalars().all()
        user.updated_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(user)
        log.info("user.roles_assigned", user_id=str(user.id), roles=role_ids)
        return user

    async def assign_companies(
        self, db: AsyncSession, user: User, data: UserAssignCompanies, granted_by: User
    ) -> User:
        # Remove old access records
        await db.execute(
            UserCompanyAccess.__table__.delete().where(
                UserCompanyAccess.user_id == user.id
            )
        )
        # Add new ones
        for i, company_id in enumerate(data.company_ids):
            is_primary = (
                str(company_id) == str(data.primary_company_id)
                if data.primary_company_id
                else i == 0
            )
            access = UserCompanyAccess(
                user_id=user.id,
                company_id=company_id,
                is_primary=is_primary,
                granted_at=datetime.now(timezone.utc),
                granted_by=granted_by.id,
            )
            db.add(access)
        await db.commit()
        await db.refresh(user)
        return user

    async def list_roles(self, db: AsyncSession) -> List[Role]:
        result = await db.execute(
            select(Role).options(selectinload(Role.permissions)).order_by(Role.name)
        )
        return result.scalars().all()

    async def list_permissions(self, db: AsyncSession) -> List[Permission]:
        result = await db.execute(select(Permission).order_by(Permission.module, Permission.code))
        return result.scalars().all()
