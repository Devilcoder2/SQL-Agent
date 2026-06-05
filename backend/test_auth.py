import asyncio
# pyrefly: ignore [missing-import]
import pytest
from app.core.auth import hash_password, verify_password, create_access_token, decode_access_token
from app.core.auth_db import AuthDatabaseManager

@pytest.mark.asyncio
async def test_password_cryptography():
    password = "SuperSecretPassword123!"
    hashed = hash_password(password)
    
    assert hashed != password
    assert verify_password(password, hashed) is True
    assert verify_password("wrong_password", hashed) is False

@pytest.mark.asyncio
async def test_jwt_operations():
    payload = {"sub": "john_doe", "role": "analyst", "tenant_type": "single"}
    token = create_access_token(payload)
    decoded = decode_access_token(token)
    
    assert decoded is not None
    assert decoded["sub"] == "john_doe"
    assert decoded["role"] == "analyst"
    assert decoded["tenant_type"] == "single"

@pytest.mark.asyncio
async def test_database_operations():
    # Setup test-specific in-memory auth DB
    db = AuthDatabaseManager(db_url="sqlite://")
    await db.initialize()
    
    # 1. Create single user admin
    user_id = await db.create_user("admin_john", "hash123", "admin", "single")
    assert user_id > 0
    
    user = await db.get_user_by_username("admin_john")
    assert user is not None
    assert user["role"] == "admin"
    assert user["tenant_type"] == "single"
    assert user["enterprise_id"] is None
    
    # 2. Create enterprise & enterprise admin
    ent_id = await db.create_enterprise("Test Enterprise Corp")
    assert ent_id > 0
    
    ent = await db.get_enterprise_by_name("Test Enterprise Corp")
    assert ent is not None
    assert ent["id"] == ent_id
    
    admin_id = await db.create_user("corp_admin", "hash456", "admin", "enterprise", ent_id)
    assert admin_id > 0
    
    staff_id = await db.create_user("corp_staff", "hash789", "general", "enterprise", ent_id)
    assert staff_id > 0
    
    # Check users belong to enterprise
    users = await db.get_enterprise_users(ent_id)
    assert len(users) == 2
    assert users[0]["username"] == "corp_admin"
    assert users[1]["username"] == "corp_staff"
    
    # Update user role
    updated = await db.update_user_role(staff_id, "analyst", ent_id)
    assert updated is True
    
    staff = await db.get_user_by_id(staff_id)
    assert staff["role"] == "analyst"
    
    # Clean up user
    deleted = await db.delete_enterprise_user(staff_id, ent_id)
    assert deleted is True
    
    users_after = await db.get_enterprise_users(ent_id)
    assert len(users_after) == 1
    
    await db.close()

if __name__ == "__main__":
    import sys
    # Direct runner
    async def run_tests():
        print("Running Password Cryptography Tests...")
        await test_password_cryptography()
        print("Running JWT Claims Verification Tests...")
        await test_jwt_operations()
        print("Running Auth SQLite Database CRUD Tests...")
        await test_database_operations()
        print("🎉 ALL CRITICAL AUTH CHECKS PASSED SUCCESSFULLY!")
        
    asyncio.run(run_tests())
