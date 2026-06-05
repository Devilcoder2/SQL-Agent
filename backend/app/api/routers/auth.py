# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends
from app.core.auth import (
    auth_db, hash_password, verify_password, create_access_token, 
    get_current_user, require_admin
)
from app.api.schemas import (
    RegisterSingleRequest, RegisterEnterpriseRequest, LoginRequest, 
    CreateEnterpriseUserRequest, UpdateUserRoleRequest, UpdateUserPermissionsRequest,
    SetUserDatabasePermissionRequest
)

router = APIRouter(prefix="/api/v1", tags=["Authentication"])

@router.post("/auth/register-single")
async def register_single(req: RegisterSingleRequest):
    existing = await auth_db.get_user_by_username(req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already registered.")
    
    hashed = hash_password(req.password)
    user_id = await auth_db.create_user(
        username=req.username,
        password_hash=hashed,
        role="admin",
        tenant_type="single"
    )
    return {"status": "success", "message": "Single admin account registered.", "user_id": user_id}

@router.post("/auth/register-enterprise")
async def register_enterprise(req: RegisterEnterpriseRequest):
    existing_ent = await auth_db.get_enterprise_by_name(req.enterprise_name)
    if existing_ent:
        raise HTTPException(status_code=400, detail="Enterprise name already registered.")
    
    existing_user = await auth_db.get_user_by_username(req.username)
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already registered.")

    ent_id = await auth_db.create_enterprise(req.enterprise_name)
    hashed = hash_password(req.password)
    user_id = await auth_db.create_user(
        username=req.username,
        password_hash=hashed,
        role="admin",
        tenant_type="enterprise",
        enterprise_id=ent_id
    )
    return {"status": "success", "message": "Enterprise registered successfully.", "enterprise_id": ent_id, "user_id": user_id}

@router.post("/auth/login")
async def login(req: LoginRequest):
    user = await auth_db.get_user_by_username(req.username)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    
    if not verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid username or password.")
    
    if user["tenant_type"] == "enterprise":
        if req.enterprise_name and user["enterprise_name"].lower() != req.enterprise_name.lower().strip():
            raise HTTPException(status_code=401, detail="Incorrect enterprise organization name.")
    
    token_data = {
        "sub": user["username"],
        "role": user["role"],
        "tenant_type": user["tenant_type"],
        "enterprise_id": user["enterprise_id"]
    }
    access_token = create_access_token(token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "username": user["username"],
            "role": user["role"],
            "tenant_type": user["tenant_type"],
            "enterprise_name": user["enterprise_name"],
            "can_view_alerts": user.get("can_view_alerts", 1) == 1,
            "can_view_schema": user.get("can_view_schema", 1) == 1
        }
    }

@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    return {"user": current_user}

@router.get("/enterprise/users")
async def get_enterprise_users(current_user: dict = Depends(get_current_user)):
    users = await auth_db.get_enterprise_users(current_user["enterprise_id"])
    return {"users": users}

@router.post("/enterprise/users")
async def add_enterprise_user(req: CreateEnterpriseUserRequest, current_user: dict = Depends(require_admin)):
    existing = await auth_db.get_user_by_username(req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists.")
    
    hashed = hash_password(req.password)
    new_user_id = await auth_db.create_user(
        username=req.username,
        password_hash=hashed,
        role=req.role,
        tenant_type=current_user["tenant_type"],
        enterprise_id=current_user["enterprise_id"]
    )
    return {"status": "success", "message": f"User '{req.username}' created.", "user_id": new_user_id}

@router.delete("/enterprise/users/{user_id}")
async def delete_enterprise_user(user_id: int, current_user: dict = Depends(require_admin)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrative account.")
    
    deleted = await auth_db.delete_enterprise_user(user_id, current_user["enterprise_id"])
    if not deleted:
        raise HTTPException(status_code=404, detail="User not found in this enterprise.")
    
    return {"status": "success", "message": "User deleted successfully."}

@router.put("/enterprise/users/{user_id}/role")
async def update_enterprise_user_role(user_id: int, req: UpdateUserRoleRequest, current_user: dict = Depends(require_admin)):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own administrative role.")
    
    updated = await auth_db.update_user_role(user_id, req.role, current_user["enterprise_id"])
    if not updated:
        raise HTTPException(status_code=404, detail="User not found in this enterprise.")
    
    return {"status": "success", "message": "User role updated successfully."}

@router.put("/enterprise/users/{user_id}/permissions")
async def update_enterprise_user_permissions(
    user_id: int, 
    req: UpdateUserPermissionsRequest, 
    current_user: dict = Depends(require_admin)
):
    if user_id == current_user["id"]:
        raise HTTPException(status_code=400, detail="Cannot change your own administrative permissions.")
    
    updated = await auth_db.update_user_feature_permissions(
        user_id, 
        1 if req.can_view_alerts else 0, 
        1 if req.can_view_schema else 0, 
        current_user["enterprise_id"]
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found in this enterprise.")
    
    return {"status": "success", "message": "User permissions updated successfully."}

@router.get("/enterprise/users/{user_id}/databases")
async def get_user_database_permissions(
    user_id: int, 
    current_user: dict = Depends(require_admin)
):
    target_user = await auth_db.get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if current_user["enterprise_id"] != target_user["enterprise_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: User belongs to another enterprise.")
        
    db_records = await auth_db.get_databases(enterprise_id=current_user["enterprise_id"])
    databases = [
        {
            "id": "default",
            "alias": "Default (Chinook)"
        }
    ]
    for db in db_records:
        databases.append({
            "id": str(db["id"]),
            "alias": db["alias"]
        })
        
    permitted_db_ids = await auth_db.get_user_permitted_databases(user_id)
    
    result = []
    for db in databases:
        has_access = True if target_user["role"] == "admin" else (db["id"] in permitted_db_ids)
        result.append({
            "id": db["id"],
            "alias": db["alias"],
            "has_access": has_access
        })
        
    return {"databases": result}

@router.post("/enterprise/users/{user_id}/databases")
async def set_user_database_permission(
    user_id: int, 
    req: SetUserDatabasePermissionRequest, 
    current_user: dict = Depends(require_admin)
):
    target_user = await auth_db.get_user_by_id(user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found.")
        
    if current_user["enterprise_id"] != target_user["enterprise_id"]:
        raise HTTPException(status_code=403, detail="Forbidden: User belongs to another enterprise.")
        
    if target_user["role"] == "admin":
        raise HTTPException(status_code=400, detail="Cannot change database permissions for administrators.")
        
    if req.has_access:
        await auth_db.grant_database_access(user_id, req.database_id)
    else:
        await auth_db.revoke_database_access(user_id, req.database_id)
        
    return {"status": "success", "message": "User database access updated."}
