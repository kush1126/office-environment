import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.deps import get_current_user, require_permission, get_company_id
from app.models.user import User
from app.schemas.email import EmailAccountCreate, EmailAccountResponse, EmailMessageResponse, EmailSendRequest
from app.services.email_service import EmailService

router = APIRouter(prefix="/email", tags=["Email"])
email_service = EmailService()

@router.get("/accounts", response_model=List[EmailAccountResponse])
async def list_accounts(
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("email.read")),
    db: AsyncSession = Depends(get_db)
):
    accounts = await email_service.get_accounts(db, company_id)
    return accounts

@router.post("/accounts", response_model=EmailAccountResponse, status_code=status.HTTP_201_CREATED)
async def create_account(
    data: EmailAccountCreate,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("email.write")),
    db: AsyncSession = Depends(get_db)
):
    account = await email_service.create_account(db, company_id, data)
    await db.commit()
    return account

@router.get("/accounts/{account_id}/inbox", response_model=EmailMessageResponse)
async def fetch_inbox(
    account_id: uuid.UUID,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("email.read")),
    db: AsyncSession = Depends(get_db)
):
    account = await email_service.get_account(db, company_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
        
    messages = await email_service.fetch_inbox(db, account)
    return EmailMessageResponse(account_id=account.id, messages=messages)

@router.post("/accounts/{account_id}/send", status_code=status.HTTP_200_OK)
async def send_email(
    account_id: uuid.UUID,
    data: EmailSendRequest,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("email.write")),
    db: AsyncSession = Depends(get_db)
):
    if data.account_id != account_id:
        raise HTTPException(status_code=400, detail="Account ID mismatch")

    account = await email_service.get_account(db, company_id, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Email account not found")
        
    success = await email_service.send_email(db, account, data)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to send email")
        
    return {"status": "success", "message": "Email sent successfully"}
