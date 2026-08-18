"""Auth API routes: login, logout, refresh, me, change-password."""
from typing import Annotated, Optional

import structlog
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import CurrentUser, get_current_active_user
from app.schemas.auth import (
    AuthUserResponse,
    ChangePasswordRequest,
    RefreshRequest,
    TokenResponse,
)
from app.services.auth_service import AuthService

log = structlog.get_logger()
router = APIRouter(prefix="/auth", tags=["Authentication"])
auth_service = AuthService()


@router.post("/login", response_model=TokenResponse, summary="Login")
async def login(
    request: Request,
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    db: AsyncSession = Depends(get_db),
):
    """Authenticate with username + password. Returns JWT access and refresh tokens."""
    try:
        ip = request.client.host if request.client else None
        ua = request.headers.get("user-agent")
        access_token, refresh_token, user = await auth_service.authenticate(
            db, form_data.username, form_data.password, ip_address=ip, user_agent=ua
        )
        return TokenResponse(access_token=access_token, refresh_token=refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/refresh", response_model=TokenResponse, summary="Refresh access token")
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a new access token."""
    try:
        access_token = await auth_service.refresh_access_token(db, data.refresh_token)
        return TokenResponse(access_token=access_token, refresh_token=data.refresh_token)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e))


@router.post("/logout", summary="Logout")
async def logout(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    """Revoke the refresh token session."""
    await auth_service.logout(db, data.refresh_token)
    return {"message": "Logged out successfully."}


@router.get("/me", response_model=AuthUserResponse, summary="Current user info")
async def me(current_user: CurrentUser):
    """Return information about the currently authenticated user."""
    return auth_service.build_auth_response(current_user)


@router.post("/change-password", summary="Change password")
async def change_password(
    data: ChangePasswordRequest,
    current_user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Change the authenticated user's password."""
    try:
        await auth_service.change_password(
            db, current_user, data.current_password, data.new_password
        )
        return {"message": "Password changed successfully."}
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
