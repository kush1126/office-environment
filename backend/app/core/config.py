"""Application configuration — all settings loaded from environment variables."""
from typing import List, Optional
from pydantic_settings import BaseSettings, SettingsConfigDict
from cryptography.fernet import Fernet
import base64


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    # ─── Application ───────────────────────────────────────────────
    ENVIRONMENT: str = "development"
    APP_NAME: str = "Private Office Business OS"
    APP_VERSION: str = "1.0.0"

    # ─── Database ──────────────────────────────────────────────────
    DATABASE_URL: str
    SYNC_DATABASE_URL: str = ""

    # ─── Redis ─────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379/0"

    # ─── Security ──────────────────────────────────────────────────
    SECRET_KEY: str
    ENCRYPTION_KEY: str  # Fernet key for encrypting secrets at rest
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    PASSWORD_MIN_LENGTH: int = 8

    # ─── CORS / Network ────────────────────────────────────────────
    ALLOWED_ORIGINS: str = "http://localhost:3000,file://"
    ALLOWED_IPS: str = "127.0.0.1,::1"  # Enforce localhost only for Desktop app

    # ─── AI ────────────────────────────────────────────────────────
    AI_BASE_URL: str = "http://localhost:11434"
    AI_MODEL: str = "llama3.2:3b"
    AI_EMBEDDING_MODEL: str = "nomic-embed-text"
    AI_CONTEXT_LENGTH: int = 4096
    AI_TEMPERATURE: float = 0.1
    AI_MAX_TOKENS: int = 2048
    AI_CONFIDENCE_THRESHOLD: float = 0.75

    # ─── File Uploads ──────────────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"
    BACKUP_DIR: str = "./backups"
    MAX_UPLOAD_SIZE_MB: int = 50
    ALLOWED_EXTENSIONS: str = (
        "pdf,docx,xlsx,csv,txt,md,jpg,jpeg,png,webp,zip,"
        "html,css,js,ts,json,php,py,sql"
    )

    # ─── Email (Phase 5) ───────────────────────────────────────────
    IMAP_HOST: Optional[str] = None
    IMAP_PORT: int = 993
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: int = 587

    # ─── Pagination ────────────────────────────────────────────────
    DEFAULT_PAGE_SIZE: int = 25
    MAX_PAGE_SIZE: int = 100

    # ─── Computed Properties ───────────────────────────────────────
    @property
    def ALLOWED_ORIGINS_LIST(self) -> List[str]:
        return [o.strip() for o in self.ALLOWED_ORIGINS.split(",") if o.strip()]

    @property
    def ALLOWED_IPS_LIST(self) -> List[str]:
        return [ip.strip() for ip in self.ALLOWED_IPS.split(",") if ip.strip()]

    @property
    def ALLOWED_EXTENSIONS_LIST(self) -> List[str]:
        return [e.strip().lower() for e in self.ALLOWED_EXTENSIONS.split(",") if e.strip()]

    @property
    def MAX_UPLOAD_SIZE_BYTES(self) -> int:
        return self.MAX_UPLOAD_SIZE_MB * 1024 * 1024

    @property
    def fernet(self) -> Fernet:
        """Get Fernet instance for encrypting/decrypting secrets."""
        return Fernet(self.ENCRYPTION_KEY.encode())

    def encrypt_secret(self, value: str) -> str:
        """Encrypt a sensitive value for storage."""
        return self.fernet.encrypt(value.encode()).decode()

    def decrypt_secret(self, encrypted: str) -> str:
        """Decrypt a stored sensitive value."""
        return self.fernet.decrypt(encrypted.encode()).decode()


settings = Settings()
