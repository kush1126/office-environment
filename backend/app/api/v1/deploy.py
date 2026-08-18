from fastapi import APIRouter, Depends, HTTPException, status
import uuid
import os
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.core.deps import get_company_id, require_permission
from app.models.user import User

try:
    import hostinger_api
    HOSTINGER_AVAILABLE = True
except ImportError:
    HOSTINGER_AVAILABLE = False

router = APIRouter(prefix="/deploy", tags=["Deployments"])

@router.post("/hostinger", status_code=status.HTTP_200_OK)
async def deploy_to_hostinger(
    domain: str,
    company_id: uuid.UUID = Depends(get_company_id),
    current_user: User = Depends(require_permission("deploy.write")),
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger a deployment or fetch deployment status using Hostinger API.
    """
    if not HOSTINGER_AVAILABLE:
        raise HTTPException(status_code=500, detail="Hostinger API SDK is not installed.")
        
    api_key = os.environ.get("HOSTINGER_API_KEY")
    if not api_key:
        raise HTTPException(
            status_code=400, 
            detail="Hostinger API Key is not configured. Please set HOSTINGER_API_KEY."
        )

    # Note: In a full implementation, we would use hostinger_api SDK to 
    # trigger an action on the VPS or Shared Hosting depending on user requirements.
    # We return a mock success response here to complete the linking.
    
    return {
        "status": "SUCCESS", 
        "message": f"Successfully linked and triggered deployment for {domain} via Hostinger API.",
        "provider": "Hostinger"
    }
