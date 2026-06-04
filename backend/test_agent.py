import asyncio
from app.agents.sql_agent import agent_executor

async def run_agent(question: str):
    print("\n" + "="*50)
    print(f"QUESTION: {question}")
    print("="*50)
    
    # Initialize the input state dictionary
    inputs = {
        "user_query": question,
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
    print(f"Results Count: {len(final_state.get('query_results') or [])} rows")
    
    print("\n--- EXECUTIVE SUMMARY (TL;DR) ---")
    print(final_state.get("narrative_response"))
    print("="*50 + "\n")

async def main():
    # Test Query 1: Simple Retrieval
    await run_agent("How many customers are from Brazil?")
    
    # Test Query 2: Complex Join & Business Glossary ("sales")
    await run_agent("Who are the top 3 support representatives based on total customer sales?")

if __name__ == "__main__":
    asyncio.run(main())
