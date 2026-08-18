import uuid
from datetime import date
from typing import Optional, List
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

# --- Payments ---
class PaymentBase(BaseModel):
    payment_type: str # IN, OUT
    customer_id: Optional[uuid.UUID] = None
    vendor_id: Optional[uuid.UUID] = None
    invoice_id: Optional[uuid.UUID] = None
    bill_id: Optional[uuid.UUID] = None
    payment_number: str
    payment_date: date
    amount: Decimal
    payment_mode: str
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentCreate(PaymentBase):
    pass

class PaymentUpdate(BaseModel):
    amount: Optional[Decimal] = None
    payment_mode: Optional[str] = None
    reference_number: Optional[str] = None
    notes: Optional[str] = None

class PaymentResponse(PaymentBase):
    id: uuid.UUID
    company_id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)


# --- Expense Categories ---
class ExpenseCategoryBase(BaseModel):
    name: str
    description: Optional[str] = None

class ExpenseCategoryCreate(ExpenseCategoryBase):
    pass

class ExpenseCategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class ExpenseCategoryResponse(ExpenseCategoryBase):
    id: uuid.UUID
    company_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)


# --- Expenses ---
class ExpenseBase(BaseModel):
    category_id: uuid.UUID
    expense_number: str
    expense_date: date
    amount: Decimal
    paid_to: Optional[str] = None
    payment_mode: str
    reference_number: Optional[str] = None
    description: Optional[str] = None
    receipt_path: Optional[str] = None

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    category_id: Optional[uuid.UUID] = None
    amount: Optional[Decimal] = None
    paid_to: Optional[str] = None
    payment_mode: Optional[str] = None
    reference_number: Optional[str] = None
    description: Optional[str] = None
    receipt_path: Optional[str] = None

class ExpenseResponse(ExpenseBase):
    id: uuid.UUID
    company_id: uuid.UUID
    created_by: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)


# --- GST Reports ---
class GSTReportEntry(BaseModel):
    document_type: str # INVOICE, BILL
    document_number: str
    date: date
    party_name: str
    party_gstin: Optional[str] = None
    subtotal: Decimal
    tax_total: Decimal
    grand_total: Decimal

class GSTReportResponse(BaseModel):
    company_id: uuid.UUID
    period_start: date
    period_end: date
    total_sales: Decimal
    total_sales_tax: Decimal # Output Tax
    total_purchases: Decimal
    total_purchases_tax: Decimal # Input Tax
    net_tax_payable: Decimal
    entries: List[GSTReportEntry]
