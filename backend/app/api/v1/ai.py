import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, get_company_id
from app.models.user import User
from app.schemas.ai import ChatRequest, ChatMessageResponse, ChatHistoryResponse
from app.services.ai_service import AIService

router = APIRouter(prefix="/ai", tags=["AI Assistant"])
ai_service = AIService()

@router.get("/history", response_model=ChatHistoryResponse)
async def get_chat_history(
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    messages = await ai_service.get_history(db, company_id, current_user.id)
    return ChatHistoryResponse(messages=messages)

@router.post("/chat", response_model=ChatMessageResponse, status_code=status.HTTP_200_OK)
async def send_chat_message(
    request: ChatRequest,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    response_msg = await ai_service.process_chat(db, company_id, current_user, request)
    return response_msg
