"""Common Pydantic schemas: pagination, responses, filtering."""
import uuid
from typing import Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, field_validator, computed_field

T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Standard paginated list response."""
    items: List[T]
    total: int
    page: int
    page_size: int
    
    @computed_field
    @property
    def total_pages(self) -> int:
        import math
        return math.ceil(self.total / self.page_size) if self.page_size > 0 else 0

    model_config = ConfigDict(from_attributes=True)


class PaginationParams(BaseModel):
    page: int = 1
    page_size: int = 25

    @field_validator("page")
    @classmethod
    def page_must_be_positive(cls, v):
        if v < 1:
            raise ValueError("page must be >= 1")
        return v

    @field_validator("page_size")
    @classmethod
    def page_size_must_be_valid(cls, v):
        if v < 1 or v > 100:
            raise ValueError("page_size must be between 1 and 100")
        return v

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


class MessageResponse(BaseModel):
    """Simple success message response."""
    message: str
    success: bool = True


class ErrorResponse(BaseModel):
    """Standard error response."""
    message: str
    detail: Optional[str] = None
    code: Optional[str] = None


class IDResponse(BaseModel):
    """Response containing just an ID."""
    id: uuid.UUID
