import uuid
from typing import Optional, Tuple, Sequence
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import joinedload

from app.models.user import User
from app.models import Warehouse, Inventory, InventoryMovement
from app.schemas.inventory import WarehouseCreate, WarehouseUpdate, InventoryMovementCreate

class InventoryService:
    # --- Warehouses ---
    async def list_warehouses(self, db: AsyncSession, company_id: uuid.UUID) -> Sequence[Warehouse]:
        query = select(Warehouse).where(Warehouse.company_id == company_id).order_by(Warehouse.name)
        result = await db.execute(query)
        return result.scalars().all()

    async def get_warehouse(self, db: AsyncSession, company_id: uuid.UUID, warehouse_id: uuid.UUID) -> Optional[Warehouse]:
        query = select(Warehouse).where(Warehouse.id == warehouse_id, Warehouse.company_id == company_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_warehouse(self, db: AsyncSession, company_id: uuid.UUID, data: WarehouseCreate) -> Warehouse:
        if data.is_default:
            # Unset default on others
            await db.execute(
                select(Warehouse).where(Warehouse.company_id == company_id).with_only_columns(Warehouse.id)
            ) # Should do an update statement, simplified for now
        
        warehouse = Warehouse(**data.model_dump(), company_id=company_id)
        db.add(warehouse)
        await db.flush()
        return warehouse

    async def update_warehouse(self, db: AsyncSession, warehouse: Warehouse, data: WarehouseUpdate) -> Warehouse:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(warehouse, key, value)
        await db.flush()
        return warehouse

    # --- Inventory ---
    async def get_inventory_for_product(
        self, db: AsyncSession, company_id: uuid.UUID, product_id: uuid.UUID, warehouse_id: Optional[uuid.UUID] = None
    ) -> Sequence[Inventory]:
        query = select(Inventory).where(
            Inventory.company_id == company_id,
            Inventory.product_id == product_id
        )
        if warehouse_id:
            query = query.where(Inventory.warehouse_id == warehouse_id)
            
        result = await db.execute(query)
        return result.scalars().all()
        
    async def get_stock_level(
        self, db: AsyncSession, company_id: uuid.UUID, product_id: uuid.UUID, warehouse_id: Optional[uuid.UUID] = None
    ) -> Decimal:
        query = select(func.sum(Inventory.quantity)).where(
            Inventory.company_id == company_id,
            Inventory.product_id == product_id
        )
        if warehouse_id:
            query = query.where(Inventory.warehouse_id == warehouse_id)
            
        result = await db.execute(query)
        return result.scalar() or Decimal("0.0")

    # --- Movements ---
    async def record_movement(
        self, db: AsyncSession, company_id: uuid.UUID, data: InventoryMovementCreate, current_user: User
    ) -> InventoryMovement:
        # Find existing stock record or create one
        query = select(Inventory).where(
            Inventory.company_id == company_id,
            Inventory.product_id == data.product_id,
            Inventory.warehouse_id == data.warehouse_id
        )
        
        # In a real system, filter by batch_number/serial_number if applicable
        if data.batch_number:
            query = query.where(Inventory.batch_number == data.batch_number)
        else:
            query = query.where(Inventory.batch_number.is_(None))
            
        if data.serial_number:
            query = query.where(Inventory.serial_number == data.serial_number)
        else:
            query = query.where(Inventory.serial_number.is_(None))
            
        result = await db.execute(query)
        stock_record = result.scalar_one_or_none()
        
        quantity_before = stock_record.quantity if stock_record else Decimal("0.0")
        quantity_after = quantity_before + data.quantity_change
        
        if not stock_record:
            stock_record = Inventory(
                company_id=company_id,
                product_id=data.product_id,
                warehouse_id=data.warehouse_id,
                quantity=quantity_after,
                batch_number=data.batch_number,
                serial_number=data.serial_number
            )
            db.add(stock_record)
        else:
            stock_record.quantity = quantity_after

        movement = InventoryMovement(
            company_id=company_id,
            product_id=data.product_id,
            warehouse_id=data.warehouse_id,
            movement_type=data.movement_type,
            quantity_before=quantity_before,
            quantity_change=data.quantity_change,
            quantity_after=quantity_after,
            reference_type=data.reference_type,
            reference_id=data.reference_id,
            batch_number=data.batch_number,
            serial_number=data.serial_number,
            reason=data.reason,
            created_by=current_user.id
        )
        db.add(movement)
        await db.flush()
        
        return movement
        
    async def list_movements(
        self, db: AsyncSession, company_id: uuid.UUID, product_id: Optional[uuid.UUID] = None, page: int = 1, page_size: int = 25
    ) -> Tuple[Sequence[InventoryMovement], int]:
        query = select(InventoryMovement).where(InventoryMovement.company_id == company_id)
        
        if product_id:
            query = query.where(InventoryMovement.product_id == product_id)
            
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(InventoryMovement.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        
        return result.scalars().all(), total
