import os
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

from app.agents.sql_agent import agent_executor, db_manager, vector_store

app = FastAPI(
    title="Enterprise AI SQL Agent API",
    description="Backend API supporting conversational query execution, AST validation, and PII masking.",
    version="1.0.0"
)

# Enable CORS for local client development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    role: str = "general"

class QueryResponse(BaseModel):
    user_query: str
    user_role: str
    relevant_tables: List[str]
    generated_sql: Optional[str]
    query_results: Optional[List[Dict[str, Any]]]
    execution_error: Optional[str]
    retry_count: int
    narrative_response: str

class GlossaryTermRequest(BaseModel):
    term: str
    definition: str
    sql_hint: str

@app.post("/api/v1/query", response_model=QueryResponse)
async def run_query(request: QueryRequest):
    inputs = {
        "user_query": request.query,
        "user_role": request.role,
        "relevant_tables": [],
        "table_schemas": "",
        "glossary_terms": [],
        "generated_sql": None,
        "query_results": None,
        "execution_error": None,
        "retry_count": 0,
        "narrative_response": None
    }
    try:
        final_state = await agent_executor.ainvoke(inputs)
        return QueryResponse(
            user_query=final_state["user_query"],
            user_role=final_state["user_role"],
            relevant_tables=final_state["relevant_tables"],
            generated_sql=final_state["generated_sql"],
            query_results=final_state["query_results"],
            execution_error=final_state["execution_error"],
            retry_count=final_state["retry_count"],
            narrative_response=final_state["narrative_response"] or ""
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")

@app.get("/api/v1/tables")
async def get_tables():
    try:
        tables = await db_manager.get_table_names()
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch table list: {str(e)}")

@app.get("/api/v1/tables/{table_name}/schema")
async def get_table_schema(table_name: str):
    try:
        tables = await db_manager.get_table_names()
        if table_name not in tables:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")
        
        columns = await db_manager.get_table_schema(table_name)
        fkeys = await db_manager.get_foreign_keys(table_name)
        return {
            "table": table_name,
            "columns": columns,
            "foreign_keys": fkeys
        }
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch table schema: {str(e)}")

@app.get("/api/v1/glossary")
async def search_glossary(q: str = ""):
    try:
        results = vector_store.search_glossary(q, limit=10)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Glossary lookup failed: {str(e)}")

@app.post("/api/v1/glossary")
async def add_glossary_term(request: GlossaryTermRequest):
    try:
        vector_store.upsert_glossary_term(request.term, request.definition, request.sql_hint)
        return {"status": "success", "message": f"Glossary term '{request.term}' registered."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register glossary term: {str(e)}")

# Mount static frontend files to root path
frontend_dir = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../frontend/dist")
)
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")

