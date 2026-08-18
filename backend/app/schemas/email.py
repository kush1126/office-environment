import uuid
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# --- Email Accounts ---
class EmailAccountBase(BaseModel):
    email_address: str
    imap_host: str
    imap_port: int = 993
    smtp_host: str
    smtp_port: int = 465
    username: str

class EmailAccountCreate(EmailAccountBase):
    password: str # Plaintext password, will be encrypted before DB insertion

class EmailAccountUpdate(BaseModel):
    imap_host: Optional[str] = None
    imap_port: Optional[int] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    password: Optional[str] = None

class EmailAccountResponse(EmailAccountBase):
    id: uuid.UUID
    company_id: uuid.UUID
    model_config = ConfigDict(from_attributes=True)


# --- Email Messages (Live Fetching) ---
class EmailMessageBase(BaseModel):
    id: str # IMAP uid or similar
    subject: str
    sender: str
    date: str
    body_snippet: str
    is_read: bool

class EmailMessageResponse(BaseModel):
    account_id: uuid.UUID
    messages: List[EmailMessageBase]


# --- Sending Emails ---
class EmailSendRequest(BaseModel):
    account_id: uuid.UUID
    to_address: str
    subject: str
    body: str
    is_html: bool = False
