import uuid
from typing import Optional, Tuple, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func

from app.models.user import User
from app.models import Product, Category
from app.schemas.product import ProductCreate, ProductUpdate, CategoryCreate, CategoryUpdate

class ProductService:
    # --- Categories ---
    async def list_categories(self, db: AsyncSession, company_id: uuid.UUID) -> Sequence[Category]:
        query = select(Category).where(Category.company_id == company_id).order_by(Category.name)
        result = await db.execute(query)
        return result.scalars().all()
        
    async def get_category(self, db: AsyncSession, company_id: uuid.UUID, category_id: uuid.UUID) -> Optional[Category]:
        query = select(Category).where(Category.id == category_id, Category.company_id == company_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()
        
    async def create_category(self, db: AsyncSession, company_id: uuid.UUID, data: CategoryCreate) -> Category:
        category = Category(**data.model_dump(), company_id=company_id)
        db.add(category)
        await db.flush()
        return category

    async def update_category(self, db: AsyncSession, category: Category, data: CategoryUpdate) -> Category:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(category, key, value)
        await db.flush()
        return category
        
    async def delete_category(self, db: AsyncSession, category: Category) -> None:
        await db.delete(category)
        await db.flush()

    # --- Products ---
    async def list_products(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, 
        search: Optional[str] = None, category_id: Optional[uuid.UUID] = None, is_active: Optional[bool] = None
    ) -> Tuple[Sequence[Product], int]:
        query = select(Product).where(Product.company_id == company_id, Product.deleted_at.is_(None))
        
        if is_active is not None:
            query = query.where(Product.is_active == is_active)
            
        if category_id is not None:
            query = query.where(Product.category_id == category_id)
            
        if search:
            search_term = f"%{search}%"
            query = query.where(
                or_(
                    Product.name.ilike(search_term),
                    Product.sku.ilike(search_term),
                    Product.description.ilike(search_term)
                )
            )
            
        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        # Paginate
        query = query.order_by(Product.name).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        products = result.scalars().all()
        
        return products, total

    async def get_by_id(self, db: AsyncSession, company_id: uuid.UUID, product_id: uuid.UUID) -> Optional[Product]:
        query = select(Product).where(
            Product.id == product_id, 
            Product.company_id == company_id,
            Product.deleted_at.is_(None)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_product(self, db: AsyncSession, company_id: uuid.UUID, data: ProductCreate, current_user: User) -> Product:
        product = Product(
            **data.model_dump(),
            company_id=company_id,
            created_by=current_user.id
        )
        db.add(product)
        await db.flush()
        return product

    async def update_product(self, db: AsyncSession, product: Product, data: ProductUpdate) -> Product:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(product, key, value)
        await db.flush()
        return product

    async def delete_product(self, db: AsyncSession, product: Product, current_user: User) -> None:
        await product.soft_delete(db, current_user.id)
        await db.flush()
