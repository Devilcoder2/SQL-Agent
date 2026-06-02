import asyncio
from app.core.database import DatabaseManager

async def main():
    print("Initializing Database Manager...")
    try:
        db = DatabaseManager()
    except ValueError as e:
        print(f"Error: {e}")
        return

    # 1. Test fetching all table names
    print("\n--- 1. Fetching Table Names ---")
    tables = await db.get_table_names()
    print(f"Discovered {len(tables)} tables:")
    print(tables)

    if not tables:
        print("No tables found! Verify your database file exists in data/chinook.db")
        await db.close()
        return

    # 2. Test fetching columns for a specific table (e.g., 'Customer')
    target_table = "Customer"
    if target_table in tables:
        print(f"\n--- 2. Fetching Schema for '{target_table}' ---")
        columns = await db.get_table_schema(target_table)
        print(f"Columns in '{target_table}':")
        for col in columns[:5]:  # print first 5 columns
            print(f"  - {col['name']} ({col['type']}), Nullable: {col['nullable']}, PK: {col['primary_key']}")
        if len(columns) > 5:
            print(f"  ... and {len(columns) - 5} more columns.")
            
        # Test foreign keys
        print(f"\n--- 3. Fetching Foreign Keys for '{target_table}' ---")
        fkeys = await db.get_foreign_keys(target_table)
        print(f"Foreign keys on '{target_table}':")
        for fk in fkeys:
            print(f"  - {fk['constrained_columns']} -> {fk['referred_table']}.{fk['referred_columns']}")
    else:
        print(f"\nTable '{target_table}' not found to test schema.")

    # 4. Test running a raw query
    print("\n--- 4. Executing Raw Query ---")
    query = "SELECT ArtistId, Name FROM Artist LIMIT 5;"
    print(f"Executing: {query}")
    try:
        results = await db.execute_query(query)
        print("Results:")
        for row in results:
            print(f"  - ID: {row['ArtistId']}, Name: {row['Name']}")
    except Exception as e:
        print(f"Query Execution failed: {e}")

    # Clean up connections
    await db.close()
    print("\nDatabase session closed.")

if __name__ == "__main__":
    # Run the async main function
    asyncio.run(main())
