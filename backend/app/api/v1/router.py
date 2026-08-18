"""Main API v1 router — combines all sub-routers."""
from fastapi import APIRouter
from app.api.v1 import auth, users, companies, dashboard, customers, vendors, products, inventory

api_router = APIRouter()
api_router.include_router(auth.router)
api_router.include_router(users.router)
api_router.include_router(companies.router)
api_router.include_router(dashboard.router)
api_router.include_router(customers.router)
api_router.include_router(vendors.router)
api_router.include_router(products.router)
api_router.include_router(inventory.router)

from app.api.v1 import sales, procurement, finance, gst, files, websites, email, analytics, ai, deploy
api_router.include_router(sales.router)
api_router.include_router(procurement.router)
api_router.include_router(finance.router)
api_router.include_router(gst.router)
api_router.include_router(files.router)
api_router.include_router(websites.router)
api_router.include_router(email.router)
api_router.include_router(analytics.router)
api_router.include_router(ai.router)
api_router.include_router(deploy.router)

# Future phases will add more routers here:
# from app.api.v1 import customers, vendors, products, inventory, ...
# api_router.include_router(customers.router)
