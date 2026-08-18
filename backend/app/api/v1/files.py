import uuid
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession
import os

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission, get_company_id
from app.models.user import User
from app.schemas.files import DocumentResponse, DocumentUpdate
from app.services.file_service import FileService
from app.schemas.common import PaginatedResponse

router = APIRouter(prefix="/files", tags=["Files"])
file_service = FileService()

@router.get("", response_model=PaginatedResponse[DocumentResponse])
async def list_documents(
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    search: Optional[str] = None,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("files.read")),
    db: AsyncSession = Depends(get_db)
):
    items, total = await file_service.list_documents(db, company_id, page, page_size, search)
    return PaginatedResponse(items=items, total=total, page=page, page_size=page_size)

@router.post("/batch", status_code=status.HTTP_201_CREATED)
async def batch_upload_documents(
    files: List[UploadFile] = File(...),
    category: Optional[str] = Form("batch"),
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("files.write")),
    db: AsyncSession = Depends(get_db)
):
    uploaded_docs = []
    for file in files:
        doc = await file_service.upload_document(db, company_id, file, category, None, current_user)
        uploaded_docs.append(doc)
    await db.commit()
    return {"count": len(uploaded_docs), "message": "Batch upload successful"}

@router.post("/upload", response_model=DocumentResponse, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    category: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("files.write")),
    db: AsyncSession = Depends(get_db)
):
    doc = await file_service.upload_document(db, company_id, file, category, tags, current_user)
    await db.commit()
    return doc

@router.delete("/all", status_code=status.HTTP_200_OK)
async def delete_all_documents(
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("files.write")),
    db: AsyncSession = Depends(get_db)
):
    count = await file_service.delete_all_documents(db, company_id)
    await db.commit()
    return {"message": f"Successfully deleted {count} files"}

@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("files.read")),
    db: AsyncSession = Depends(get_db)
):
    doc = await file_service.get_document(db, company_id, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.get("/{document_id}/download")
async def download_document(
    document_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("files.read")),
    db: AsyncSession = Depends(get_db)
):
    doc = await file_service.get_document(db, company_id, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if not os.path.exists(doc.storage_path):
        raise HTTPException(status_code=404, detail="File content not found on server")
        
    return FileResponse(
        path=doc.storage_path, 
        filename=doc.original_name, 
        media_type=doc.mime_type
    )

@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("files.write")),
    db: AsyncSession = Depends(get_db)
):
    doc = await file_service.get_document(db, company_id, document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    await file_service.delete_document(db, doc)
    await db.commit()
