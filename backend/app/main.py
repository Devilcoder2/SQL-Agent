import os
import asyncio
# pyrefly: ignore [missing-import]
from fastapi import FastAPI
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles

from app.core.auth import auth_db
from app.core.audit import audit_manager
from app.api.routers.auth import router as auth_router
from app.api.routers.query import router as query_router
from app.api.routers.exports import router as exports_router
from app.api.routers.alerts import router as alerts_router, alert_scheduler_loop
from app.api.routers.audit import router as audit_router

app = FastAPI(
    title="Enterprise AI SQL Agent API",
    description="Backend API supporting conversational query execution, AST validation, and PII masking.",
    version="1.0.0"
)

# Enable CORS for local client development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(auth_router)
app.include_router(query_router)
app.include_router(exports_router)
app.include_router(alerts_router)
app.include_router(audit_router)

@app.on_event("startup")
async def startup_event():
    await auth_db.initialize()
    await audit_manager.initialize()
    asyncio.create_task(alert_scheduler_loop())
    
    # Check LangSmith Tracing Status
    tracing_enabled = os.getenv("LANGCHAIN_TRACING_V2", "false").lower() == "true"
    api_key = os.getenv("LANGCHAIN_API_KEY", "")
    if tracing_enabled and api_key:
        print(f" LangSmith Agentic Tracing: ACTIVE (Project: {os.getenv('LANGCHAIN_PROJECT', 'sql-agent')})")
    else:
        print(" LangSmith Agentic Tracing: INACTIVE (Configure LANGCHAIN_TRACING_V2 and LANGCHAIN_API_KEY in .env)")

# Mount static frontend files to root path
frontend_dir = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../frontend/dist")
)

if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")
