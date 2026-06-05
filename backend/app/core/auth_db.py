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
            can_view_alerts INTEGER DEFAULT 1,
            can_view_schema INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE
        );
        """
        create_databases = """
        CREATE TABLE IF NOT EXISTS databases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alias TEXT,
            connection_url TEXT,
            enterprise_id INTEGER,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (enterprise_id) REFERENCES enterprises(id) ON DELETE CASCADE
        );
        """
        create_user_db_permissions = """
        CREATE TABLE IF NOT EXISTS user_database_permissions (
            user_id INTEGER,
            database_id TEXT,
            PRIMARY KEY (user_id, database_id),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """
        create_chat_sessions = """
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            title TEXT,
            database_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        );
        """
        create_chat_messages = """
        CREATE TABLE IF NOT EXISTS chat_messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id INTEGER,
            user_query TEXT,
            generated_sql TEXT,
            query_results TEXT,
            execution_error TEXT,
            retry_count INTEGER,
            narrative_response TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (session_id) REFERENCES chat_sessions(id) ON DELETE CASCADE
        );
        """
        async with self.db_manager.engine.begin() as conn:
            await conn.execute(text(create_enterprises))
            await conn.execute(text(create_users))
            await conn.execute(text(create_databases))
            
            # Run ALTER TABLE to migrate existing users table schema if columns are missing
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN can_view_alerts INTEGER DEFAULT 1;"))
            except Exception:
                pass # already exists
            try:
                await conn.execute(text("ALTER TABLE users ADD COLUMN can_view_schema INTEGER DEFAULT 1;"))
            except Exception:
                pass # already exists
                
            await conn.execute(text(create_user_db_permissions))
            await conn.execute(text(create_chat_sessions))
            await conn.execute(text(create_chat_messages))
            
            # Migrate: Grant default DB access to all existing users if user_database_permissions is empty or just do it for all users
            grant_default_migration = """
            INSERT OR IGNORE INTO user_database_permissions (user_id, database_id)
            SELECT id, 'default' FROM users;
            """
            await conn.execute(text(grant_default_migration))

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
        INSERT INTO users (username, password_hash, role, tenant_type, enterprise_id, can_view_alerts, can_view_schema)
        VALUES (:username, :password_hash, :role, :tenant_type, :enterprise_id, 1, 1)
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
            user_id = row[0] if row else None
            
        if not user_id:
            # Fallback
            select_query = "SELECT id FROM users WHERE username = :username;"
            res = await self.db_manager.execute_query(select_query, {"username": username.strip()})
            user_id = res[0]["id"]
            
        # Grant database access to default
        await self.grant_database_access(user_id, "default")
        return user_id

    async def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Queries database for user by their unique login handle."""
        query = """
        SELECT u.id, u.username, u.password_hash, u.role, u.tenant_type, u.enterprise_id, u.can_view_alerts, u.can_view_schema, e.name AS enterprise_name 
        FROM users u 
        LEFT JOIN enterprises e ON u.enterprise_id = e.id 
        WHERE u.username = :username;
        """
        rows = await self.db_manager.execute_query(query, {"username": username.strip()})
        return rows[0] if rows else None

    async def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Queries user profile details by numeric primary key."""
        query = """
        SELECT u.id, u.username, u.role, u.tenant_type, u.enterprise_id, u.can_view_alerts, u.can_view_schema, e.name AS enterprise_name
        FROM users u 
        LEFT JOIN enterprises e ON u.enterprise_id = e.id 
        WHERE u.id = :id;
        """
        rows = await self.db_manager.execute_query(query, {"id": user_id})
        return rows[0] if rows else None

    async def get_enterprise_users(self, enterprise_id: Optional[int]) -> List[Dict[str, Any]]:
        """Returns all registered users belonging to an enterprise organization or single users if enterprise_id is None."""
        if enterprise_id is not None:
            query = "SELECT id, username, role, tenant_type, can_view_alerts, can_view_schema, created_at FROM users WHERE enterprise_id = :enterprise_id ORDER BY id ASC;"
            params = {"enterprise_id": enterprise_id}
        else:
            query = "SELECT id, username, role, tenant_type, can_view_alerts, can_view_schema, created_at FROM users WHERE enterprise_id IS NULL ORDER BY id ASC;"
            params = {}
        return await self.db_manager.execute_query(query, params)

    async def delete_enterprise_user(self, user_id: int, enterprise_id: Optional[int]) -> bool:
        """Deletes a user account belonging to a specific enterprise or single tenant."""
        if enterprise_id is not None:
            delete_query = "DELETE FROM users WHERE id = :id AND enterprise_id = :enterprise_id;"
            params = {"id": user_id, "enterprise_id": enterprise_id}
        else:
            delete_query = "DELETE FROM users WHERE id = :id AND enterprise_id IS NULL;"
            params = {"id": user_id}
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(delete_query), params)
            return result.rowcount > 0

    async def update_user_role(self, user_id: int, role: str, enterprise_id: Optional[int]) -> bool:
        """Updates the permission role of a user belonging to an enterprise or single tenant."""
        if enterprise_id is not None:
            update_query = "UPDATE users SET role = :role WHERE id = :id AND enterprise_id = :enterprise_id;"
            params = {"role": role, "id": user_id, "enterprise_id": enterprise_id}
        else:
            update_query = "UPDATE users SET role = :role WHERE id = :id AND enterprise_id IS NULL;"
            params = {"role": role, "id": user_id}
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(update_query), params)
            return result.rowcount > 0

    async def count_users(self) -> int:
        """Returns the total number of registered users."""
        query = "SELECT COUNT(*) as cnt FROM users;"
        res = await self.db_manager.execute_query(query)
        return res[0]["cnt"] if res else 0

    async def create_database(self, alias: str, connection_url: str, enterprise_id: Optional[int] = None) -> int:
        """Registers a new database connection configuration and returns its ID."""
        insert_query = """
        INSERT INTO databases (alias, connection_url, enterprise_id)
        VALUES (:alias, :connection_url, :enterprise_id)
        RETURNING id;
        """
        params = {
            "alias": alias.strip(),
            "connection_url": connection_url.strip(),
            "enterprise_id": enterprise_id
        }
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(insert_query), params)
            row = result.fetchone()
            if row:
                return row[0]
            # Fallback
            select_query = "SELECT id FROM databases WHERE alias = :alias AND connection_url = :connection_url;"
            res = await self.db_manager.execute_query(select_query, {"alias": alias.strip(), "connection_url": connection_url.strip()})
            return res[0]["id"]

    async def get_database(self, db_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves details of a specific database configuration."""
        query = "SELECT id, alias, connection_url, enterprise_id, created_at FROM databases WHERE id = :id;"
        rows = await self.db_manager.execute_query(query, {"id": db_id})
        return rows[0] if rows else None

    async def get_databases(self, enterprise_id: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieves all connected databases for a user or enterprise."""
        if enterprise_id is not None:
            query = "SELECT id, alias, connection_url, enterprise_id, created_at FROM databases WHERE enterprise_id = :enterprise_id ORDER BY id ASC;"
            params = {"enterprise_id": enterprise_id}
        else:
            query = "SELECT id, alias, connection_url, enterprise_id, created_at FROM databases WHERE enterprise_id IS NULL ORDER BY id ASC;"
            params = {}
        return await self.db_manager.execute_query(query, params)

    async def delete_database(self, db_id: int, enterprise_id: Optional[int] = None) -> bool:
        """Disconnects a database from the enterprise/user profile."""
        if enterprise_id is not None:
            query = "DELETE FROM databases WHERE id = :id AND enterprise_id = :enterprise_id;"
            params = {"id": db_id, "enterprise_id": enterprise_id}
        else:
            query = "DELETE FROM databases WHERE id = :id AND enterprise_id IS NULL;"
            params = {"id": db_id}
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(query), params)
            return result.rowcount > 0

    async def update_user_feature_permissions(
        self, 
        user_id: int, 
        can_view_alerts: int, 
        can_view_schema: int, 
        enterprise_id: Optional[int]
    ) -> bool:
        """Updates the feature visibility permissions of a user."""
        if enterprise_id is not None:
            update_query = """
            UPDATE users 
            SET can_view_alerts = :can_view_alerts, can_view_schema = :can_view_schema 
            WHERE id = :id AND enterprise_id = :enterprise_id;
            """
            params = {
                "can_view_alerts": can_view_alerts, 
                "can_view_schema": can_view_schema, 
                "id": user_id, 
                "enterprise_id": enterprise_id
            }
        else:
            update_query = """
            UPDATE users 
            SET can_view_alerts = :can_view_alerts, can_view_schema = :can_view_schema 
            WHERE id = :id AND enterprise_id IS NULL;
            """
            params = {
                "can_view_alerts": can_view_alerts, 
                "can_view_schema": can_view_schema, 
                "id": user_id
            }
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(update_query), params)
            return result.rowcount > 0

    async def grant_database_access(self, user_id: int, database_id: str):
        """Grants a user access to a specific database ID."""
        insert_query = """
        INSERT OR IGNORE INTO user_database_permissions (user_id, database_id)
        VALUES (:user_id, :database_id);
        """
        async with self.db_manager.engine.begin() as conn:
            await conn.execute(text(insert_query), {"user_id": user_id, "database_id": database_id})

    async def revoke_database_access(self, user_id: int, database_id: str):
        """Revokes a user's access to a specific database ID."""
        delete_query = """
        DELETE FROM user_database_permissions 
        WHERE user_id = :user_id AND database_id = :database_id;
        """
        async with self.db_manager.engine.begin() as conn:
            await conn.execute(text(delete_query), {"user_id": user_id, "database_id": database_id})

    async def get_user_permitted_databases(self, user_id: int) -> List[str]:
        """Returns the list of database IDs a user has access to."""
        query = "SELECT database_id FROM user_database_permissions WHERE user_id = :user_id;"
        rows = await self.db_manager.execute_query(query, {"user_id": user_id})
        return [row["database_id"] for row in rows]

    async def check_user_database_access(self, user_id: int, database_id: str) -> bool:
        """Checks if a user has access to a specific database."""
        query = "SELECT 1 FROM user_database_permissions WHERE user_id = :user_id AND database_id = :database_id;"
        rows = await self.db_manager.execute_query(query, {"user_id": user_id, "database_id": database_id})
        return len(rows) > 0

    async def create_chat_session(self, user_id: int, title: str, database_id: str) -> int:
        """Creates a new chat session and returns its ID."""
        insert_query = """
        INSERT INTO chat_sessions (user_id, title, database_id)
        VALUES (:user_id, :title, :database_id)
        RETURNING id;
        """
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(insert_query), {
                "user_id": user_id,
                "title": title.strip(),
                "database_id": database_id
            })
            row = result.fetchone()
            if row:
                return row[0]
            # Fallback
            select_query = "SELECT MAX(id) as max_id FROM chat_sessions WHERE user_id = :user_id;"
            res = await self.db_manager.execute_query(select_query, {"user_id": user_id})
            return res[0]["max_id"] if res else 1

    async def get_chat_sessions(self, user_id: int, database_id: str) -> List[Dict[str, Any]]:
        """Returns all chat sessions for a specific user and database."""
        query = """
        SELECT id, title, database_id, created_at 
        FROM chat_sessions 
        WHERE user_id = :user_id AND database_id = :database_id 
        ORDER BY id DESC;
        """
        return await self.db_manager.execute_query(query, {"user_id": user_id, "database_id": database_id})

    async def delete_chat_session(self, session_id: int, user_id: int) -> bool:
        """Deletes a chat session belonging to a user."""
        query = "DELETE FROM chat_sessions WHERE id = :session_id AND user_id = :user_id;"
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(query), {"session_id": session_id, "user_id": user_id})
            return result.rowcount > 0

    async def create_chat_message(
        self,
        session_id: int,
        user_query: str,
        generated_sql: Optional[str],
        query_results: Optional[str],
        execution_error: Optional[str],
        retry_count: int,
        narrative_response: Optional[str]
    ) -> int:
        """Creates a new chat message in a session."""
        insert_query = """
        INSERT INTO chat_messages (
            session_id, user_query, generated_sql, query_results, 
            execution_error, retry_count, narrative_response
        )
        VALUES (
            :session_id, :user_query, :generated_sql, :query_results, 
            :execution_error, :retry_count, :narrative_response
        )
        RETURNING id;
        """
        params = {
            "session_id": session_id,
            "user_query": user_query,
            "generated_sql": generated_sql or "",
            "query_results": query_results or "[]",
            "execution_error": execution_error or "",
            "retry_count": retry_count,
            "narrative_response": narrative_response or ""
        }
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(insert_query), params)
            row = result.fetchone()
            if row:
                return row[0]
            # Fallback
            select_query = "SELECT MAX(id) as max_id FROM chat_messages WHERE session_id = :session_id;"
            res = await self.db_manager.execute_query(select_query, {"session_id": session_id})
            return res[0]["max_id"] if res else 1

    async def get_chat_messages(self, session_id: int) -> List[Dict[str, Any]]:
        """Returns all chat messages inside a session ordered chronologically."""
        query = """
        SELECT id, session_id, user_query, generated_sql, query_results, 
               execution_error, retry_count, narrative_response, created_at 
        FROM chat_messages 
        WHERE session_id = :session_id 
        ORDER BY id ASC;
        """
        return await self.db_manager.execute_query(query, {"session_id": session_id})

    async def update_chat_session_title(self, session_id: int, user_id: int, title: str) -> bool:
        """Updates the title of a chat session."""
        query = "UPDATE chat_sessions SET title = :title WHERE id = :session_id AND user_id = :user_id;"
        async with self.db_manager.engine.begin() as conn:
            result = await conn.execute(text(query), {"title": title.strip(), "session_id": session_id, "user_id": user_id})
            return result.rowcount > 0

    async def close(self):
        await self.db_manager.close()
