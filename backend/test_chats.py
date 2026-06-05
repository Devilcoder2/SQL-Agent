import asyncio
import pytest
from app.core.auth_db import AuthDatabaseManager

@pytest.mark.asyncio
async def test_chat_session_creation_and_title_update():
    # Setup test-specific in-memory auth DB
    db = AuthDatabaseManager(db_url="sqlite://")
    await db.initialize()

    # Create user
    user_id = await db.create_user(
        username="chat_test_user",
        password_hash="pbkdf2:hash",
        role="analyst",
        tenant_type="enterprise",
        enterprise_id=1
    )

    # 1. Create chat session
    session_id = await db.create_chat_session(
        user_id=user_id,
        title="New Chat",
        database_id="default"
    )
    assert session_id > 0

    # 2. Get chat sessions and verify presence
    sessions = await db.get_chat_sessions(user_id, "default")
    assert len(sessions) == 1
    assert sessions[0]["title"] == "New Chat"
    assert sessions[0]["id"] == session_id

    # 3. Update chat session title
    success = await db.update_chat_session_title(
        session_id=session_id,
        user_id=user_id,
        title="Updated Chinook Sales Analysis"
    )
    assert success is True

    # Retrieve and verify updated title
    sessions_updated = await db.get_chat_sessions(user_id, "default")
    assert len(sessions_updated) == 1
    assert sessions_updated[0]["title"] == "Updated Chinook Sales Analysis"

    # 4. Delete session
    deleted = await db.delete_chat_session(session_id, user_id)
    assert deleted is True

    # Get chat sessions and verify empty
    sessions_deleted = await db.get_chat_sessions(user_id, "default")
    assert len(sessions_deleted) == 0

    await db.close()

@pytest.mark.asyncio
async def test_chat_messages_flow():
    # Setup test-specific in-memory auth DB
    db = AuthDatabaseManager(db_url="sqlite://")
    await db.initialize()

    # Create user
    user_id = await db.create_user(
        username="chat_msg_user",
        password_hash="pbkdf2:hash",
        role="analyst",
        tenant_type="enterprise",
        enterprise_id=1
    )

    # Create chat session
    session_id = await db.create_chat_session(
        user_id=user_id,
        title="Chinook Test",
        database_id="default"
    )

    # 1. Create first message
    msg1_id = await db.create_chat_message(
        session_id=session_id,
        user_query="Select 1",
        generated_sql="SELECT 1;",
        query_results='[{"1": 1}]',
        execution_error=None,
        retry_count=0,
        narrative_response="Query returned 1."
    )
    assert msg1_id > 0

    # 2. Create second message
    msg2_id = await db.create_chat_message(
        session_id=session_id,
        user_query="Select 2",
        generated_sql="SELECT 2;",
        query_results='[{"2": 2}]',
        execution_error=None,
        retry_count=1,
        narrative_response="Query returned 2."
    )
    assert msg2_id > 0

    # 3. Retrieve messages and check chronological order and fields
    msgs = await db.get_chat_messages(session_id)
    assert len(msgs) == 2
    assert msgs[0]["id"] == msg1_id
    assert msgs[0]["user_query"] == "Select 1"
    assert msgs[0]["generated_sql"] == "SELECT 1;"
    assert msgs[0]["narrative_response"] == "Query returned 1."

    assert msgs[1]["id"] == msg2_id
    assert msgs[1]["user_query"] == "Select 2"
    assert msgs[1]["generated_sql"] == "SELECT 2;"
    assert msgs[1]["narrative_response"] == "Query returned 2."

    await db.close()

if __name__ == "__main__":
    async def run_all():
        print("Running Chat functionality tests...")
        await test_chat_session_creation_and_title_update()
        await test_chat_messages_flow()
        print("🎉 ALL CHAT INTEGRATION TESTS PASSED SUCCESSFULLY!")

    asyncio.run(run_all())
