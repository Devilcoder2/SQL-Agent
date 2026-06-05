import os
from typing import Dict, List, Any, Optional
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from app.core.database import DatabaseManager

class AuthDatabaseManager:
    """
    Manages multi-tenant auth records in an isolated SQLite database file.
    """
    def __init__(self, db_url: str = None):
        if not db_url:
            base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))) # backend/
            data_dir = os.path.normpath(os.path.join(base_dir, "../data"))
            os.makedirs(data_dir, exist_ok=True)
            db_url = f"sqlite:///{data_dir}/users.db"
        
        self.db_manager = DatabaseManager(db_url=db_url)

    async def initialize(self):
        """Creates auth tables if they do not exist."""
        create_enterprises = """
        CREATE TABLE IF NOT EXISTS enterprises (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        """
        create_users = """
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE,
            password_hash TEXT,
            role TEXT, -- 'admin' | 'analyst' | 'general'
            tenant_type TEXT, -- 'single' | 'enterprise'
            enterprise_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE
        );
        """
        async with self.db_manager.engine.begin() as conn:
            await conn.execute(text(create_enterprises))
            await conn.execute(text(create_users))

    async def create_enterprise(self, name: str) -> int:
        """Registers a new corporate enterprise and returns its ID."""
        insert_query = "INSERT INTO enterprises (name) VALUES (:name) RETURNING id;"
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(insert_query), {"name": name.strip()})
            row = result.fetchone()
            if row:
                return row[0]
            # Fallback if RETURNING is not supported
            select_query = "SELECT id FROM enterprises WHERE name = :name;"
            res = await self.db_manager.execute_query(select_query, {"name": name.strip()})
            return res[0]["id"]

    async def get_enterprise_by_name(self, name: str) -> Optional[Dict[str, Any]]:
        """Retrieves enterprise detail by exact name search."""
        query = "SELECT id, name, created_at FROM enterprises WHERE name = :name;"
        rows = await self.db_manager.execute_query(query, {"name": name.strip()})
        return rows[0] if rows else None

    async def get_enterprise_by_id(self, ent_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves enterprise details by primary ID key."""
        query = "SELECT id, name, created_at FROM enterprises WHERE id = :id;"
        rows = await self.db_manager.execute_query(query, {"id": ent_id})
        return rows[0] if rows else None

    async def create_user(
        self, 
        username: str, 
        password_hash: str, 
        role: str, 
        tenant_type: str, 
        enterprise_id: Optional[int] = None
    ) -> int:
        """Registers a new user and returns its ID."""
        insert_query = """
        INSERT INTO users (username, password_hash, role, tenant_type, enterprise_id)
        VALUES (:username, :password_hash, :role, :tenant_type, :enterprise_id)
        RETURNING id;
        """
        params = {
            "username": username.strip(),
            "password_hash": password_hash,
            "role": role,
            "tenant_type": tenant_type,
            "enterprise_id": enterprise_id
        }
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(insert_query), params)
            row = result.fetchone()
            if row:
                return row[0]
            # Fallback
            select_query = "SELECT id FROM users WHERE username = :username;"
            res = await self.db_manager.execute_query(select_query, {"username": username.strip()})
            return res[0]["id"]

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Queries database for user by their unique login handle."""
        query = """
        SELECT u.id, u.username, u.password_hash, u.role, u.tenant_type, u.enterprise_id, e.name AS enterprise_name 
        FROM users u 
        LEFT JOIN enterprises e ON u.enterprise_id = e.id 
        WHERE u.username = :username;
        """
        rows = await self.db_manager.execute_query(query, {"username": username.strip()})
        return rows[0] if rows else None

    async def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Queries user profile details by numeric primary key."""
        query = """
        SELECT u.id, u.username, u.role, u.tenant_type, u.enterprise_id, e.name AS enterprise_name
        FROM users u 
        LEFT JOIN enterprises e ON u.enterprise_id = e.id 
        WHERE u.id = :id;
        """
        rows = await self.db_manager.execute_query(query, {"id": user_id})
        return rows[0] if rows else None

    async def get_enterprise_users(self, enterprise_id: int) -> List[Dict[str, Any]]:
        """Returns all registered users belonging to an enterprise organization."""
        query = "SELECT id, username, role, tenant_type, created_at FROM users WHERE enterprise_id = :enterprise_id ORDER BY id ASC;"
        return await self.db_manager.execute_query(query, {"enterprise_id": enterprise_id})

    async def delete_enterprise_user(self, user_id: int, enterprise_id: int) -> bool:
        """Deletes a user account belonging to a specific enterprise."""
        delete_query = "DELETE FROM users WHERE id = :id AND enterprise_id = :enterprise_id;"
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(delete_query), {"id": user_id, "enterprise_id": enterprise_id})
            return result.rowcount > 0

    async def update_user_role(self, user_id: int, role: str, enterprise_id: int) -> bool:
        """Updates the permission role of a user belonging to an enterprise."""
        update_query = "UPDATE users SET role = :role WHERE id = :id AND enterprise_id = :enterprise_id;"
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(update_query), {"role": role, "id": user_id, "enterprise_id": enterprise_id})
            return result.rowcount > 0

    async def count_users(self) -> int:
        """Returns the total number of registered users."""
        query = "SELECT COUNT(*) as cnt FROM users;"
        res = await self.db_manager.execute_query(query)
        return res[0]["cnt"] if res else 0

    async def close(self):
        await self.db_manager.close()
