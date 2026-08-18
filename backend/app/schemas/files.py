import uuid
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class DocumentBase(BaseModel):
    filename: str
    original_name: str
    mime_type: str
    size_bytes: int
    category: Optional[str] = None
    tags: Optional[str] = None

class DocumentCreate(DocumentBase):
    storage_path: str

class DocumentUpdate(BaseModel):
    filename: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[str] = None

class DocumentResponse(DocumentBase):
    id: uuid.UUID
    company_id: uuid.UUID
    uploaded_by: Optional[uuid.UUID] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
