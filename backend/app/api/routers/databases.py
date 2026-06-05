import os
from typing import Dict, Any, List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user, auth_db
from app.core.database import DatabaseManager, get_db_manager
from app.core.vector_store import VectorStoreManager
from app.api.schemas import AddDatabaseRequest

router = APIRouter(prefix="/api/v1/databases", tags=["Databases"])
vector_store = VectorStoreManager()

async def index_database(database_id: str, connection_url: str):
    """
    Reflects the schema of a target database and indexes its tables in ChromaDB.
    """
    db = DatabaseManager(db_url=connection_url)
    try:
        tables = await db.get_table_names()
        tables_data = []
        for table in tables:
            columns = await db.get_table_schema(table)
            col_desc = ", ".join([f"{c['name']} ({c['type']})" for c in columns])
            fkeys = await db.get_foreign_keys(table)
            fk_desc = ""
            if fkeys:
                fk_parts = [f"{fk['constrained_columns']} references {fk['referred_table']}.{fk['referred_columns']}" for fk in fkeys]
                fk_desc = ". Foreign Keys: " + ", ".join(fk_parts)
            description = f"Table: {table}. Columns: {col_desc}{fk_desc}."
            tables_data.append({
                "name": table,
                "description": description
            })
        vector_store.upsert_tables(tables_data, database_id=database_id)
    finally:
        await db.close()

@router.get("")
async def get_databases(current_user: dict = Depends(get_current_user)):
    ent_id = current_user.get("enterprise_id")
    db_records = await auth_db.get_databases(enterprise_id=ent_id)
    
    # Prepend the default database
    databases = [
        {
            "id": "default",
            "alias": "Default (Chinook)",
            "connection_url": os.getenv("DATABASE_URL")
        }
    ]
    for db in db_records:
        databases.append({
            "id": str(db["id"]),
            "alias": db["alias"],
            "connection_url": db["connection_url"]
        })
    return {"databases": databases}

@router.post("")
async def add_database(req: AddDatabaseRequest, current_user: dict = Depends(get_current_user)):
    # Check permissions: only admins (or single user, who is admin) can add databases
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can connect new databases.")
        
    # 1. Validate the connection
    try:
        temp_db = DatabaseManager(req.connection_url)
        # Test connection by doing a light introspection
        await temp_db.get_table_names()
        await temp_db.close()
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail=f"Database connection validation failed: {str(e)}"
        )
        
    # 2. Insert DB record
    ent_id = current_user.get("enterprise_id")
    db_id = await auth_db.create_database(req.alias, req.connection_url, ent_id)
    
    # 3. Index DB tables in ChromaDB
    try:
        await index_database(str(db_id), req.connection_url)
    except Exception as e:
        # Cleanup db record if indexing fails to keep DB consistent
        await auth_db.delete_database(db_id, ent_id)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to index database tables in ChromaDB: {str(e)}"
        )
        
    return {"status": "success", "database_id": str(db_id), "alias": req.alias}

@router.delete("/{db_id}")
async def delete_database(db_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Only admins can disconnect databases.")
        
    if db_id == "default":
        raise HTTPException(status_code=400, detail="Cannot delete default database.")
        
    try:
        db_id_num = int(db_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid database ID format.")
        
    ent_id = current_user.get("enterprise_id")
    deleted = await auth_db.delete_database(db_id_num, ent_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Database not found or access denied.")
        
    # Remove from ChromaDB table collection
    try:
        vector_store.delete_database_tables(db_id)
    except Exception as e:
        # Log error or proceed since DB record is deleted
        print(f"Warning: Failed to delete tables from vector store: {e}")
        
    return {"status": "success", "message": f"Database {db_id} disconnected successfully."}
