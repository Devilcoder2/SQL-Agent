import os
import re
from typing import Dict, Any, List, Literal
# pyrefly: ignore [missing-import]
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from langchain_google_genai import ChatGoogleGenerativeAI
# pyrefly: ignore [missing-import]
from langchain_core.prompts import ChatPromptTemplate
# pyrefly: ignore [missing-import]
from langgraph.graph import StateGraph, END

from app.core.database import DatabaseManager
from app.core.vector_store import VectorStoreManager
from app.agents.state import AgentState
from app.core.security import verify_sql_safe
from app.core.pii_masker import PIIMasker


llm = ChatGoogleGenerativeAI(model="gemini-3.5-flash", temperature=0.0)
db_manager = DatabaseManager()
vector_store = VectorStoreManager()

def extract_text(content: Any) -> str:
    if isinstance(content, list):
        parts = []
        for part in content:
            if isinstance(part, str):
                parts.append(part)
            elif isinstance(part, dict) and "text" in part:
                parts.append(part["text"])
        return "".join(parts)
    return str(content)

# Helper to strip markdown SQL tags if the LLM wraps code in ```sql ... ```
def clean_sql_query(raw_query: Any) -> str:
    raw_query_str = extract_text(raw_query)
    cleaned = re.sub(r"```sql\s*", "", raw_query_str, flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*", "", cleaned)
    return cleaned.strip()




# ============ NODE DEFINITION ========================
async def retrieve_context(state: AgentState) -> Dict[str, Any]: 
    """Queries ChromaDB to filter relevant tables and glossary definitions."""
    print("Agent Step: Retrieving semantic context...")

    query = state["user_query"]

    tables = vector_store.search_relevant_tables(query, limit=3)

    schemas = []
    for table in tables: 
        columns = await db_manager.get_table_schema(table)
        col_desc = ", ".join([f"{c['name']} ({c['type']})" for c in columns])
        fkeys = await db_manager.get_foreign_keys(table)
        fk_desc = ""
        if fkeys:
            fk_parts = [f"{fk['constrained_columns']} references {fk['referred_table']}.{fk['referred_columns']}" for fk in fkeys]
            fk_desc = f". Foreign Keys: {', '.join(fk_parts)}"
        schemas.append(f"Table: {table}. Columns: {col_desc}{fk_desc}")
    
    glossary = vector_store.search_glossary(query, limit=2)

    return {
        "relevant_tables": tables,
        "table_schemas": "\n".join(schemas),
        "glossary_terms": glossary,
        "retry_count": 0
    }

async def generate_sql(state: AgentState) -> Dict[str, Any]: 
    """Asks the LLM to write a SQL query based on schemas and user request."""
    print("Agent Step: Generating SQL query...")

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a strict, expert SQLite database engineer. Translate the user's question into a clean, executable SQLite query.\n"
            "Only return raw SQL code. Do NOT wrap it in comments or explanations.\n\n"
            "Available Database Schemas:\n{schemas}\n\n"
            "Business Glossary and Hints:\n{glossary}\n"
        )),
        ("user", "Write a SQLite query for: {query}")
    ])

    formatted_glossary = "\n".join([f"- Term: {g['term']}. Hint: {g['sql_hint']}" for g in state["glossary_terms"]])

    chain = prompt | llm 
    response = await chain.ainvoke({
        "schemas": state["table_schemas"],
        "glossary": formatted_glossary,
        "query": state["user_query"]
    })

    sql = clean_sql_query(response.content)
    print(f"Generated SQL: {sql}")
    return {"generated_sql": sql}

async def execute_sql(state: AgentState) -> Dict[str, Any]: 
    """Attempts to execute the generated query on our local SQLite engine."""
    print("Agent Step: Executing SQL query...")

    sql = state["generated_sql"]
    user_role = state.get("user_role", "general")

    #Step - 01: AST security Guard check 
    try: 
        verify_sql_safe(sql)
    except Exception as e: 
        error_msg = str(e)
        print(f"SQL execution blocked by security: {error_msg}")
        return {
            "execution_error": error_msg,
            "query_results": None,
            "retry_count": 3
        }

    #Step - 02: Database query execution
    try: 
        results = await db_manager.execute_query(sql)
        print("SQL executed successfully!")

        #Step - 03: Dynamic PII masking filter 
        masked_results = PIIMasker.mask_dataset(results, user_role)
        return {"query_results": masked_results, "execution_error": None}
    except Exception as e: 
        error_msg = str(e)
        print(f"SQL execution failed: {error_msg}")
        return {"execution_error": error_msg}

