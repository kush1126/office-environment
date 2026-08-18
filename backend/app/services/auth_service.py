"""Authentication service: login, token refresh, logout, password change."""
import hashlib
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

import structlog
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    validate_password_strength,
    hash_password,
)
from app.models.user import User, Session
from app.schemas.auth import AuthUserResponse

log = structlog.get_logger()
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 30


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


class AuthService:

    async def authenticate(
        self,
        db: AsyncSession,
        username: str,
        password: str,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
    ) -> tuple[str, str, User]:
        """Authenticate user. Returns (access_token, refresh_token, user)."""
        username_clean = username.strip().lower()
        result = await db.execute(
            select(User).where(
                (User.username == username_clean) | (User.email == username_clean)
            )
        )
        user = result.scalar_one_or_none()

        if not user:
            raise ValueError("Invalid username or password.")

        # Check lockout
        if user.locked_until and user.locked_until > datetime.now(timezone.utc):
            remaining = (user.locked_until - datetime.now(timezone.utc)).seconds // 60
            raise ValueError(f"Account temporarily locked. Try again in {remaining} minutes.")

        if not verify_password(password, user.password_hash):
            user.failed_login_attempts += 1
            if user.failed_login_attempts >= MAX_FAILED_ATTEMPTS:
                user.locked_until = datetime.now(timezone.utc) + timedelta(minutes=LOCKOUT_MINUTES)
                log.warning("auth.account_locked", username=username)
            await db.commit()
            raise ValueError("Invalid username or password.")

        if not user.is_active:
            raise ValueError("Account is disabled. Contact administrator.")

        # Successful login — reset failed attempts
        user.failed_login_attempts = 0
        user.locked_until = None
        user.last_login = datetime.now(timezone.utc)

        access_token = create_access_token(user.id)
        refresh_token = create_refresh_token(user.id)

        # Store session
        from app.core.config import settings
        session = Session(
            user_id=user.id,
            refresh_token_hash=_hash_token(refresh_token),
            ip_address=ip_address,
            user_agent=user_agent,
            expires_at=datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
            created_at=datetime.now(timezone.utc),
        )
        db.add(session)
        await db.commit()

        log.info("auth.login_success", user_id=str(user.id), username=user.username)
        return access_token, refresh_token, user

    async def refresh_access_token(self, db: AsyncSession, refresh_token: str) -> str:
        """Validate refresh token and issue new access token."""
        from jose import JWTError
        try:
            payload = decode_token(refresh_token)
            if payload.get("type") != "refresh":
                raise ValueError("Invalid token type.")
            user_id = payload.get("sub")
        except JWTError:
            raise ValueError("Invalid or expired refresh token.")

        token_hash = _hash_token(refresh_token)
        result = await db.execute(
            select(Session).where(Session.refresh_token_hash == token_hash)
        )
        session = result.scalar_one_or_none()

        if not session or not session.is_valid:
            raise ValueError("Session expired or revoked.")

        return create_access_token(uuid.UUID(user_id))

    async def logout(self, db: AsyncSession, refresh_token: str) -> None:
        """Revoke session associated with refresh token."""
        token_hash = _hash_token(refresh_token)
        result = await db.execute(
            select(Session).where(Session.refresh_token_hash == token_hash)
        )
        session = result.scalar_one_or_none()
        if session:
            session.revoked_at = datetime.now(timezone.utc)
            await db.commit()

    async def change_password(
        self, db: AsyncSession, user: User, current_password: str, new_password: str
    ) -> None:
        """Change user password after verifying current password."""
        if not verify_password(current_password, user.password_hash):
            raise ValueError("Current password is incorrect.")
        valid, msg = validate_password_strength(new_password)
        if not valid:
            raise ValueError(msg)
        user.password_hash = hash_password(new_password)
        await db.commit()
        log.info("auth.password_changed", user_id=str(user.id))

    def build_auth_response(self, user: User) -> AuthUserResponse:
        """Build the auth user response from the ORM user object."""
        company_ids = [ca.company_id for ca in user.company_access]
        primary = next((ca.company_id for ca in user.company_access if ca.is_primary), None)
        return AuthUserResponse(
            id=user.id,
            username=user.username,
            email=user.email,
            full_name=user.full_name,
            is_active=user.is_active,
            is_superuser=user.is_superuser,
            roles=user.role_names,
            permissions=list(user.permission_codes),
            company_ids=company_ids,
            primary_company_id=primary,
        )
