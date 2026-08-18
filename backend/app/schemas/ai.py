import uuid
from typing import List, Optional
from pydantic import BaseModel, ConfigDict
from datetime import datetime

class ChatMessageBase(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    message: str

class ChatMessageResponse(ChatMessageBase):
    id: uuid.UUID
    company_id: uuid.UUID
    user_id: uuid.UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ChatHistoryResponse(BaseModel):
    messages: List[ChatMessageResponse]
