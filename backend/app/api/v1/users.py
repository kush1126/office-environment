"""Users and Roles API routes."""
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser, require_permission
from app.models.user import User
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.user import (
    UserCreate, UserUpdate, UserResponse, UserSummary,
    UserAssignRoles, UserAssignCompanies,
    RoleCreate, RoleUpdate, RoleResponse, PermissionResponse,
)
from app.services.audit_service import AuditService
from app.services.user_service import UserService

router = APIRouter(prefix="/users", tags=["Users & Roles"])
user_service = UserService()
audit_service = AuditService()


# ─── Users ────────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse[UserSummary])
async def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_permission("users.read")),
    db: AsyncSession = Depends(get_db),
):
    users, total = await user_service.list_users(db, page, page_size, search, is_active)
    items = []
    for u in users:
        items.append(UserSummary(
            id=u.id, username=u.username, email=u.email, full_name=u.full_name,
            is_active=u.is_active, roles=u.role_names, last_login=u.last_login,
        ))
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=-(-total // page_size),
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    try:
        user = await user_service.create_user(db, data, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await audit_service.log(
        db, action="user.created", user_id=current_user.id,
        entity_type="User", entity_id=user.id, new_value={"username": user.username},
    )
    await db.commit()
    return _to_response(user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: uuid.UUID,
    current_user: User = Depends(require_permission("users.read")),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    return _to_response(user)


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: uuid.UUID,
    data: UserUpdate,
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    old = {"email": user.email, "full_name": user.full_name, "is_active": user.is_active}
    user = await user_service.update_user(db, user, data)
    await audit_service.log(
        db, action="user.updated", user_id=current_user.id,
        entity_type="User", entity_id=user_id, old_value=old,
        new_value=data.model_dump(exclude_unset=True),
    )
    await db.commit()
    return _to_response(user)


@router.post("/{user_id}/roles", response_model=UserResponse)
async def assign_roles(
    user_id: uuid.UUID,
    data: UserAssignRoles,
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user = await user_service.assign_roles(db, user, data.role_ids)
    await audit_service.log(
        db, action="user.roles_assigned", user_id=current_user.id,
        entity_type="User", entity_id=user_id,
        new_value={"role_ids": [str(r) for r in data.role_ids]},
    )
    await db.commit()
    return _to_response(user)


@router.post("/{user_id}/companies", response_model=UserResponse)
async def assign_companies(
    user_id: uuid.UUID,
    data: UserAssignCompanies,
    current_user: User = Depends(require_permission("users.manage")),
    db: AsyncSession = Depends(get_db),
):
    user = await user_service.get_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")
    user = await user_service.assign_companies(db, user, data, current_user)
    await audit_service.log(
        db, action="user.companies_assigned", user_id=current_user.id,
        entity_type="User", entity_id=user_id,
        new_value={"company_ids": [str(c) for c in data.company_ids]},
    )
    await db.commit()
    return _to_response(user)


# ─── Roles ────────────────────────────────────────────────────────────────────

@router.get("/roles/list", response_model=list[RoleResponse], tags=["Roles"])
async def list_roles(
    current_user: User = Depends(require_permission("users.read")),
    db: AsyncSession = Depends(get_db),
):
    return await user_service.list_roles(db)


@router.get("/permissions/list", response_model=list[PermissionResponse], tags=["Roles"])
async def list_permissions(
    current_user: User = Depends(require_permission("users.read")),
    db: AsyncSession = Depends(get_db),
):
    return await user_service.list_permissions(db)


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _to_response(user) -> UserResponse:
    return UserResponse(
        id=user.id, username=user.username, email=user.email,
        full_name=user.full_name, is_active=user.is_active,
        is_superuser=user.is_superuser, last_login=user.last_login,
        created_at=user.created_at, updated_at=user.updated_at,
        roles=[RoleResponse(id=r.id, name=r.name, description=r.description, is_system=r.is_system) for r in user.roles],
        permissions=list(user.permission_codes),
        company_ids=[ca.company_id for ca in user.company_access],
    )
