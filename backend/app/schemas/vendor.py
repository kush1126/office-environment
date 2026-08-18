import uuid
from typing import Optional
from pydantic import BaseModel, ConfigDict

class VendorBase(BaseModel):
    vendor_code: Optional[str] = None
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
    payment_terms_days: int = 30
    lead_time_days: Optional[int] = None
    is_active: bool = True
    notes: Optional[str] = None

class VendorCreate(VendorBase):
    pass

class VendorUpdate(VendorBase):
    name: Optional[str] = None

class VendorResponse(VendorBase):
    id: uuid.UUID
    company_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)
