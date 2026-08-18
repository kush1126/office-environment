"""
Development seed script.
Creates:
  - System roles and permissions
  - Admin user
  - 2 companies (RSquare Services, KYP Pharma)
  - Sample non-admin users

Run with: python seed/seed.py
NEVER run in production.
"""
import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from app.core.config import settings
from app.core.security import hash_password
from app.models import *  # noqa


# ─── Permission Definitions ───────────────────────────────────────────────────

PERMISSIONS = [
    # Companies
    ("companies.read",    "View companies",           "companies"),
    ("companies.manage",  "Create/edit companies",    "companies"),
    # Users
    ("users.read",        "View users",               "users"),
    ("users.manage",      "Create/edit/assign users", "users"),
    # Customers
    ("customers.read",    "View customers",           "customers"),
    ("customers.write",   "Create/edit customers",    "customers"),
    # Vendors
    ("vendors.read",      "View vendors",             "vendors"),
    ("vendors.write",     "Create/edit vendors",      "vendors"),
    # Products
    ("products.read",     "View products",            "products"),
    ("products.write",    "Create/edit products",     "products"),
    # Inventory
    ("inventory.read",    "View inventory",           "inventory"),
    ("inventory.write",   "Record movements",         "inventory"),
    ("inventory.approve", "Approve adjustments",      "inventory"),
    # Sales
    ("sales.read",        "View sales",               "sales"),
    ("sales.write",       "Create/edit sales",        "sales"),
    ("sales.approve",     "Approve invoices",         "sales"),
    # Purchases
    ("purchases.read",    "View purchases",           "purchases"),
    ("purchases.write",   "Create/edit purchases",    "purchases"),
    ("purchases.approve", "Approve purchases",        "purchases"),
    # Finance
    ("finance.read",      "View payments/expenses",   "finance"),
    ("finance.write",     "Record payments",          "finance"),
    ("finance.approve",   "Approve payments",         "finance"),
    # GST
    ("gst.read",          "View GST records",         "gst"),
    ("gst.export",        "Export GST reports",       "gst"),
    # Documents
    ("documents.read",    "View documents",           "documents"),
    ("documents.write",   "Upload documents",         "documents"),
    ("documents.ocr_approve", "Approve OCR extractions", "documents"),
    # Files
    ("files.read",        "View file manager",        "files"),
    ("files.write",       "Upload/edit files",        "files"),
    ("files.delete",      "Delete files",             "files"),
    # Email
    ("email.read",        "View emails",              "email"),
    ("email.write",       "Send/reply emails",        "email"),
    # Websites
    ("websites.read",     "View website manager",     "websites"),
    ("websites.write",    "Edit website files",       "websites"),
    # Deploy
    ("deploy.staging",    "Deploy to staging",        "deploy"),
    ("deploy.production", "Deploy to production",     "deploy"),
    ("deploy.rollback",   "Rollback production",      "deploy"),
    # AI
    ("ai.read",           "Use AI assistant",         "ai"),
    ("ai.train",          "Manage AI training data",  "ai"),
    ("ai.promote_model",  "Promote AI models",        "ai"),
    # Reports
    ("reports.read",      "View reports",             "reports"),
    ("reports.export",    "Export reports",           "reports"),
    # Audit
    ("audit.read",        "View audit logs",          "audit"),
    # Secrets
    ("secrets.manage",    "Manage credentials/secrets", "secrets"),
    # Backup
    ("backup.create",     "Create backups",           "backup"),
    ("backup.restore",    "Restore from backups",     "backup"),
]

# ─── Role Definitions ─────────────────────────────────────────────────────────

ROLES = {
    "ADMIN": {
        "description": "Full system administrator",
        "permissions": [p[0] for p in PERMISSIONS],  # all permissions
        "is_system": True,
    },
    "MANAGER": {
        "description": "Business manager — approvals, reports, operations",
        "permissions": [
            "companies.read", "customers.read", "customers.write",
            "vendors.read", "vendors.write", "products.read", "products.write",
            "inventory.read", "inventory.write", "inventory.approve",
            "sales.read", "sales.write", "sales.approve",
            "purchases.read", "purchases.write", "purchases.approve",
            "finance.read", "finance.write", "finance.approve",
            "gst.read", "gst.export", "documents.read", "email.read",
            "websites.read", "reports.read", "reports.export", "ai.read",
        ],
        "is_system": True,
    },
    "ACCOUNTANT": {
        "description": "Finance, GST, payments",
        "permissions": [
            "companies.read", "customers.read", "vendors.read",
            "products.read", "inventory.read",
            "sales.read", "purchases.read",
            "finance.read", "finance.write", "finance.approve",
            "gst.read", "gst.export",
            "documents.read", "documents.write", "documents.ocr_approve",
            "reports.read", "reports.export",
        ],
        "is_system": True,
    },
    "INVENTORY": {
        "description": "Products, stock, purchases",
        "permissions": [
            "products.read", "products.write",
            "inventory.read", "inventory.write",
            "purchases.read", "purchases.write",
            "vendors.read",
        ],
        "is_system": True,
    },
    "STAFF": {
        "description": "Email, customers, quotations",
        "permissions": [
            "customers.read", "customers.write",
            "vendors.read", "products.read",
            "sales.read", "sales.write",
            "email.read", "email.write",
            "documents.read", "ai.read",
        ],
        "is_system": True,
    },
    "AI_ADMIN": {
        "description": "AI training, datasets, model management",
        "permissions": ["ai.read", "ai.train", "ai.promote_model"],
        "is_system": True,
    },
    "WEB_ADMIN": {
        "description": "Website files, Git, deployment",
        "permissions": [
            "websites.read", "websites.write",
            "deploy.staging", "deploy.production", "deploy.rollback",
            "backup.create", "backup.restore", "files.read", "files.write",
        ],
        "is_system": True,
    },
    "VIEWER": {
        "description": "Read-only access",
        "permissions": [
            "companies.read", "customers.read", "vendors.read",
            "products.read", "inventory.read", "sales.read",
            "purchases.read", "finance.read", "reports.read",
        ],
        "is_system": True,
    },
}


