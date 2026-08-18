import uuid
from typing import Optional, Tuple, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload

from app.models.user import User
from app.models.websites import Website, WebsiteDeployment
from app.schemas.websites import WebsiteCreate, WebsiteUpdate, WebsiteDeploymentCreate

class WebsiteService:
    # --- Websites ---
    async def list_websites(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, search: Optional[str] = None
    ) -> Tuple[Sequence[Website], int]:
        query = select(Website).where(Website.company_id == company_id, Website.deleted_at.is_(None)).options(selectinload(Website.deployments))
        
        if search:
            search_term = f"%{search}%"
            query = query.where(Website.name.ilike(search_term))
            
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Website.name.asc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        
        return result.scalars().all(), total

    async def get_website(self, db: AsyncSession, company_id: uuid.UUID, website_id: uuid.UUID) -> Optional[Website]:
        query = select(Website).where(
            Website.id == website_id, 
            Website.company_id == company_id,
            Website.deleted_at.is_(None)
        ).options(selectinload(Website.deployments))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_website(self, db: AsyncSession, company_id: uuid.UUID, data: WebsiteCreate) -> Website:
        website = Website(
            company_id=company_id,
            name=data.name,
            domain=data.domain,
            tech_stack=data.tech_stack,
            repository_url=data.repository_url,
            status=data.status
        )
        db.add(website)
        await db.flush()
        return website

    async def update_website(self, db: AsyncSession, website: Website, data: WebsiteUpdate) -> Website:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(website, key, value)
        await db.flush()
        return website

    # --- Deployments ---
    async def create_deployment(self, db: AsyncSession, website_id: uuid.UUID, data: WebsiteDeploymentCreate, current_user: User) -> WebsiteDeployment:
        deployment = WebsiteDeployment(
            website_id=website_id,
            version=data.version,
            status=data.status,
            notes=data.notes,
            deployed_by=current_user.id
        )
        db.add(deployment)
        await db.flush()
        return deployment
