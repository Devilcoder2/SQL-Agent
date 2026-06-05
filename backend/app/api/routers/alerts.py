import asyncio
from datetime import datetime
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException
from app.agents.sql_agent import db_manager
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
        "status": "Active"
    },
    {
        "id": "alert_2",
        "name": "High Support Ticket Count",
        "query": "SELECT COUNT(*) FROM Customer WHERE Country = 'Brazil';",
        "condition": "> 4",
        "interval_seconds": 30,
        "last_checked": None,
        "status": "Active"
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
                    # Run background SQL check query
                    results = await db_manager.execute_query(alert["query"])
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
                                "message": f"Check value {first_val} triggered condition '{cond}'."
                            })
                except Exception as e:
                    alert["status"] = "Error"
                    print(f"Error checking alert '{alert['name']}': {e}")
                    
        await asyncio.sleep(5)

@router.get("/alerts")
async def get_alerts():
    return {"alerts": ALERTS_REGISTRY}

@router.post("/alerts")
async def create_alert(req: CreateAlertRequest):
    new_alert = {
        "id": f"alert_{len(ALERTS_REGISTRY) + 1}",
        "name": req.name,
        "query": req.query,
        "condition": req.condition,
        "interval_seconds": req.interval_seconds,
        "last_checked": None,
        "status": "Active"
    }
    ALERTS_REGISTRY.append(new_alert)
    return {"status": "success", "alert": new_alert}

@router.get("/alerts/logs")
async def get_alerts_logs():
    return {"logs": ALERTS_LOGS}

@router.post("/alerts/{alert_id}/reset")
async def reset_alert(alert_id: str):
    for alert in ALERTS_REGISTRY:
        if alert["id"] == alert_id:
            alert["status"] = "Active"
            return {"status": "success", "message": f"Alert '{alert['name']}' reset to Active."}
    raise HTTPException(status_code=404, detail="Alert rule not found.")
