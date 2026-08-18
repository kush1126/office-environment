"""Company Pydantic schemas."""
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, field_validator


class CompanyCreate(BaseModel):
    name: str
    legal_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    financial_year_start: int = 4
    currency: str = "INR"
    timezone: str = "Asia/Kolkata"

    @field_validator("gstin")
    @classmethod
    def validate_gstin(cls, v):
        if v and len(v) != 15:
            raise ValueError("GSTIN must be exactly 15 characters.")
        return v.upper() if v else v

    @field_validator("pan")
    @classmethod
    def validate_pan(cls, v):
        if v and len(v) != 10:
            raise ValueError("PAN must be exactly 10 characters.")
        return v.upper() if v else v


class CompanyUpdate(BaseModel):
    name: Optional[str] = None
    legal_name: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[EmailStr] = None
    website: Optional[str] = None
    is_active: Optional[bool] = None


class CompanySummary(BaseModel):
    id: uuid.UUID
    name: str
    legal_name: Optional[str]
    gstin: Optional[str]
    city: Optional[str]
    state: Optional[str]
    is_active: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)


class CompanyResponse(BaseModel):
    id: uuid.UUID
    name: str
    legal_name: Optional[str]
    gstin: Optional[str]
    pan: Optional[str]
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    pincode: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    website: Optional[str]
    logo_path: Optional[str]
    financial_year_start: int
    currency: str
    timezone: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
