import time
from typing import List, Dict, Any, Optional, Set
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends, WebSocket, WebSocketDisconnect, Form
from app.agents.sql_agent import agent_executor, db_manager, vector_store
from app.core.auth import get_current_user
from app.core.audit import audit_manager
from app.api.schemas import QueryRequest, QueryResponse, GlossaryTermRequest

router = APIRouter(tags=["Query & Metadata"])

@router.post("/api/v1/query", response_model=QueryResponse)
async def run_query(request: QueryRequest, current_user: dict = Depends(get_current_user)):
    start_time = time.time()
    inputs = {
        "user_query": request.query,
        "user_role": current_user["role"],
        "relevant_tables": [],
        "table_schemas": "",
        "glossary_terms": [],
        "generated_sql": None,
        "query_results": None,
        "execution_error": None,
        "retry_count": 0,
        "narrative_response": None
    }
    
    generated_sql = None
    ast_status = "PASSED"
    error_message = None
    
    try:
        final_state = await agent_executor.ainvoke(inputs)
        generated_sql = final_state.get("generated_sql")
        error_message = final_state.get("execution_error")
        
        if error_message:
            if "Security Exception" in error_message:
                ast_status = "BLOCKED"
            else:
                ast_status = "FAILED"
                
        latency = int((time.time() - start_time) * 1000)
        await audit_manager.log_query(
            user_query=request.query,
            user_role=current_user["role"],
            generated_sql=generated_sql,
            ast_status=ast_status,
            error_message=error_message,
            latency_ms=latency
        )
        
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
        latency = int((time.time() - start_time) * 1000)
        await audit_manager.log_query(
            user_query=request.query,
            user_role=current_user["role"],
            generated_sql=generated_sql,
            ast_status="FAILED",
            error_message=str(e),
            latency_ms=latency
        )
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")

@router.get("/api/v1/tables")
async def get_tables():
    try:
        tables = await db_manager.get_table_names()
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch table list: {str(e)}")

@router.get("/api/v1/tables/{table_name}/schema")
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

@router.get("/api/v1/glossary")
async def search_glossary(q: str = ""):
    try:
        results = vector_store.search_glossary(q, limit=10)
        return {"results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Glossary lookup failed: {str(e)}")

@router.post("/api/v1/glossary")
async def add_glossary_term(request: GlossaryTermRequest):
    try:
        vector_store.upsert_glossary_term(request.term, request.definition, request.sql_hint)
        return {"status": "success", "message": f"Glossary term '{request.term}' registered."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to register glossary term: {str(e)}")

# --- WEBSOCKET Room Session Manager ---
class ConnectionManager: 
    def __init__(self): 
        self.active_connections: Dict[str, Set[WebSocket]] = {}
    
    async def connect(self, websocket: WebSocket, room_id: str): 
        await websocket.accept()

        if room_id not in self.active_connections: 
            self.active_connections[room_id] = set()
        self.active_connections[room_id].add(websocket)
    
    def disconnect(self, websocket: WebSocket, room_id: str): 
        if room_id in self.active_connections: 
            self.active_connections[room_id].remove(websocket)
            if not self.active_connections[room_id]: 
                del self.active_connections[room_id]
    
    async def broadcast(self, message: dict, room_id: str, exclude_websocket: WebSocket = None): 
        if room_id in self.active_connections: 
            for connection in self.active_connections[room_id]: 
                if connection != exclude_websocket: 
                    try: 
                        await connection.send_json(message)
                    except Exception: 
                        pass

manager = ConnectionManager()

@router.websocket("/ws/warroom/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str): 
    await manager.connect(websocket, room_id)
    try: 
        while True: 
            data = await websocket.receive_json()
            await manager.broadcast(data, room_id, exclude_websocket=websocket)
    
    except WebSocketDisconnect: 
        manager.disconnect(websocket, room_id)

# --- Slack Webhook slash command receiver ---
@router.post("/api/v1/webhooks/slack")
async def slack_webhook(text: str = Form(...)):
    inputs = {
        "user_query": text,
        "user_role": "general",
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
        sql = final_state.get("generated_sql") or "-- No SQL statements executed."
        narrative = final_state.get("narrative_response") or "No insights compiled."
        
        # Slack Block Kit payload structure
        blocks = [
            {
                "type": "header",
                "text": {
                    "type": "plain_text",
                    "text": "📊 AI SQL Agent Intelligence Briefing",
                    "emoji": True
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Query Request:* \"{text}\""
                }
            },
            {
                "type": "section",
                "text": {
                    "type": "mrkdwn",
                    "text": f"*Insight Summary:*\n{narrative}"
                }
            },
            {
                "type": "context",
                "elements": [
                    {
                        "type": "mrkdwn",
                        "text": f"*Compiled SQL:* `{sql}`"
                    }
                ]
            }
        ]
        return {"response_type": "in_channel", "blocks": blocks}
    except Exception as e:
        return {
            "response_type": "ephemeral",
            "text": f"⚠️ Agent execution failed: {str(e)}"
        }
