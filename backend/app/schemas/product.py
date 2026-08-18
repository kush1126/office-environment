import uuid
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel, ConfigDict

# Categories
class CategoryBase(BaseModel):
    name: str
    parent_id: Optional[uuid.UUID] = None
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    pass

class CategoryUpdate(CategoryBase):
    name: Optional[str] = None

class CategoryResponse(CategoryBase):
    id: uuid.UUID
    company_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)

# Products
class ProductBase(BaseModel):
    sku: Optional[str] = None
    name: str
    category_id: Optional[uuid.UUID] = None
    description: Optional[str] = None
    unit: Optional[str] = None
    purchase_price: Optional[Decimal] = None
    selling_price: Optional[Decimal] = None
    gst_rate: Optional[Decimal] = None
    hsn_sac_code: Optional[str] = None
    primary_vendor_id: Optional[uuid.UUID] = None
    
    is_active: bool = True
    track_inventory: bool = True
    has_batches: bool = False
    has_expiry: bool = False
    has_serial_numbers: bool = False
    
    image_url: Optional[str] = None
    
    min_stock: Optional[Decimal] = None
    max_stock: Optional[Decimal] = None
    reorder_level: Optional[Decimal] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(ProductBase):
    name: Optional[str] = None

class ProductResponse(ProductBase):
    id: uuid.UUID
    company_id: uuid.UUID
    avg_purchase_price: Optional[Decimal] = None
    model_config = ConfigDict(from_attributes=True)
