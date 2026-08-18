import uuid
from typing import Optional, List, Sequence
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
import imaplib
import smtplib
import email
from email.header import decode_header
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import asyncio

from app.models.email import EmailAccount
from app.schemas.email import EmailAccountCreate, EmailAccountUpdate, EmailMessageBase, EmailSendRequest
from app.core.config import settings
from cryptography.fernet import Fernet

class EmailService:
    def __init__(self):
        # In production, use settings.ENCRYPTION_KEY.
        # For simplicity in this OS, ensure the key is 32 url-safe base64-encoded bytes.
        try:
            self.cipher_suite = Fernet(settings.ENCRYPTION_KEY.encode() if settings.ENCRYPTION_KEY else Fernet.generate_key())
        except Exception:
            # Fallback for development if key is invalid
            self.cipher_suite = Fernet(Fernet.generate_key())

    def _encrypt_password(self, password: str) -> str:
        return self.cipher_suite.encrypt(password.encode()).decode()

    def _decrypt_password(self, encrypted_password: str) -> str:
        return self.cipher_suite.decrypt(encrypted_password.encode()).decode()

    # --- Account Management ---
    async def get_accounts(self, db: AsyncSession, company_id: uuid.UUID) -> Sequence[EmailAccount]:
        query = select(EmailAccount).where(EmailAccount.company_id == company_id, EmailAccount.deleted_at.is_(None))
        result = await db.execute(query)
        return result.scalars().all()

    async def get_account(self, db: AsyncSession, company_id: uuid.UUID, account_id: uuid.UUID) -> Optional[EmailAccount]:
        query = select(EmailAccount).where(
            EmailAccount.id == account_id, 
            EmailAccount.company_id == company_id,
            EmailAccount.deleted_at.is_(None)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_account(self, db: AsyncSession, company_id: uuid.UUID, data: EmailAccountCreate) -> EmailAccount:
        account = EmailAccount(
            company_id=company_id,
            email_address=data.email_address,
            imap_host=data.imap_host,
            imap_port=data.imap_port,
            smtp_host=data.smtp_host,
            smtp_port=data.smtp_port,
            username=data.username,
            password_encrypted=self._encrypt_password(data.password)
        )
        db.add(account)
        await db.flush()
        return account

    # --- IMAP/SMTP Operations ---
    async def fetch_inbox(self, db: AsyncSession, account: EmailAccount) -> List[EmailMessageBase]:
        password = self._decrypt_password(account.password_encrypted)
        
        def _fetch():
            try:
                mail = imaplib.IMAP4_SSL(account.imap_host, account.imap_port)
                mail.login(account.username, password)
                mail.select("inbox")
                
                # Search for latest 50 emails
                status, messages = mail.search(None, "ALL")
                if status != "OK":
                    return []
                
                email_ids = messages[0].split()
                latest_email_ids = email_ids[-50:] # Get last 50
                latest_email_ids.reverse() # Newest first
                
                result = []
                for e_id in latest_email_ids:
                    status, msg_data = mail.fetch(e_id, "(RFC822)")
                    if status != "OK":
                        continue
                        
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            
                            # Decode subject
                            subject = ""
                            if msg["Subject"]:
                                decoded_list = decode_header(msg["Subject"])
                                subject_parts = []
                                for part, encoding in decoded_list:
                                    if isinstance(part, bytes):
                                        subject_parts.append(part.decode(encoding or "utf-8", errors="replace"))
                                    else:
                                        subject_parts.append(str(part))
                                subject = "".join(subject_parts)
                                
                            # Extract sender
                            sender = msg.get("From", "Unknown")
                            date_str = msg.get("Date", "")
                            
                            # Extract body snippet
                            body = ""
                            if msg.is_multipart():
                                for part in msg.walk():
                                    content_type = part.get_content_type()
                                    content_disposition = str(part.get("Content-Disposition"))
                                    if content_type == "text/plain" and "attachment" not in content_disposition:
                                        payload = part.get_payload(decode=True)
                                        if payload:
                                            body = payload.decode(errors="replace")
                                            break
                            else:
                                payload = msg.get_payload(decode=True)
                                if payload:
                                    body = payload.decode(errors="replace")
                                    
                            snippet = body[:200] + ("..." if len(body) > 200 else "")
                            
                            result.append(EmailMessageBase(
                                id=e_id.decode(),
                                subject=subject or "No Subject",
                                sender=sender,
                                date=date_str,
                                body_snippet=snippet,
                                is_read=True
                            ))
                mail.logout()
                return result
            except Exception as e:
                print(f"IMAP Error: {e}")
                return []
                
        return await asyncio.to_thread(_fetch)

    async def fetch_sent(self, db: AsyncSession, account: EmailAccount) -> List[EmailMessageBase]:
        password = self._decrypt_password(account.password_encrypted)
        
        def _fetch():
            try:
                mail = imaplib.IMAP4_SSL(account.imap_host, account.imap_port)
                mail.login(account.username, password)
                
                # Try common 'Sent' folder names
                sent_folders = ['"Sent"', '"Sent Items"', '"[Gmail]/Sent Mail"', '"Sent Messages"']
                folder_selected = False
                for folder in sent_folders:
                    status, _ = mail.select(folder)
                    if status == "OK":
                        folder_selected = True
                        break
                
                if not folder_selected:
                    # Fallback to listing folders to find one that might be sent
                    status, folders = mail.list()
                    if status == "OK":
                        for f in folders:
                            if b"Sent" in f:
                                folder_name = f.split(b' "/" ')[-1].decode()
                                status, _ = mail.select(folder_name)
                                if status == "OK":
                                    folder_selected = True
                                    break
                
                if not folder_selected:
                    return []
                
                # Search for latest 50 emails
                status, messages = mail.search(None, "ALL")
                if status != "OK":
                    return []
                
                email_ids = messages[0].split()
                latest_email_ids = email_ids[-50:] # Get last 50
                latest_email_ids.reverse() # Newest first
                
                result = []
                for e_id in latest_email_ids:
                    status, msg_data = mail.fetch(e_id, "(RFC822)")
                    if status != "OK":
                        continue
                        
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            
                            # Decode subject
                            subject = ""
                            if msg["Subject"]:
                                decoded_list = decode_header(msg["Subject"])
                                subject_parts = []
                                for part, encoding in decoded_list:
                                    if isinstance(part, bytes):
                                        subject_parts.append(part.decode(encoding or "utf-8", errors="replace"))
                                    else:
                                        subject_parts.append(str(part))
                                    subject = "".join(subject_parts)
                                
                            # Extract sender/recipient
                            # For sent items, 'To' is usually more useful than 'From', but we'll put it in 'sender' for UI compatibility
                            to = msg.get("To", "Unknown")
                            sender = f"To: {to}"
                            date_str = msg.get("Date", "")
                            
                            # Extract body snippet
                            body = ""
                            if msg.is_multipart():
                                for part in msg.walk():
                                    content_type = part.get_content_type()
                                    content_disposition = str(part.get("Content-Disposition"))
                                    if content_type == "text/plain" and "attachment" not in content_disposition:
                                        payload = part.get_payload(decode=True)
                                        if payload:
                                            body = payload.decode(errors="replace")
                                            break
                            else:
                                payload = msg.get_payload(decode=True)
                                if payload:
                                    body = payload.decode(errors="replace")
                                    
                            snippet = body[:200] + ("..." if len(body) > 200 else "")
                            
                            result.append(EmailMessageBase(
                                id=e_id.decode(),
                                subject=subject or "No Subject",
                                sender=sender,
                                date=date_str,
                                body_snippet=snippet,
                                is_read=True
                            ))
                mail.logout()
                return result
            except Exception as e:
                print(f"IMAP Error: {e}")
                return []
                
        return await asyncio.to_thread(_fetch)

    async def send_email(self, db: AsyncSession, account: EmailAccount, data: EmailSendRequest) -> bool:
        password = self._decrypt_password(account.password_encrypted)
        
        def _send():
            try:
                msg = MIMEMultipart()
                msg['From'] = account.email_address
                msg['To'] = data.to_address
                msg['Subject'] = data.subject
                
                if data.is_html:
                    msg.attach(MIMEText(data.body, 'html'))
                else:
                    msg.attach(MIMEText(data.body, 'plain'))
                    
                if account.smtp_port == 587:
                    server = smtplib.SMTP(account.smtp_host, account.smtp_port)
                    server.starttls()
                else:
                    server = smtplib.SMTP_SSL(account.smtp_host, account.smtp_port)
                    
                server.login(account.username, password)
                server.send_message(msg)
                server.quit()
                return True
            except Exception as e:
                print(f"SMTP Error: {e}")
                return False
                
        return await asyncio.to_thread(_send)
