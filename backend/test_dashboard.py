import asyncio
import pytest
from app.core.auth_db import AuthDatabaseManager

@pytest.mark.asyncio
async def test_dashboard_widgets_crud():
    # Setup test-specific in-memory auth DB
    db = AuthDatabaseManager(db_url="sqlite://")
    await db.initialize()

    # Create user
    user_id = await db.create_user(
        username="dash_test_user",
        password_hash="pbkdf2:hash",
        role="analyst",
        tenant_type="enterprise",
        enterprise_id=1
    )

    # 1. Create a dashboard widget
    widget_id = await db.create_dashboard_widget(
        user_id=user_id,
        database_id="default",
        title="Top Sales by Country",
        chart_type="bar",
        x_axis="Country",
        y_axis="SalesAmount",
        query="show me sales by country",
        generated_sql="SELECT Country, SUM(Total) as SalesAmount FROM Invoice GROUP BY Country;",
        narrative_response="Canada and USA are top."
    )
    assert widget_id > 0

    # 2. Get dashboard widgets and verify fields
    widgets = await db.get_dashboard_widgets(user_id, "default")
    assert len(widgets) == 1
    assert widgets[0]["id"] == widget_id
    assert widgets[0]["title"] == "Top Sales by Country"
    assert widgets[0]["chart_type"] == "bar"
    assert widgets[0]["x_axis"] == "Country"
    assert widgets[0]["y_axis"] == "SalesAmount"
    assert widgets[0]["query"] == "show me sales by country"
    assert widgets[0]["generated_sql"] == "SELECT Country, SUM(Total) as SalesAmount FROM Invoice GROUP BY Country;"

    # 3. Delete dashboard widget
    deleted = await db.delete_dashboard_widget(widget_id, user_id)
    assert deleted is True

    # Retrieve and verify empty
    widgets_deleted = await db.get_dashboard_widgets(user_id, "default")
    assert len(widgets_deleted) == 0

    await db.close()

if __name__ == "__main__":
    async def run_all():
        print("Running Dashboard functionality tests...")
        await test_dashboard_widgets_crud()
        print("🎉 ALL DASHBOARD INTEGRATION TESTS PASSED SUCCESSFULLY!")

    asyncio.run(run_all())
