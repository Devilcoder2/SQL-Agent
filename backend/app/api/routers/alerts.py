import os
import asyncio
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_active_db, auth_db, get_current_user
from app.core.database import get_db_manager
from app.api.schemas import CreateAlertRequest

router = APIRouter(prefix="/api/v1", tags=["Alerts"])

ALERTS_REGISTRY = [
    {
        "id": "alert_1",
        "name": "High Invoice Volumes",
        "query": "SELECT COUNT(*) FROM Invoice;",
        "condition": "> 400",
        "interval_seconds": 15,
        "last_checked": None,
        "status": "Active",
        "database_id": "default"
    },
    {
        "id": "alert_2",
        "name": "High Support Ticket Count",
        "query": "SELECT COUNT(*) FROM Customer WHERE Country = 'Brazil';",
        "condition": "> 4",
        "interval_seconds": 30,
        "last_checked": None,
        "status": "Active",
        "database_id": "default"
    }
]

ALERTS_LOGS = []

async def alert_scheduler_loop():
    # Wait for database manager to be ready
    await asyncio.sleep(3)
    while True:
        now = datetime.now()
        for alert in ALERTS_REGISTRY:
            if alert["status"] == "Active":
                try:
                    db_id = alert.get("database_id") or "default"
                    if db_id == "default":
                        db_url = os.getenv("DATABASE_URL")
                    else:
                        db_record = await auth_db.get_database(int(db_id))
                        db_url = db_record["connection_url"] if db_record else None
                    
                    if not db_url:
                        continue
                        
                    # Run background SQL check query
                    db = get_db_manager(db_url)
                    results = await db.execute_query(alert["query"])
                    alert["last_checked"] = now.strftime("%Y-%m-%d %H:%M:%S")
                    
                    if results:
                        first_row = results[0]
                        first_val = list(first_row.values())[0]
                        
                        # Evaluate condition: e.g. "> 100", "< 5", "= 10"
                        cond = alert["condition"].strip()
                        triggered = False
                        try:
                            val_num = float(first_val)
                            if cond.startswith(">"):
                                threshold = float(cond.replace(">", "").strip())
                                triggered = val_num > threshold
                            elif cond.startswith("<"):
                                threshold = float(cond.replace("<", "").strip())
                                triggered = val_num < threshold
                            elif cond.startswith("="):
                                threshold = float(cond.replace("=", "").strip())
                                triggered = val_num == threshold
                        except (ValueError, TypeError):
                            # Fallback to string comparison if not numeric
                            if cond.startswith("="):
                                threshold = cond.replace("=", "").strip()
                                triggered = str(first_val) == threshold
                        
                        if triggered:
                            alert["status"] = "Triggered"
                            ALERTS_LOGS.append({
                                "id": f"log_{len(ALERTS_LOGS) + 1}",
                                "alert_id": alert["id"],
                                "name": alert["name"],
                                "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
                                "value": str(first_val),
                                "message": f"Check value {first_val} triggered condition '{cond}'.",
                                "database_id": db_id
                            })
                except Exception as e:
                    alert["status"] = "Error"
                    print(f"Error checking alert '{alert['name']}': {e}")
                    
        await asyncio.sleep(5)

@router.get("/alerts")
async def get_alerts(active_db: dict = Depends(get_active_db), current_user: dict = Depends(get_current_user)):
    if not current_user.get("can_view_alerts", True):
        raise HTTPException(status_code=403, detail="Permission Denied: You do not have permission to view Alerts.")
    filtered_alerts = [
        a for a in ALERTS_REGISTRY 
        if a.get("database_id") == active_db["id"] or (active_db["id"] == "default" and not a.get("database_id"))
    ]
    return {"alerts": filtered_alerts}

@router.post("/alerts")
async def create_alert(req: CreateAlertRequest, active_db: dict = Depends(get_active_db), current_user: dict = Depends(get_current_user)):
    if not current_user.get("can_view_alerts", True):
        raise HTTPException(status_code=403, detail="Permission Denied: You do not have permission to manage Alerts.")
    new_alert = {
        "id": f"alert_{len(ALERTS_REGISTRY) + 1}",
        "name": req.name,
        "query": req.query,
        "condition": req.condition,
        "interval_seconds": req.interval_seconds,
        "last_checked": None,
        "status": "Active",
        "database_id": active_db["id"]
    }
    ALERTS_REGISTRY.append(new_alert)
    return {"status": "success", "alert": new_alert}

@router.get("/alerts/logs")
async def get_alerts_logs(active_db: dict = Depends(get_active_db), current_user: dict = Depends(get_current_user)):
    if not current_user.get("can_view_alerts", True):
        raise HTTPException(status_code=403, detail="Permission Denied: You do not have permission to view Alerts.")
    filtered_logs = [
        l for l in ALERTS_LOGS
        if l.get("database_id") == active_db["id"] or (active_db["id"] == "default" and not l.get("database_id"))
    ]
    return {"logs": filtered_logs}

@router.post("/alerts/{alert_id}/reset")
async def reset_alert(alert_id: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("can_view_alerts", True):
        raise HTTPException(status_code=403, detail="Permission Denied: You do not have permission to reset Alerts.")
    for alert in ALERTS_REGISTRY:
        if alert["id"] == alert_id:
            alert["status"] = "Active"
            return {"status": "success", "message": f"Alert '{alert['name']}' reset to Active."}
    raise HTTPException(status_code=404, detail="Alert rule not found.")
