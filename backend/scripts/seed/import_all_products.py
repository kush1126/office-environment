import asyncio
import json
import os
import shutil
import uuid
import sys
from decimal import Decimal

# Add the parent directory to the python path to allow importing app modules
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import AsyncSessionLocal
from app.models.company import Company
from app.models.erp.product import Product, Category
from app.models.files import Document
from app.models.user import User


async def import_products():
    print("Starting product import...")
    
    async with AsyncSessionLocal() as db:
        # Get first company
        result = await db.execute(select(Company).limit(1))
        company = result.scalar_one_or_none()
        
        if not company:
            print("No company found in database. Please seed the database first.")
            return

        # Get first user for created_by
        result = await db.execute(select(User).limit(1))
        user = result.scalar_one_or_none()
        
        if not user:
            print("No user found.")
            return

        print(f"Importing products for Company: {company.name}")
        
        storage_dir = os.path.join(os.getcwd(), "storage", str(company.id))
        os.makedirs(storage_dir, exist_ok=True)

        async def get_or_create_category(name: str, parent_id: uuid.UUID = None) -> uuid.UUID:
            if not name:
                name = "General"
            
            query = select(Category).where(
                Category.company_id == company.id,
                Category.name == name
            )
            result = await db.execute(query)
            cat = result.scalar_one_or_none()
            
            if not cat:
                cat = Category(
                    company_id=company.id,
                    name=name,
                    parent_id=parent_id
                )
                db.add(cat)
                await db.flush()
            return cat.id

        async def process_json(filepath: str, source_folder: str):
            if not os.path.exists(filepath):
                print(f"File not found: {filepath}")
                return

            with open(filepath, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            products = data.get('products', [])
            if not products:
                # RSquare might just be a list?
                if isinstance(data, list):
                    products = data
                elif isinstance(data, dict):
                    # check if 'products' is not the key, maybe some other structure
                    for k, v in data.items():
                        if isinstance(v, list) and len(v) > 0 and 'name' in v[0]:
                            products = v
                            break

            print(f"Found {len(products)} products in {filepath}")
            count = 0
            
            for p in products:
                try:
                    sku = p.get('id', p.get('sku', str(uuid.uuid4())[:8]))
                    name = p.get('name', 'Unknown Product')
                    desc = p.get('description', p.get('shortDesc', ''))
                    
                    master_cat_name = p.get('masterCategory', p.get('category', 'Uncategorized'))
                    sub_cat_name = p.get('subcategory', p.get('subCategory', None))
                    
                    master_cat_id = await get_or_create_category(master_cat_name)
                    cat_id = master_cat_id
                    if sub_cat_name:
                        cat_id = await get_or_create_category(sub_cat_name, master_cat_id)
                        
                    # Handle images
                    image_url = None
                    images = p.get('images', [])
                    if images and len(images) > 0:
                        img_rel_path = images[0]
                        img_abs_path = os.path.join(source_folder, img_rel_path.replace('/', '\\'))
                        
                        if os.path.exists(img_abs_path):
                            ext = os.path.splitext(img_abs_path)[1]
                            safe_filename = f"{uuid.uuid4().hex}{ext}"
                            dest_path = os.path.join(storage_dir, safe_filename)
                            
                            shutil.copy2(img_abs_path, dest_path)
                            
                            doc = Document(
                                company_id=company.id,
                                filename=safe_filename,
                                original_name=os.path.basename(img_abs_path),
                                mime_type="image/jpeg", # simplified
                                size_bytes=os.path.getsize(dest_path),
                                storage_path=dest_path,
                                category="product_images",
                                uploaded_by=user.id
                            )
                            db.add(doc)
                            await db.flush()
                            image_url = f"/api/v1/files/{doc.id}/download"
                    
                    # Check if exists
                    res = await db.execute(select(Product).where(Product.company_id == company.id, Product.sku == sku))
                    existing = res.scalar_one_or_none()
                    
                    if not existing:
                        new_product = Product(
                            company_id=company.id,
                            sku=sku,
                            name=name,
                            description=desc,
                            category_id=cat_id,
                            unit="pcs",
                            purchase_price=Decimal("0.00"),
                            selling_price=Decimal("0.00"),
                            image_url=image_url,
                            created_by=user.id,
                            is_active=True,
                            track_inventory=True
                        )
                        db.add(new_product)
                        count += 1
                    else:
                        existing.image_url = image_url
                        
                except Exception as e:
                    print(f"Error processing product {p.get('name')}: {e}")
            
            await db.commit()
            print(f"Successfully inserted {count} new products from {source_folder}")

        # Process KYP Pharma
        await process_json(
            "C:/Users/Kush Maurya/OneDrive/Desktop/kyppharma/data.json",
            "C:/Users/Kush Maurya/OneDrive/Desktop/kyppharma"
        )
        
        # Process RSquare Services
        await process_json(
            "C:/Users/Kush Maurya/OneDrive/Desktop/rsquare_backup/rsquare_data.json",
            "C:/Users/Kush Maurya/OneDrive/Desktop/rsquare_backup"
        )

        print("Import completed!")

if __name__ == "__main__":
    asyncio.run(import_products())
