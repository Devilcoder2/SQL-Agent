import os
import asyncio
import pytest
from app.core.auth_db import AuthDatabaseManager
from app.core.database import DatabaseManager, get_db_manager
from app.core.vector_store import VectorStoreManager

@pytest.mark.asyncio
async def test_auth_db_multi_database_crud():
    # Setup test-specific in-memory auth DB
    db = AuthDatabaseManager(db_url="sqlite://")
    await db.initialize()

    # 1. Create a database record for a single user
    db_id = await db.create_database(
        alias="Marketing DB",
        connection_url="sqlite:///data/marketing.db",
        enterprise_id=None
    )
    assert db_id > 0

    # Retrieve record
    record = await db.get_database(db_id)
    assert record is not None
    assert record["alias"] == "Marketing DB"
    assert record["connection_url"] == "sqlite:///data/marketing.db"
    assert record["enterprise_id"] is None

    # List databases
    dbs = await db.get_databases(enterprise_id=None)
    assert len(dbs) == 1
    assert dbs[0]["alias"] == "Marketing DB"

    # Delete database
    deleted = await db.delete_database(db_id, enterprise_id=None)
    assert deleted is True

    # Check empty list
    dbs_after = await db.get_databases(enterprise_id=None)
    assert len(dbs_after) == 0

    await db.close()

@pytest.mark.asyncio
async def test_database_manager_pool():
    # Verify pool retrieves cached DatabaseManager for same URL
    url_a = "sqlite:///data/chinook.db"
    url_b = "sqlite:///data/chinook.db"

    mgr_a = get_db_manager(url_a)
    mgr_b = get_db_manager(url_b)

    assert mgr_a is mgr_b
    await mgr_a.close()

@pytest.mark.asyncio
async def test_vector_store_isolation():
    # Setup a transient VectorStoreManager using a temporary directory
    import tempfile
    import shutil
    
    tmpdir = tempfile.mkdtemp()
    try:
        vector_store = VectorStoreManager(persist_directory=tmpdir)

        # Index tables for Database A
        tables_a = [
            {"name": "Orders", "description": "Customer order purchase histories for database A."}
        ]
        vector_store.upsert_tables(tables_a, database_id="db_a")

        # Index tables for Database B
        tables_b = [
            {"name": "Orders", "description": "Vendor billing order logs for database B."}
        ]
        vector_store.upsert_tables(tables_b, database_id="db_b")

        # Query Database A
        results_a = vector_store.search_relevant_tables("Who purchased orders?", database_id="db_a")
        assert len(results_a) > 0
        assert results_a[0] == "Orders"

        # Verify that searching Database A does not conflict or return items matching Database B metadata
        results_b = vector_store.search_relevant_tables("Who purchased orders?", database_id="db_b")
        assert len(results_b) > 0
        assert results_b[0] == "Orders"

        # Verify search filtering works correctly
        results_empty = vector_store.search_relevant_tables("Who purchased orders?", database_id="non_existent")
        assert len(results_empty) == 0

        # Delete database A tables
        vector_store.delete_database_tables("db_a")
        results_deleted_a = vector_store.search_relevant_tables("Who purchased orders?", database_id="db_a")
        assert len(results_deleted_a) == 0

        # Database B should still be intact
        results_still_b = vector_store.search_relevant_tables("Who purchased orders?", database_id="db_b")
        assert len(results_still_b) > 0
    finally:
        shutil.rmtree(tmpdir)

if __name__ == "__main__":
    async def run_all():
        print("Running Auth DB Multi-Database CRUD Tests...")
        await test_auth_db_multi_database_crud()
        print("Running Database Connection Pool Tests...")
        await test_database_manager_pool()
        print("Running Vector Store Schema Isolation Tests...")
        await test_vector_store_isolation()
        print("🎉 ALL DYNAMIC MULTI-DATABASE INTEGRATION TESTS PASSED SUCCESSFULLY!")

    asyncio.run(run_all())
