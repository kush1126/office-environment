import uuid
from typing import Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_permission, require_company_access, get_company_id
from app.models.user import User
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.inventory import (
    WarehouseCreate, WarehouseUpdate, WarehouseResponse,
    InventoryResponse, InventoryMovementCreate, InventoryMovementResponse
)
from app.services.audit_service import AuditService
from app.services.inventory_service import InventoryService

router = APIRouter(prefix="/inventory", tags=["Inventory"])
inventory_service = InventoryService()
audit_service = AuditService()

# --- Warehouses ---
@router.get("/warehouses", response_model=list[WarehouseResponse])
async def list_warehouses(
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("inventory.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    warehouses = await inventory_service.list_warehouses(db, company_id)
    return [WarehouseResponse.model_validate(w) for w in warehouses]

@router.post("/warehouses", response_model=WarehouseResponse, status_code=status.HTTP_201_CREATED)
async def create_warehouse(
    data: WarehouseCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("inventory.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    warehouse = await inventory_service.create_warehouse(db, company_id, data)
    await audit_service.log(
        db, action="warehouse.created", user_id=current_user.id, company_id=company_id,
        entity_type="Warehouse", entity_id=warehouse.id, new_value={"name": warehouse.name}
    )
    await db.commit()
    return WarehouseResponse.model_validate(warehouse)

@router.patch("/warehouses/{warehouse_id}", response_model=WarehouseResponse)
async def update_warehouse(
    warehouse_id: uuid.UUID,
    data: WarehouseUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("inventory.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    warehouse = await inventory_service.get_warehouse(db, company_id, warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found.")
        
    old_val = {"name": warehouse.name}
    warehouse = await inventory_service.update_warehouse(db, warehouse, data)
    
    await audit_service.log(
        db, action="warehouse.updated", user_id=current_user.id, company_id=company_id,
        entity_type="Warehouse", entity_id=warehouse_id, old_value=old_val,
        new_value=data.model_dump(exclude_unset=True)
    )
    await db.commit()
    return WarehouseResponse.model_validate(warehouse)


# --- Inventory & Stock ---
@router.get("/stock/{product_id}", response_model=list[InventoryResponse])
async def get_product_stock(
    product_id: uuid.UUID,
    warehouse_id: Optional[uuid.UUID] = Query(None),
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("inventory.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    stock_records = await inventory_service.get_inventory_for_product(db, company_id, product_id, warehouse_id)
    return [InventoryResponse.model_validate(record) for record in stock_records]

@router.get("/stock-level/{product_id}", response_model=Decimal)
async def get_product_stock_level(
    product_id: uuid.UUID,
    warehouse_id: Optional[uuid.UUID] = Query(None),
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("inventory.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    level = await inventory_service.get_stock_level(db, company_id, product_id, warehouse_id)
    return level


# --- Movements ---
@router.get("/movements", response_model=PaginatedResponse[InventoryMovementResponse])
async def list_movements(
    product_id: Optional[uuid.UUID] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("inventory.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    movements, total = await inventory_service.list_movements(db, company_id, product_id, page, page_size)
    items = [InventoryMovementResponse.model_validate(m) for m in movements]
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=-(-total // page_size),
    )

@router.post("/movements/adjust", response_model=InventoryMovementResponse)
async def adjust_stock(
    data: InventoryMovementCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("inventory.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    # This endpoint is for manual adjustments (ADJUSTMENT, DAMAGE)
    if data.movement_type not in ["ADJUSTMENT", "DAMAGE"]:
        raise HTTPException(status_code=400, detail="Use specific endpoints for sales/purchases.")
        
    movement = await inventory_service.record_movement(db, company_id, data, current_user)
    
    await audit_service.log(
        db, action="inventory.adjusted", user_id=current_user.id, company_id=company_id,
        entity_type="InventoryMovement", entity_id=movement.id, 
        new_value={"product_id": str(data.product_id), "change": str(data.quantity_change)}
    )
    await db.commit()
    return InventoryMovementResponse.model_validate(movement)
