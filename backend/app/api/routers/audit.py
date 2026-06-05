# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user
from app.core.audit import audit_manager

router = APIRouter(prefix="/api/v1", tags=["Audit"])

@router.get("/audit")
async def get_audit_logs(limit: int = 50, current_user: dict = Depends(get_current_user)):
    try:
        logs = await audit_manager.get_logs(limit=limit)
        return {"logs": logs}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch audit logs: {str(e)}")
