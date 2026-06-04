from app.core.security import verify_sql_safe, SQLSecurityError

def run_test(test_name: str, query: str):
    print(f"\nTest: {test_name}")
    print(f"Query: {query}")
    try:
        is_safe = verify_sql_safe(query)
        print(f"Result: ✅ SAFE (Passes inspection)")
    except SQLSecurityError as e:
        print(f"Result: ❌ BLOCKED (Security Error: {e})")

def main():
    print("==================================================")
    print("          TESTING AST SQL GUARDRAILS              ")
    print("==================================================")

    # 1. Safe Query
    run_test(
        "Standard Read Query",
        "SELECT CustomerId, FirstName, LastName FROM Customer WHERE Country = 'Brazil' LIMIT 5;"
    )

    # 2. SQL injection / deletion attempt
    run_test(
        "Direct Table Drop",
        "DROP TABLE Customer;"
    )

    # 3. Data Deletion
    run_test(
        "Data Deletion (DML)",
        "DELETE FROM Invoice WHERE InvoiceId = 10;"
    )

    # 4. Data Insertion
    run_test(
        "Data Insertion (DML)",
        "INSERT INTO Artist (Name) VALUES ('The Coding LLMs');"
    )

    # 5. Multi-statement bypass attempt (Standard bypass pattern)
    run_test(
        "Multi-Statement Injection",
        "SELECT * FROM Artist; DROP TABLE Album;"
    )

    # 6. SQLite Master Catalog Access (Metadata theft attempt)
    run_test(
        "Catalog Scraping",
        "SELECT name FROM sqlite_master WHERE type='table';"
    )

    print("\n==================================================")

if __name__ == "__main__":
    main()
