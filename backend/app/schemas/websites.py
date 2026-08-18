import uuid
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from datetime import datetime

# --- Deployments ---
class WebsiteDeploymentBase(BaseModel):
    version: str
    status: str
    notes: Optional[str] = None

class WebsiteDeploymentCreate(WebsiteDeploymentBase):
    pass

class WebsiteDeploymentResponse(WebsiteDeploymentBase):
    id: uuid.UUID
    website_id: uuid.UUID
    deployed_at: datetime
    deployed_by: Optional[uuid.UUID] = None
    model_config = ConfigDict(from_attributes=True)


# --- Websites ---
class WebsiteBase(BaseModel):
    name: str
    domain: str
    tech_stack: Optional[str] = None
    repository_url: Optional[str] = None
    status: str = "ACTIVE"

class WebsiteCreate(WebsiteBase):
    pass

class WebsiteUpdate(BaseModel):
    name: Optional[str] = None
    domain: Optional[str] = None
    tech_stack: Optional[str] = None
    repository_url: Optional[str] = None
    status: Optional[str] = None

class WebsiteResponse(WebsiteBase):
    id: uuid.UUID
    company_id: uuid.UUID
    deployments: List[WebsiteDeploymentResponse] = []
    model_config = ConfigDict(from_attributes=True)
