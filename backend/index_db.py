import asyncio
from app.core.database import DatabaseManager
from app.core.vector_store import VectorStoreManager

async def index_database_schemas():
    print("Initializing managers...")
    db = DatabaseManager()
    vector_store = VectorStoreManager()
    
    print("Fetching tables from database...")
    tables = await db.get_table_names()
    
    tables_data = []
    
    for table in tables:
        print(f"Reflecting schema for table: {table}...")
        # Get column details
        columns = await db.get_table_schema(table)
        col_desc = ", ".join([f"{c['name']} ({c['type']})" for c in columns])
        
        # Get foreign keys
        fkeys = await db.get_foreign_keys(table)
        fk_desc = ""
        if fkeys:
            fk_parts = []
            for fk in fkeys:
                fk_parts.append(
                    f"{fk['constrained_columns']} references {fk['referred_table']}.{fk['referred_columns']}"
                )
            fk_desc = ". Foreign Keys: " + ", ".join(fk_parts)
            
        # Combine columns and foreign keys into a descriptive schema sentence
        description = f"Table: {table}. Columns: {col_desc}{fk_desc}."
        
        tables_data.append({
            "name": table,
            "description": description
        })
        
    print(f"Indexing {len(tables_data)} tables into ChromaDB...")
    vector_store.upsert_tables(tables_data)
    print("Schema indexing complete!")
    
    # Let's seed some custom business glossary terms
    print("Seeding business glossary terms...")
    vector_store.upsert_glossary_term(
        term="sales",
        definition="Total amount of revenue from invoices and customer purchases.",
        sql_hint="Invoice.Total"
    )
    vector_store.upsert_glossary_term(
        term="support rep",
        definition="An employee of the company assigned to look after or support a customer.",
        sql_hint="Customer.SupportRepId = Employee.EmployeeId"
    )
    vector_store.upsert_glossary_term(
        term="tracks",
        definition="Individual songs or music records stored in the system.",
        sql_hint="Track"
    )
    print("Glossary seeding complete!")
    
    # Close connection
    await db.close()
    
    # --- Verify the search works ---
    print("\n================ TESTING SEMANTIC SEARCH ================")
    
    # Query 1: Looking for invoice information
    search_q1 = "Who is the support rep assigned to customer 'John Doe'?"
    print(f"\nUser query: '{search_q1}'")
    relevant_tables = vector_store.search_relevant_tables(search_q1, limit=3)
    print(f"Top 3 matching tables: {relevant_tables}")
    
    # Query 2: Looking for music formats
    search_q2 = "list songs by genre"
    print(f"\nUser query: '{search_q2}'")
    relevant_tables = vector_store.search_relevant_tables(search_q2, limit=3)
    print(f"Top 3 matching tables: {relevant_tables}")

    # Query 3: Testing business glossary resolution
    search_q3 = "Show total sales per customer"
    print(f"\nUser query: '{search_q3}'")
    glossary_matches = vector_store.search_glossary(search_q3, limit=1)
    if glossary_matches:
        match = glossary_matches[0]
        print(f"Glossary Match Found: '{match['term']}'")
        print(f"  - Definition: {match['definition']}")
        print(f"  - SQL Hint: {match['sql_hint']}")
    else:
        print("No glossary match found.")
        
    print("=========================================================\n")

if __name__ == "__main__":
    asyncio.run(index_database_schemas())
