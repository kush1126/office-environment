import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission, get_company_id
from app.models.user import User
from app.schemas.websites import WebsiteCreate, WebsiteResponse, WebsiteUpdate, WebsiteDeploymentCreate, WebsiteDeploymentResponse
from app.services.website_service import WebsiteService
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/websites", tags=["Websites"])
website_service = WebsiteService()

@router.get("", response_model=PaginatedResponse[WebsiteResponse])
async def list_websites(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("websites.read")),
    db: AsyncSession = Depends(get_db)
):
    items, total = await website_service.list_websites(db, company_id, page, page_size, search)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("", response_model=WebsiteResponse, status_code=status.HTTP_201_CREATED)
async def create_website(
    data: WebsiteCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("websites.write")),
    db: AsyncSession = Depends(get_db)
):
    website = await website_service.create_website(db, company_id, data)
    await db.commit()
    return website

@router.get("/{website_id}", response_model=WebsiteResponse)
async def get_website(
    website_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("websites.read")),
    db: AsyncSession = Depends(get_db)
):
    website = await website_service.get_website(db, company_id, website_id)
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    return website

@router.patch("/{website_id}", response_model=WebsiteResponse)
async def update_website(
    website_id: uuid.UUID,
    data: WebsiteUpdate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("websites.write")),
    db: AsyncSession = Depends(get_db)
):
    website = await website_service.get_website(db, company_id, website_id)
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
    website = await website_service.update_website(db, website, data)
    await db.commit()
    return website

@router.post("/{website_id}/deployments", response_model=WebsiteDeploymentResponse, status_code=status.HTTP_201_CREATED)
async def create_deployment(
    website_id: uuid.UUID,
    data: WebsiteDeploymentCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("websites.write")),
    db: AsyncSession = Depends(get_db)
):
    website = await website_service.get_website(db, company_id, website_id)
    if not website:
        raise HTTPException(status_code=404, detail="Website not found")
        
    deployment = await website_service.create_deployment(db, website_id, data, current_user)
    await db.commit()
    return deployment
