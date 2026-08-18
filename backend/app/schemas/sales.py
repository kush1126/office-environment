import uuid
from datetime import date
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

# --- Quotations ---
class QuotationItemBase(BaseModel):
    product_id: uuid.UUID
    quantity: Decimal
    unit_price: Decimal
    discount_amount: Decimal = Decimal("0.0")
    tax_rate: Decimal = Decimal("0.0")
    notes: Optional[str] = None

class QuotationItemCreate(QuotationItemBase):
    pass

class QuotationItemResponse(QuotationItemBase):
    id: uuid.UUID
    quotation_id: uuid.UUID
    tax_amount: Decimal
    total_amount: Decimal
    model_config = ConfigDict(from_attributes=True)

class QuotationBase(BaseModel):
    customer_id: uuid.UUID
    quotation_number: str
    issue_date: date
    valid_until: Optional[date] = None
    status: str = "DRAFT"
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class QuotationCreate(QuotationBase):
    items: List[QuotationItemCreate]

class QuotationUpdate(BaseModel):
    status: Optional[str] = None
    valid_until: Optional[date] = None
    notes: Optional[str] = None

class QuotationResponse(QuotationBase):
    id: uuid.UUID
    company_id: uuid.UUID
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    created_by: Optional[uuid.UUID] = None
    items: List[QuotationItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


# --- Invoices ---
class InvoiceItemBase(BaseModel):
    product_id: uuid.UUID
    quantity: Decimal
    unit_price: Decimal
    discount_amount: Decimal = Decimal("0.0")
    tax_rate: Decimal = Decimal("0.0")
    notes: Optional[str] = None

class InvoiceItemCreate(InvoiceItemBase):
    pass

class InvoiceItemResponse(InvoiceItemBase):
    id: uuid.UUID
    invoice_id: uuid.UUID
    tax_amount: Decimal
    total_amount: Decimal
    model_config = ConfigDict(from_attributes=True)

class InvoiceBase(BaseModel):
    customer_id: uuid.UUID
    quotation_id: Optional[uuid.UUID] = None
    invoice_number: str
    issue_date: date
    due_date: Optional[date] = None
    status: str = "DRAFT"
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class InvoiceCreate(InvoiceBase):
    items: List[InvoiceItemCreate]

class InvoiceUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

class InvoiceResponse(InvoiceBase):
    id: uuid.UUID
    company_id: uuid.UUID
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    amount_paid: Decimal
    created_by: Optional[uuid.UUID] = None
    items: List[InvoiceItemResponse] = []
    model_config = ConfigDict(from_attributes=True)
