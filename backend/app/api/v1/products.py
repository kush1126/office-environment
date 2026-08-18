import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import require_permission, require_company_access, get_company_id
from app.models.user import User
from app.schemas.common import PaginatedResponse, MessageResponse
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse, CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.audit_service import AuditService
from app.services.product_service import ProductService

router = APIRouter(prefix="/products", tags=["Products"])
product_service = ProductService()
audit_service = AuditService()

# --- Categories ---
@router.get("/categories", response_model=list[CategoryResponse])
async def list_categories(
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("products.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    categories = await product_service.list_categories(db, company_id)
    return [CategoryResponse.model_validate(c) for c in categories]

@router.post("/categories", response_model=CategoryResponse, status_code=status.HTTP_201_CREATED)
async def create_category(
    data: CategoryCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("products.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    category = await product_service.create_category(db, company_id, data)
    await audit_service.log(
        db, action="category.created", user_id=current_user.id, company_id=company_id,
        entity_type="Category", entity_id=category.id, new_value={"name": category.name}
    )
    await db.commit()
    return CategoryResponse.model_validate(category)

@router.patch("/categories/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: uuid.UUID,
    data: CategoryUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("products.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    category = await product_service.get_category(db, company_id, category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found.")
        
    old_val = {"name": category.name}
    category = await product_service.update_category(db, category, data)
    
    await audit_service.log(
        db, action="category.updated", user_id=current_user.id, company_id=company_id,
        entity_type="Category", entity_id=category_id, old_value=old_val,
        new_value=data.model_dump(exclude_unset=True)
    )
    await db.commit()
    return CategoryResponse.model_validate(category)


# --- Products ---
@router.get("", response_model=PaginatedResponse[ProductResponse])
async def list_products(
    company_id: uuid.UUID = Depends(get_company_id),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = Query(None),
    category_id: Optional[uuid.UUID] = Query(None),
    is_active: Optional[bool] = Query(None),
    current_user: User = Depends(require_permission("products.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    products, total = await product_service.list_products(
        db, company_id, page, page_size, search, category_id, is_active
    )
    items = [ProductResponse.model_validate(p) for p in products]
    return PaginatedResponse(
        items=items, total=total, page=page, page_size=page_size,
        total_pages=-(-total // page_size),
    )

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(
    data: ProductCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("products.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    product = await product_service.create_product(db, company_id, data, current_user)
    await audit_service.log(
        db, action="product.created", user_id=current_user.id, company_id=company_id,
        entity_type="Product", entity_id=product.id, new_value={"name": product.name, "sku": product.sku}
    )
    await db.commit()
    return ProductResponse.model_validate(product)

@router.get("/{product_id}", response_model=ProductResponse)
async def get_product(
    product_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("products.read")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    product = await product_service.get_by_id(db, company_id, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    return ProductResponse.model_validate(product)

@router.patch("/{product_id}", response_model=ProductResponse)
async def update_product(
    product_id: uuid.UUID,
    data: ProductUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("products.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    product = await product_service.get_by_id(db, company_id, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
    
    old_val = {"name": product.name, "sku": product.sku}
    product = await product_service.update_product(db, product, data)
    
    await audit_service.log(
        db, action="product.updated", user_id=current_user.id, company_id=company_id,
        entity_type="Product", entity_id=product_id, old_value=old_val,
        new_value=data.model_dump(exclude_unset=True)
    )
    await db.commit()
    return ProductResponse.model_validate(product)

@router.delete("/{product_id}", response_model=MessageResponse)
async def delete_product(
    product_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("products.write")),
    _: User = Depends(require_company_access("company_id")),
    db: AsyncSession = Depends(get_db),
):
    product = await product_service.get_by_id(db, company_id, product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")
        
    await product_service.delete_product(db, product, current_user)
    
    await audit_service.log(
        db, action="product.deleted", user_id=current_user.id, company_id=company_id,
        entity_type="Product", entity_id=product_id, old_value={"name": product.name}
    )
    await db.commit()
    return MessageResponse(message=f"Product '{product.name}' deleted.")
