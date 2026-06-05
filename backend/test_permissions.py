import asyncio
import pytest
from app.core.auth_db import AuthDatabaseManager

@pytest.mark.asyncio
async def test_default_permissions_on_create():
    # Setup test-specific in-memory auth DB
    db = AuthDatabaseManager(db_url="sqlite://")
    await db.initialize()

    # 1. Create a user
    user_id = await db.create_user(
        username="test_analyst",
        password_hash="pbkdf2:hash",
        role="analyst",
        tenant_type="enterprise",
        enterprise_id=1
    )
    assert user_id > 0

    # Retrieve user and verify defaults
    user = await db.get_user_by_id(user_id)
    assert user is not None
    assert user["can_view_alerts"] == 1
    assert user["can_view_schema"] == 1

    # Verify default DB access was automatically granted
    has_default_access = await db.check_user_database_access(user_id, "default")
    assert has_default_access is True

    await db.close()

@pytest.mark.asyncio
async def test_feature_permissions_toggle():
    # Setup test-specific in-memory auth DB
    db = AuthDatabaseManager(db_url="sqlite://")
    await db.initialize()

    # Create user
    user_id = await db.create_user(
        username="test_analyst_2",
        password_hash="pbkdf2:hash",
        role="analyst",
        tenant_type="enterprise",
        enterprise_id=1
    )

    # Revoke Alerts permission, keep Schema
    updated = await db.update_user_feature_permissions(
        user_id=user_id,
        can_view_alerts=0,
        can_view_schema=1,
        enterprise_id=1
    )
    assert updated is True

    # Check database status
    user = await db.get_user_by_id(user_id)
    assert user["can_view_alerts"] == 0
    assert user["can_view_schema"] == 1

    # Revoke Schema, keep Alerts
    updated = await db.update_user_feature_permissions(
        user_id=user_id,
        can_view_alerts=1,
        can_view_schema=0,
        enterprise_id=1
    )
    assert updated is True

    user = await db.get_user_by_id(user_id)
    assert user["can_view_alerts"] == 1
    assert user["can_view_schema"] == 0

    await db.close()

@pytest.mark.asyncio
async def test_database_permissions_grant_revoke():
    # Setup test-specific in-memory auth DB
    db = AuthDatabaseManager(db_url="sqlite://")
    await db.initialize()

    # Create user
    user_id = await db.create_user(
        username="test_analyst_3",
        password_hash="pbkdf2:hash",
        role="analyst",
        tenant_type="enterprise",
        enterprise_id=1
    )

    # 1. By default, custom db access does not exist
    custom_db_id = "1"
    has_access_before = await db.check_user_database_access(user_id, custom_db_id)
    assert has_access_before is False

    # 2. Grant access
    await db.grant_database_access(user_id, custom_db_id)
    has_access_after = await db.check_user_database_access(user_id, custom_db_id)
    assert has_access_after is True

    # 3. Revoke access
    await db.revoke_database_access(user_id, custom_db_id)
    has_access_revoked = await db.check_user_database_access(user_id, custom_db_id)
    assert has_access_revoked is False

    await db.close()

if __name__ == "__main__":
    async def run_all():
        print("Running Permissions tests...")
        await test_default_permissions_on_create()
        await test_feature_permissions_toggle()
        await test_database_permissions_grant_revoke()
        print("🎉 ALL PERMISSIONS INTEGRATION TESTS PASSED SUCCESSFULLY!")

    asyncio.run(run_all())