async def seed():
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as db:
        print("🌱 Seeding database...")

        # ─── Permissions ──────────────────────────────────────────────────────
        from sqlalchemy import select
        perm_map: dict[str, Permission] = {}
        for code, description, module in PERMISSIONS:
            result = await db.execute(select(Permission).where(Permission.code == code))
            perm = result.scalar_one_or_none()
            if not perm:
                perm = Permission(id=uuid.uuid4(), code=code, description=description, module=module)
                db.add(perm)
            perm_map[code] = perm
        await db.flush()
        print(f"  ✓ {len(perm_map)} permissions")

        # ─── Roles ────────────────────────────────────────────────────────────
        role_map: dict[str, Role] = {}
        from sqlalchemy.orm import selectinload
        for role_name, role_data in ROLES.items():
            result = await db.execute(select(Role).where(Role.name == role_name).options(selectinload(Role.permissions)))
            role = result.scalar_one_or_none()
            if not role:
                role = Role(
                    name=role_name,
                    description=role_data["description"],
                    is_system=role_data.get("is_system", False)
                )
                role.permissions = [perm_map[p] for p in role_data["permissions"] if p in perm_map]
                db.add(role)
                await db.flush()
            else:
                # Update permissions
                role.permissions = [perm_map[p] for p in role_data["permissions"] if p in perm_map]
            role_map[role_name] = role
        await db.flush()
        print(f"  ✓ {len(role_map)} roles")

        # ─── Companies ────────────────────────────────────────────────────────
        companies_data = [
            {
                "name": "RSquare Services",
                "legal_name": "RSquare Services",
                "gstin": None,
                "city": "Nagpur",
                "state": "Maharashtra",
                "currency": "INR",
                "timezone": "Asia/Kolkata",
            },
            {
                "name": "KYP Pharma",
                "legal_name": "KYP Pharma",
                "gstin": None,
                "city": "Nagpur",
                "state": "Maharashtra",
                "currency": "INR",
                "timezone": "Asia/Kolkata",
            },
        ]
        company_objs = []
        for cd in companies_data:
            result = await db.execute(select(Company).where(Company.name == cd["name"]))
            company = result.scalar_one_or_none()
            if not company:
                company = Company(
                    id=uuid.uuid4(),
                    **cd,
                    financial_year_start=4,
                    is_active=True,
                    created_at=datetime.now(timezone.utc),
                    updated_at=datetime.now(timezone.utc),
                )
                db.add(company)
            company_objs.append(company)
        await db.flush()
        print(f"  ✓ {len(company_objs)} companies")

        # ─── Admin User ───────────────────────────────────────────────────────
        result = await db.execute(select(User).where(User.username == "admin").options(selectinload(User.roles)))
        admin = result.scalar_one_or_none()
        if not admin:
            admin = User(
                id=uuid.uuid4(),
                username="admin",
                email="admin@officeos.local",
                password_hash=hash_password("Admin@123"),
                full_name="System Administrator",
                is_active=True,
                is_superuser=True,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                roles=[role_map["ADMIN"]],
            )
            db.add(admin)
            await db.flush()
            # Grant access to all companies
            for company in company_objs:
                access = UserCompanyAccess(
                    user_id=admin.id,
                    company_id=company.id,
                    is_primary=(company.name == "RSquare Services"),
                    granted_at=datetime.now(timezone.utc),
                )
                db.add(access)
            print("  ✓ Admin user created (username: admin, password: Admin@123)")
        else:
            print("  ✓ Admin user already exists")

        # ─── Sample Staff User ────────────────────────────────────────────────
        result = await db.execute(select(User).where(User.username == "staff").options(selectinload(User.roles)))
        staff = result.scalar_one_or_none()
        if not staff:
            staff = User(
                id=uuid.uuid4(),
                username="staff",
                email="staff@officeos.local",
                password_hash=hash_password("Staff@123"),
                full_name="Sample Staff User",
                is_active=True,
                is_superuser=False,
                created_at=datetime.now(timezone.utc),
                updated_at=datetime.now(timezone.utc),
                roles=[role_map["STAFF"]],
            )
            db.add(staff)
            await db.flush()
            # Grant access to RSquare only
            access = UserCompanyAccess(
                user_id=staff.id,
                company_id=company_objs[0].id,
                is_primary=True,
                granted_at=datetime.now(timezone.utc),
                granted_by=admin.id,
            )
            db.add(access)
            print("  ✓ Staff user created (username: staff, password: Staff@123)")

        await db.commit()
        print("\n✅ Seed complete!")
        print("\n  Admin credentials:")
        print("    Username: admin")
        print("    Password: Admin@123")
        print("\n  ⚠️  CHANGE THE ADMIN PASSWORD IMMEDIATELY AFTER FIRST LOGIN!")


if __name__ == "__main__":
    asyncio.run(seed())
