import os
import uuid
import shutil
from typing import Optional, Tuple, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from fastapi import UploadFile

from app.models.user import User
from app.models.files import Document
from app.schemas.files import DocumentCreate, DocumentUpdate
from app.core.config import settings

class FileService:
    def __init__(self):
        # Ensure base storage directory exists
        self.base_storage_path = os.path.join(os.getcwd(), "storage")
        os.makedirs(self.base_storage_path, exist_ok=True)

    async def list_documents(
        self, db: AsyncSession, company_id: uuid.UUID, page: int = 1, page_size: int = 25, search: Optional[str] = None
    ) -> Tuple[Sequence[Document], int]:
        query = select(Document).where(Document.company_id == company_id, Document.deleted_at.is_(None))
        
        if search:
            search_term = f"%{search}%"
            query = query.where(Document.original_name.ilike(search_term))
            
        count_query = select(func.count()).select_from(query.subquery())
        total = (await db.execute(count_query)).scalar() or 0
        
        query = query.order_by(Document.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
        result = await db.execute(query)
        
        return result.scalars().all(), total

    async def get_document(self, db: AsyncSession, company_id: uuid.UUID, document_id: uuid.UUID) -> Optional[Document]:
        query = select(Document).where(
            Document.id == document_id, 
            Document.company_id == company_id,
            Document.deleted_at.is_(None)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def upload_document(
        self, db: AsyncSession, company_id: uuid.UUID, file: UploadFile, category: Optional[str], tags: Optional[str], current_user: User
    ) -> Document:
        # Create company specific directory
        company_dir = os.path.join(self.base_storage_path, str(company_id))
        os.makedirs(company_dir, exist_ok=True)
        
        # Generate safe filename
        ext = os.path.splitext(file.filename)[1] if file.filename else ""
        safe_filename = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(company_dir, safe_filename)
        
        # Save file to disk
        # Reading synchronously for simplicity in this MVP, but should use async file I/O for prod
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        size_bytes = os.path.getsize(file_path)

        doc = Document(
            company_id=company_id,
            filename=safe_filename,
            original_name=file.filename or "unknown",
            mime_type=file.content_type or "application/octet-stream",
            size_bytes=size_bytes,
            storage_path=file_path,
            category=category,
            tags=tags,
            uploaded_by=current_user.id
        )
        db.add(doc)
        await db.flush()
        return doc

    async def update_document(self, db: AsyncSession, document: Document, data: DocumentUpdate) -> Document:
        update_data = data.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(document, key, value)
        await db.flush()
        return document

    async def delete_document(self, db: AsyncSession, document: Document) -> None:
        # We soft delete the DB record. We can optionally hard delete the file from disk here or via a cron job.
        # For now, just soft delete the record to keep it safe.
        await db.delete(document)
        await db.flush()

    async def delete_all_documents(self, db: AsyncSession, company_id: uuid.UUID) -> int:
        query = select(Document).where(Document.company_id == company_id)
        result = await db.execute(query)
        documents = result.scalars().all()
        
        count = 0
        for doc in documents:
            # Delete from disk
            if os.path.exists(doc.storage_path):
                try:
                    os.remove(doc.storage_path)
                except:
                    pass
            # Hard delete from DB
            await db.delete(doc)
            count += 1
            
        await db.flush()
        return count