async def heal_sql(state: AgentState) -> Dict[str, Any]: 
    """Attempts to self-correct a query that returned a database error."""
    print(f"Agent Step: Self-Healing SQL query (Attempt {state['retry_count'] + 1})...")

    prompt = ChatPromptTemplate.from_messages([
        ("system", (
            "You are a database debugger. The SQLite query you previously generated failed with an error.\n"
            "Correct the query and return ONLY raw SQLite code. Do NOT add markdown blocks or explanations.\n\n"
            "Database Schemas:\n{schemas}\n\n"
            "Failed SQL Query:\n{failed_sql}\n\n"
            "Database Error Trace:\n{error}"
        )),
        ("user", "Fix the SQL query so it runs successfully.")
    ])

    chain = prompt | llm
    response = await chain.ainvoke({
        "schemas": state["table_schemas"],
        "failed_sql": state["generated_sql"],
        "error": state["execution_error"]
    })

    sql = clean_sql_query(response.content)
    print(f"Corrected SQL: {sql}")

    return {
        "generated_sql": sql,
        "retry_count": state["retry_count"] + 1
    }

async def synthesize_narrative(state: AgentState) -> Dict[str, Any]: 
    """Generates a business-focused executive summary of the query results."""
    print("Agent Step: Generating Executive Narrative...")

    if state["query_results"] is not None: 
        prompt = ChatPromptTemplate.from_messages([
            ("system", (
                "You are an expert Business Analyst. Generate a concise, boardroom-ready executive summary (TL;DR) explaining the results.\n"
                "Format your response using clean Markdown syntax (bold text, bullet lists, headers, etc.). Do not use raw HTML.\n"
                "Focus on the business context, trend details, and key numbers.\n\n"
                "SQL Query Used: {sql}\n"
                "Raw Database Results:\n{results}"
            )),
            ("user", "Original Question: {query}")
        ])

        chain = prompt | llm 
        response = await chain.ainvoke({
            "sql": state["generated_sql"],
            "results": str(state["query_results"]),
            "query": state["user_query"]
        })

        return {"narrative_response": extract_text(response.content)}
    
    else: 
        return {
            "narrative_response": (
                f"Sorry, I was unable to retrieve the requested data. "
                f"The database returned this error: '{state['execution_error']}'. "
                f"Please try rephrasing your question."
            )
        }

# ==================== ROUTING LOGIC ====================

def routing_gate(state: AgentState) -> Literal["heal_sql", "synthesize_narrative"]: 
    """Determines whether to retry/correct the query or proceed to output."""

    if state["execution_error"]: 
        if state["retry_count"] < 3: 
            return "heal_sql"
    
    return "synthesize_narrative"

# ==================== BUILD GRAPH ====================

workflow = StateGraph(AgentState)

#Nodes 
workflow.add_node("retrieve_context", retrieve_context)
workflow.add_node("generate_sql", generate_sql)
workflow.add_node("execute_sql", execute_sql)
workflow.add_node("heal_sql", heal_sql)
workflow.add_node("synthesize_narrative", synthesize_narrative)

#edges
workflow.set_entry_point("retrieve_context")
workflow.add_edge("retrieve_context", "generate_sql")
workflow.add_edge("generate_sql", "execute_sql")

workflow.add_conditional_edges(
    "execute_sql",
    routing_gate,
    {
        "heal_sql": "heal_sql",
        "synthesize_narrative": "synthesize_narrative"
    }
)

workflow.add_edge("heal_sql", "execute_sql")
workflow.add_edge("synthesize_narrative", END)

agent_executor = workflow.compile()