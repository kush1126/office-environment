"""FastAPI dependency injectors for auth, DB session, and permissions."""
from typing import Annotated, Optional
from uuid import UUID

import structlog
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User, Permission

log = structlog.get_logger()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: AsyncSession = Depends(get_db),
) -> User:
    """Decode JWT and return the authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = decode_token(token)
        if payload.get("type") != "access":
            raise credentials_exception
        user_id: str = payload.get("sub")
        if not user_id:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == UUID(user_id)))
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise credentials_exception
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user


def require_permission(permission: str):
    """Factory: returns a dependency that requires a specific permission."""
    async def _check(current_user: User = Depends(get_current_active_user)):
        if not current_user.has_permission(permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission required: {permission}",
            )
        return current_user
    return _check


def require_role(*roles: str):
    """Factory: returns a dependency that requires one of the specified roles."""
    async def _check(current_user: User = Depends(get_current_active_user)):
        user_roles = {r.name for r in current_user.roles}
        if not user_roles.intersection(set(roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required role(s): {', '.join(roles)}",
            )
        return current_user
    return _check


from fastapi import Header

async def get_company_id(x_company_id: Optional[str] = Header(None, alias="X-Company-ID")) -> UUID:
    """Dependency to extract the current company ID from the request headers."""
    if not x_company_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="X-Company-ID header is missing",
        )
    try:
        return UUID(x_company_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid X-Company-ID format",
        )


def require_company_access(company_id_param: str = "company_id"):
    """Dependency that checks the user has access to the requested company."""
    async def _check(
        company_id: UUID = Depends(get_company_id),
        current_user: User = Depends(get_current_active_user),
    ):
        # Admins bypass company restriction
        if current_user.has_role("ADMIN"):
            return current_user
        # Otherwise check user is assigned to this company
        user_company_ids = {str(ca.company_id) for ca in current_user.company_access}
        if str(company_id) not in user_company_ids:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this company's data.",
            )
        return current_user
    return _check


# ─── Type Aliases ─────────────────────────────────────────────────────────────
CurrentUser = Annotated[User, Depends(get_current_active_user)]
DB = Annotated[AsyncSession, Depends(get_db)]
