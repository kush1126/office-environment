"""Auth request/response Pydantic schemas."""
import uuid
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.core.config import settings


class LoginRequest(BaseModel):
    username: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60

    model_config = ConfigDict(from_attributes=True)


class RefreshRequest(BaseModel):
    refresh_token: str


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        from app.core.security import validate_password_strength
        valid, msg = validate_password_strength(v)
        if not valid:
            raise ValueError(msg)
        return v


class AuthUserResponse(BaseModel):
    """Current user info returned after login or /me."""
    id: uuid.UUID
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_superuser: bool
    roles: List[str]
    permissions: List[str]
    company_ids: List[uuid.UUID]
    primary_company_id: Optional[uuid.UUID]

    model_config = ConfigDict(from_attributes=True)
