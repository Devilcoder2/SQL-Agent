import os 
from typing import Dict, List, Any
# pyrefly: ignore [missing-import]
from sqlalchemy import text, inspect
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.asyncio import create_async_engine, AsyncEngine, AsyncConnection
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv

load_dotenv()

class DatabaseManager: 
    """
    Manages connections and asynchronous schema discovery (introspection) 
    for target relational databases.
    """

    def __init__(self, db_url: str = None): 
        self.raw_db_url = db_url or os.getenv("DATABASE_URL")
        if not self.raw_db_url:
            raise ValueError("No database URL provided or found in environment variables.")
        
        self.async_db_url = self._make_url_async(self.raw_db_url)
        self.engine: AsyncEngine = create_async_engine(self.async_db_url, echo=False, future=True)
    
    def _make_url_async(self, url: str) -> str: 
        """Converts standard database URIs to async dialect URIs."""
        if url.startswith("sqlite://"):
            # Replace sqlite:// with sqlite+aiosqlite://
            return url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        elif url.startswith("postgresql://"):
            return url.replace("postgresql://", "postgresql+asyncpg://", 1)
        elif url.startswith("mysql://"):
            return url.replace("mysql://", "mysql+aiomysql://", 1)
        return url
    
    async def execute_query(self, query: str, params: Dict[str, Any] = None) -> List[Dict[str, Any]]: 
        """
        Executes a raw SQL query asynchronously and returns the results as a list of dicts.
        """

        async with self.engine.connect() as conn: 
            result = await conn.execute(text(query), params or {})
            return [dict(row) for row in result.mappings()]

    async def get_table_names(self) -> List[str]: 
        """
        Discovers all available user table names inside the database.
        """

        def _get_tables(conn):
            inspector = inspect(conn)
            return inspector.get_table_names()

        async with self.engine.connect() as conn: 
            return await conn.run_sync(_get_tables)
    
    async def get_table_schema(self, table_name: str) -> List[Dict[str, Any]]:
        """
        Extracts column configurations (names, types, nullability, defaults) for a table.
        """
        def _get_columns(conn):
            inspector = inspect(conn)
            columns = inspector.get_columns(table_name)
            return [
                {
                    "name": col["name"],
                    "type": str(col["type"]),
                    "nullable": col["nullable"],
                    "default": str(col["default"]) if col.get("default") is not None else None,
                    "primary_key": bool(col.get("primary_key", False))
                }
                for col in columns
            ]
        
        async with self.engine.connect() as conn: 
            return await conn.run_sync(_get_columns)
    
    async def get_foreign_keys(self, table_name: str) -> List[Dict[str, Any]]: 
        """
        Extracts foreign key relationship constraints for a table.
        """
        def _get_fkeys(conn):
            inspector = inspect(conn)
            return inspector.get_foreign_keys(table_name)
            
        async with self.engine.connect() as conn:
            return await conn.run_sync(_get_fkeys)
    
    async def close(self):
        """Disposes the engine connection pool."""
        await self.engine.dispose()