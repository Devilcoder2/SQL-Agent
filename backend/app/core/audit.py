import os
import time
from datetime import datetime
from typing import Optional, List, Dict, Any
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from app.core.database import DatabaseManager

class AuditLogManager:
    """
    Tracks and logs every analytical execution in an isolated SQLite database file.
    """
    def __init__(self, db_url: str = None):
        if not db_url:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # backend/
            data_dir = os.path.normpath(os.path.join(base_dir, "../data"))
            os.makedirs(data_dir, exist_ok=True)
            db_url = f"sqlite:///{data_dir}/audit.db"
        
        self.db_manager = DatabaseManager(db_url=db_url)

    async def initialize(self):
        """Creates the audit logs table if it does not exist."""
        create_table_query = """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            user_query TEXT,
            user_role TEXT,
            generated_sql TEXT,
            ast_status TEXT, -- 'PASSED' | 'BLOCKED' | 'FAILED'
            error_message TEXT,
            latency_ms INTEGER
        );
        """
        async with self.db_manager.engine.begin() as conn:
            await conn.execute(text(create_table_query))

    async def log_query(
        self, 
        user_query: str, 
        user_role: str, 
        generated_sql: Optional[str], 
        ast_status: str, 
        error_message: Optional[str], 
        latency_ms: int
    ):
        """Records a query transaction in the audit database."""
        insert_query = """
        INSERT INTO audit_logs (user_query, user_role, generated_sql, ast_status, error_message, latency_ms)
        VALUES (:user_query, :user_role, :generated_sql, :ast_status, :error_message, :latency_ms);
        """
        params = {
            "user_query": user_query,
            "user_role": user_role,
            "generated_sql": generated_sql or "",
            "ast_status": ast_status,
            "error_message": error_message or "",
            "latency_ms": latency_ms
        }
        async with self.db_manager.engine.begin() as conn:
            await conn.execute(text(insert_query), params)

    async def get_logs(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Retrieves latest audit transactions."""
        select_query = """
        SELECT id, timestamp, user_query, user_role, generated_sql, ast_status, error_message, latency_ms 
        FROM audit_logs 
        ORDER BY id DESC 
        LIMIT :limit;
        """
        return await self.db_manager.execute_query(select_query, {"limit": limit})
