"""User and Role Pydantic schemas."""
import uuid
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator

from app.core.security import validate_password_strength


# ─── Permission Schemas ───────────────────────────────────────────────────────

class PermissionResponse(BaseModel):
    id: uuid.UUID
    code: str
    description: Optional[str]
    module: Optional[str]
    model_config = ConfigDict(from_attributes=True)


# ─── Role Schemas ─────────────────────────────────────────────────────────────

class RoleCreate(BaseModel):
    name: str
    description: Optional[str] = None
    permission_ids: List[uuid.UUID] = []


class RoleUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    permission_ids: Optional[List[uuid.UUID]] = None


class RoleResponse(BaseModel):
    id: uuid.UUID
    name: str
    description: Optional[str]
    is_system: bool
    permissions: List[PermissionResponse] = []
    model_config = ConfigDict(from_attributes=True)


# ─── User Schemas ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    role_ids: List[uuid.UUID] = []
    company_ids: List[uuid.UUID] = []

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        valid, msg = validate_password_strength(v)
        if not valid:
            raise ValueError(msg)
        return v

    @field_validator("username")
    @classmethod
    def validate_username(cls, v):
        if len(v) < 3:
            raise ValueError("Username must be at least 3 characters.")
        if not v.replace("_", "").replace("-", "").isalnum():
            raise ValueError("Username may only contain letters, numbers, hyphens, and underscores.")
        return v.lower()


class UserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserAssignRoles(BaseModel):
    role_ids: List[uuid.UUID]


class UserAssignCompanies(BaseModel):
    company_ids: List[uuid.UUID]
    primary_company_id: Optional[uuid.UUID] = None


class UserSummary(BaseModel):
    """Compact user representation for lists."""
    id: uuid.UUID
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    roles: List[str] = []
    last_login: Optional[datetime]
    model_config = ConfigDict(from_attributes=True)


class UserResponse(BaseModel):
    """Full user detail response."""
    id: uuid.UUID
    username: str
    email: str
    full_name: Optional[str]
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    roles: List[RoleResponse] = []
    permissions: List[str] = []
    company_ids: List[uuid.UUID] = []
    model_config = ConfigDict(from_attributes=True)
