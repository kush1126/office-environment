import uuid
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

class CustomerBase(BaseModel):
    customer_code: Optional[str] = None
    name: str
    contact_person: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    gstin: Optional[str] = None
    pan: Optional[str] = None
    credit_limit: Optional[Decimal] = None
    payment_terms_days: int = 30
    is_active: bool = True
    notes: Optional[str] = None

class CustomerCreate(CustomerBase):
    pass

class CustomerUpdate(CustomerBase):
    name: Optional[str] = None

class CustomerResponse(CustomerBase):
    id: uuid.UUID
    company_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)
