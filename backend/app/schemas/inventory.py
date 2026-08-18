import uuid
from typing import Optional
from decimal import Decimal
from datetime import date, datetime
from pydantic import BaseModel, ConfigDict

# Warehouses
class WarehouseBase(BaseModel):
    name: str
    address: Optional[str] = None
    is_default: bool = False
    is_active: bool = True

class WarehouseCreate(WarehouseBase):
    pass

class WarehouseUpdate(WarehouseBase):
    name: Optional[str] = None

class WarehouseResponse(WarehouseBase):
    id: uuid.UUID
    company_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

# Inventory
class InventoryResponse(BaseModel):
    id: uuid.UUID
    company_id: uuid.UUID
    product_id: uuid.UUID
    warehouse_id: uuid.UUID
    quantity: Decimal
    reserved_quantity: Decimal
    batch_number: Optional[str] = None
    expiry_date: Optional[date] = None
    serial_number: Optional[str] = None
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

# Inventory Movements
class InventoryMovementBase(BaseModel):
    product_id: uuid.UUID
    warehouse_id: uuid.UUID
    movement_type: str  # PURCHASE, SALE, RETURN_IN, RETURN_OUT, ADJUSTMENT, DAMAGE, TRANSFER
    quantity_change: Decimal
    reference_type: Optional[str] = None
    reference_id: Optional[uuid.UUID] = None
    batch_number: Optional[str] = None
    serial_number: Optional[str] = None
    reason: Optional[str] = None

class InventoryMovementCreate(InventoryMovementBase):
    pass

class InventoryMovementResponse(InventoryMovementBase):
    id: uuid.UUID
    company_id: uuid.UUID
    quantity_before: Decimal
    quantity_after: Decimal
    created_by: Optional[uuid.UUID] = None
    created_at: datetime
    approved_by: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)
