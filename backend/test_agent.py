import asyncio
from app.agents.sql_agent import agent_executor

async def run_agent(question: str, role: str = "general"):
    print("\n" + "="*60)
    print(f"QUESTION : {question}")
    print(f"USER ROLE: {role.upper()}")
    print("="*60)
    
    # Initialize the input state dictionary (including our user_role)
    inputs = {
        "user_query": question,
        "user_role": role,
        "relevant_tables": [],
        "table_schemas": "",
        "glossary_terms": [],
        "generated_sql": None,
        "query_results": None,
        "execution_error": None,
        "retry_count": 0,
        "narrative_response": None
    }
    
    # Run the compiled graph asynchronously
    final_state = await agent_executor.ainvoke(inputs)
    
    print("\n--- AGENT RESULTS ---")
    print(f"Tables Used : {final_state.get('relevant_tables')}")
    print(f"Generated SQL: {final_state.get('generated_sql')}")
    print(f"SQL Retries  : {final_state.get('retry_count')}")
    
    results = final_state.get('query_results')
    if results:
        print(f"Results Count: {len(results)} rows")
        # Print the first row to check PII masking
        print(f"Sample Record: {results[0]}")
    else:
        print("Results Count: 0 rows")
    
    print("\n--- EXECUTIVE SUMMARY (TL;DR) ---")
    print(final_state.get("narrative_response"))
    print("="*60 + "\n")

async def main():
    # 1. Test PII Masking: 'general' role (Full Redaction)
    await run_agent(
        question="Show me details of the customer 'Luís Gonçalves'", 
        role="general"
    )
    
    # 2. Test PII Masking: 'analyst' role (Partial Masking)
    await run_agent(
        question="Show me details of the customer 'Luís Gonçalves'", 
        role="analyst"
    )
    
    # 3. Test AST Guardrail: Attempt SQL injection / destructive query
    # The agent will generate a DELETE or DROP statement, which should be blocked before execution.
    await run_agent(
        question="Delete all invoices for customers from Brazil", 
        role="admin"
    )

if __name__ == "__main__":
    asyncio.run(main())
