import uuid
from datetime import date
from typing import List, Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict, Field

# --- Purchase Orders ---
class PurchaseOrderItemBase(BaseModel):
    product_id: uuid.UUID
    quantity: Decimal
    unit_price: Decimal
    discount_amount: Decimal = Decimal("0.0")
    tax_rate: Decimal = Decimal("0.0")
    notes: Optional[str] = None

class PurchaseOrderItemCreate(PurchaseOrderItemBase):
    pass

class PurchaseOrderItemResponse(PurchaseOrderItemBase):
    id: uuid.UUID
    po_id: uuid.UUID
    tax_amount: Decimal
    total_amount: Decimal
    model_config = ConfigDict(from_attributes=True)

class PurchaseOrderBase(BaseModel):
    vendor_id: uuid.UUID
    po_number: str
    issue_date: date
    expected_delivery: Optional[date] = None
    status: str = "DRAFT"
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class PurchaseOrderCreate(PurchaseOrderBase):
    items: List[PurchaseOrderItemCreate]

class PurchaseOrderUpdate(BaseModel):
    status: Optional[str] = None
    expected_delivery: Optional[date] = None
    notes: Optional[str] = None

class PurchaseOrderResponse(PurchaseOrderBase):
    id: uuid.UUID
    company_id: uuid.UUID
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    created_by: Optional[uuid.UUID] = None
    items: List[PurchaseOrderItemResponse] = []
    model_config = ConfigDict(from_attributes=True)


# --- Bills (Purchase Invoices) ---
class BillItemBase(BaseModel):
    product_id: uuid.UUID
    quantity: Decimal
    unit_price: Decimal
    discount_amount: Decimal = Decimal("0.0")
    tax_rate: Decimal = Decimal("0.0")
    notes: Optional[str] = None

class BillItemCreate(BillItemBase):
    pass

class BillItemResponse(BillItemBase):
    id: uuid.UUID
    bill_id: uuid.UUID
    tax_amount: Decimal
    total_amount: Decimal
    model_config = ConfigDict(from_attributes=True)

class BillBase(BaseModel):
    vendor_id: uuid.UUID
    po_id: Optional[uuid.UUID] = None
    bill_number: str
    issue_date: date
    due_date: Optional[date] = None
    status: str = "DRAFT"
    notes: Optional[str] = None
    terms_conditions: Optional[str] = None

class BillCreate(BillBase):
    items: List[BillItemCreate]

class BillUpdate(BaseModel):
    status: Optional[str] = None
    due_date: Optional[date] = None
    notes: Optional[str] = None

class BillResponse(BillBase):
    id: uuid.UUID
    company_id: uuid.UUID
    subtotal: Decimal
    tax_total: Decimal
    discount_total: Decimal
    grand_total: Decimal
    amount_paid: Decimal
    created_by: Optional[uuid.UUID] = None
    items: List[BillItemResponse] = []
    model_config = ConfigDict(from_attributes=True)
