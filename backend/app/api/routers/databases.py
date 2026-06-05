import os
from typing import Dict, Any, List
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import get_current_user, auth_db, require_admin
from app.core.database import DatabaseManager, get_db_manager
from app.core.vector_store import VectorStoreManager
from app.api.schemas import AddDatabaseRequest, SetDatabasePermissionRequest

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
        
    # If not admin, filter databases based on user_database_permissions
    if current_user["role"] != "admin":
        permitted_db_ids = await auth_db.get_user_permitted_databases(current_user["id"])
        databases = [db for db in databases if db["id"] in permitted_db_ids]
        
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

@router.get("/{db_id}/permissions")
async def get_database_permissions(db_id: str, current_user: dict = Depends(require_admin)):
    users = await auth_db.get_enterprise_users(current_user["enterprise_id"])
    permitted_user_ids = []
    
    # Query which users have access to db_id
    query = "SELECT user_id FROM user_database_permissions WHERE database_id = :database_id;"
    rows = await auth_db.db_manager.execute_query(query, {"database_id": db_id})
    permitted_user_ids = {row["user_id"] for row in rows}
    
    result = []
    for u in users:
        # Admins always have access, others based on permitted_user_ids
        has_access = True if u["role"] == "admin" else (u["id"] in permitted_user_ids)
        result.append({
            "id": u["id"],
            "username": u["username"],
            "role": u["role"],
            "has_access": has_access
        })
    return {"users": result}

@router.post("/{db_id}/permissions")
async def set_database_permission(
    db_id: str, 
    req: SetDatabasePermissionRequest, 
    current_user: dict = Depends(require_admin)
):
    # Retrieve target user to make sure they belong to same enterprise
    target_user = await auth_db.get_user_by_id(req.user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if current_user["enterprise_id"] != target_user["enterprise_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: User belongs to another enterprise.")
        
    if target_user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot change database permissions for administrators.")
        
    if req.has_access:
        await auth_db.grant_database_access(req.user_id, db_id)
    else:
        # Default database access is also revokable, but let's make sure they aren't locked out entirely if they need it.
        # But yes, the prompt says "as all users may not require access to all the databases, so admin should be able to control that"
        await auth_db.revoke_database_access(req.user_id, db_id)
        
    return {"status": "success", "message": "Database permission updated."}
