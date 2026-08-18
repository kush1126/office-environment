"""Audit log service — write-only, no delete."""
import uuid
from datetime import datetime, timezone
from typing import Any, Optional

import structlog
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog

log = structlog.get_logger()


class AuditService:

    async def log(
        self,
        db: AsyncSession,
        *,
        action: str,
        user_id: Optional[uuid.UUID] = None,
        company_id: Optional[uuid.UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[uuid.UUID] = None,
        old_value: Optional[dict] = None,
        new_value: Optional[dict] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        extra: Optional[dict] = None,
    ) -> AuditLog:
        entry = AuditLog(
            user_id=user_id,
            company_id=company_id,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            old_value=old_value,
            new_value=new_value,
            ip_address=ip_address,
            user_agent=user_agent,
            extra=extra,
            created_at=datetime.now(timezone.utc),
        )
        db.add(entry)
        # Use flush, not commit — let the caller commit the transaction
        await db.flush()
        return entry

    async def list_logs(
        self,
        db: AsyncSession,
        *,
        company_id: Optional[uuid.UUID] = None,
        user_id: Optional[uuid.UUID] = None,
        action: Optional[str] = None,
        entity_type: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> tuple[list[AuditLog], int]:
        query = select(AuditLog)
        if company_id:
            query = query.where(AuditLog.company_id == company_id)
        if user_id:
            query = query.where(AuditLog.user_id == user_id)
        if action:
            query = query.where(AuditLog.action.ilike(f"%{action}%"))
        if entity_type:
            query = query.where(AuditLog.entity_type == entity_type)

        total = await db.execute(select(func.count()).select_from(query.subquery()))
        query = query.order_by(AuditLog.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        return result.scalars().all(), total.scalar_one()
