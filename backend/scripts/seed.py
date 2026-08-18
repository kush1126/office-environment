import asyncio
import sys
import os
import uuid
from decimal import Decimal
from datetime import datetime, timezone

# Add the backend directory to sys.path so we can import app
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.database import AsyncSessionLocal, engine, Base
from app.core.security import hash_password
from app.models import (
    User, Company, UserCompanyAccess, Role, user_roles_table,
    Product, Warehouse, Category, Inventory,
    Customer, Quotation, QuotationItem, Invoice, InvoiceItem
)
from sqlalchemy import select

async def seed_data():
    print("Starting database seeder...")
    
    # 1. Create tables if they don't exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        # Check if already seeded
        result = await db.execute(select(User).where(User.email == "admin@rsquare.com"))
        if result.scalar_one_or_none():
            print("Database is already seeded. Exiting.")
            return

        print("Creating Companies...")
        rsquare = Company(id=uuid.uuid4(), name="RSquare Services")
        kyp = Company(id=uuid.uuid4(), name="KYP Pharma")
        db.add_all([rsquare, kyp])
        await db.flush()

        print("Creating Roles...")
        admin_role = Role(id=uuid.uuid4(), name="Admin", description="Full access")
        manager_role = Role(id=uuid.uuid4(), name="Manager", description="Manager access")
        db.add_all([admin_role, manager_role])
        await db.flush()

        print("Creating Users...")
        admin_user = User(
            id=uuid.uuid4(),
            email="admin@rsquare.com",
            username="admin",
            password_hash=hash_password("admin123"),
            full_name="Admin User",
            is_active=True,
            is_superuser=True
        )
        # Manually add to association table later, or just append if relationship was set up
        db.add(admin_user)
        await db.flush()
        
        # Give admin access to both companies
        access1 = UserCompanyAccess(user_id=admin_user.id, company_id=rsquare.id, granted_at=datetime.now(timezone.utc))
        access2 = UserCompanyAccess(user_id=admin_user.id, company_id=kyp.id, granted_at=datetime.now(timezone.utc))
        db.add_all([access1, access2])
        await db.flush()
        
        # Add role to user
        await db.execute(user_roles_table.insert().values(user_id=admin_user.id, role_id=admin_role.id))

        print("Creating Inventory Data...")
        # Categories
        cat_software = Category(id=uuid.uuid4(), company_id=rsquare.id, name="Software Services")
        cat_hardware = Category(id=uuid.uuid4(), company_id=rsquare.id, name="Hardware")
        cat_meds = Category(id=uuid.uuid4(), company_id=kyp.id, name="Medicines")
        db.add_all([cat_software, cat_hardware, cat_meds])
        await db.flush()

        # Warehouses
        wh_hq = Warehouse(id=uuid.uuid4(), company_id=rsquare.id, name="HQ Server Room")
        wh_pharma = Warehouse(id=uuid.uuid4(), company_id=kyp.id, name="Main Storage")
        db.add_all([wh_hq, wh_pharma])
        await db.flush()

        # Products
        p1 = Product(
            id=uuid.uuid4(), company_id=rsquare.id, category_id=cat_software.id, 
            name="Cloud Hosting Package", sku="SW-001", selling_price=Decimal("5000.00"), purchase_price=Decimal("2000.00")
        )
        p2 = Product(
            id=uuid.uuid4(), company_id=rsquare.id, category_id=cat_hardware.id, 
            name="Server Rack", sku="HW-001", selling_price=Decimal("25000.00"), purchase_price=Decimal("15000.00"), reorder_level=5
        )
        p3 = Product(
            id=uuid.uuid4(), company_id=kyp.id, category_id=cat_meds.id, 
            name="Paracetamol 500mg", sku="MED-001", selling_price=Decimal("50.00"), purchase_price=Decimal("20.00"), reorder_level=100
        )
        db.add_all([p1, p2, p3])
        await db.flush()

        # Inventory
        inv1 = Inventory(id=uuid.uuid4(), company_id=rsquare.id, product_id=p2.id, warehouse_id=wh_hq.id, quantity=3) # Low stock alert!
        inv2 = Inventory(id=uuid.uuid4(), company_id=kyp.id, product_id=p3.id, warehouse_id=wh_pharma.id, quantity=500)
        db.add_all([inv1, inv2])
        await db.flush()

        print("Creating Sales Data...")
        cust1 = Customer(id=uuid.uuid4(), company_id=rsquare.id, name="Acme Corp", email="contact@acme.com")
        db.add(cust1)
        await db.flush()

        inv = Invoice(
            id=uuid.uuid4(), company_id=rsquare.id, customer_id=cust1.id, 
            invoice_number="INV-2026-001", issue_date=datetime.now(timezone.utc).date(), subtotal=Decimal("30000.00"), 
            tax_total=Decimal("5400.00"), grand_total=Decimal("35400.00"), 
            amount_paid=Decimal("0.00"), status="ISSUED"
        )
        db.add(inv)
        await db.flush()

        inv_item1 = InvoiceItem(
            id=uuid.uuid4(), invoice_id=inv.id, product_id=p1.id, 
            notes="Cloud Hosting", quantity=1, unit_price=Decimal("5000.00"), total_amount=Decimal("5000.00")
        )
        inv_item2 = InvoiceItem(
            id=uuid.uuid4(), invoice_id=inv.id, product_id=p2.id, 
            notes="Server Rack", quantity=1, unit_price=Decimal("25000.00"), total_amount=Decimal("25000.00")
        )
        db.add_all([inv_item1, inv_item2])

        await db.commit()
        print("Database seeded successfully!")
        print("\nLogin Credentials:")
        print("Email: admin@rsquare.com")
        print("Password: admin123")

if __name__ == "__main__":
    # Windows fix for asyncio loop
    if sys.platform == 'win32':
        asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
    asyncio.run(seed_data())
