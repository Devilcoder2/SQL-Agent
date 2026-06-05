import time
import json
from typing import List, Dict, Any, Optional, Set
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, HTTPException, Depends, Form
from app.agents.sql_agent import agent_executor, db_manager, vector_store
from app.core.auth import get_current_user, get_active_db, auth_db
from app.core.database import get_db_manager
from app.core.audit import audit_manager
from app.api.schemas import QueryRequest, QueryResponse, GlossaryTermRequest, CreateChatSessionRequest, CreateDashboardWidgetRequest

router = APIRouter(tags=["Query & Metadata"])

@router.get("/api/v1/chats")
async def get_chats(
    current_user: dict = Depends(get_current_user),
    active_db: dict = Depends(get_active_db)
):
    try:
        sessions = await auth_db.get_chat_sessions(current_user["id"], active_db["id"])
        return {"chats": sessions}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch chats: {str(e)}")

@router.post("/api/v1/chats")
async def create_chat(
    request: CreateChatSessionRequest,
    current_user: dict = Depends(get_current_user),
    active_db: dict = Depends(get_active_db)
):
    try:
        session_id = await auth_db.create_chat_session(
            user_id=current_user["id"],
            title=request.title or "New Chat",
            database_id=active_db["id"]
        )
        return {"id": session_id, "title": request.title or "New Chat", "database_id": active_db["id"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create chat: {str(e)}")

@router.delete("/api/v1/chats/{session_id}")
async def delete_chat(
    session_id: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        success = await auth_db.delete_chat_session(session_id, current_user["id"])
        if not success:
            raise HTTPException(status_code=404, detail="Chat session not found or not owned by user.")
        return {"status": "success", "message": "Chat session deleted successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete chat: {str(e)}")

@router.get("/api/v1/chats/{session_id}/messages")
async def get_chat_messages(
    session_id: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        check_query = "SELECT database_id FROM chat_sessions WHERE id = :session_id AND user_id = :user_id;"
        rows = await auth_db.db_manager.execute_query(check_query, {"session_id": session_id, "user_id": current_user["id"]})
        if not rows:
            raise HTTPException(status_code=404, detail="Chat session not found or access denied.")
            
        messages = await auth_db.get_chat_messages(session_id)
        
        formatted_messages = []
        for msg in messages:
            results = []
            if msg.get("query_results"):
                try:
                    results = json.loads(msg["query_results"])
                except Exception:
                    results = []
            formatted_messages.append({
                "id": msg["id"],
                "session_id": msg["session_id"],
                "user_query": msg["user_query"],
                "generated_sql": msg["generated_sql"],
                "query_results": results,
                "execution_error": msg["execution_error"],
                "retry_count": msg["retry_count"],
                "narrative_response": msg["narrative_response"],
                "created_at": msg["created_at"]
            })
        return {"messages": formatted_messages}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch messages: {str(e)}")

@router.post("/api/v1/query", response_model=QueryResponse)
async def run_query(
    request: QueryRequest,
    current_user: dict = Depends(get_current_user),
    active_db: dict = Depends(get_active_db)
):
    start_time = time.time()
    
    # Resolve or create a chat session
    session_id = request.session_id
    if session_id:
        check_query = "SELECT database_id FROM chat_sessions WHERE id = :session_id AND user_id = :user_id;"
        rows = await auth_db.db_manager.execute_query(check_query, {"session_id": session_id, "user_id": current_user["id"]})
        if not rows:
            raise HTTPException(status_code=404, detail="Chat session not found or access denied.")
        if rows[0]["database_id"] != active_db["id"]:
            raise HTTPException(status_code=400, detail="Chat session belongs to a different database.")
    else:
        session_id = await auth_db.create_chat_session(
            user_id=current_user["id"],
            title="New Chat",
            database_id=active_db["id"]
        )

    inputs = {
        "user_query": request.query,
        "user_role": current_user["role"],
        "database_id": active_db["id"],
        "database_url": active_db["url"],
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
        
        # Check and update session title if it is default
        title_query = "SELECT title FROM chat_sessions WHERE id = :session_id;"
        title_rows = await auth_db.db_manager.execute_query(title_query, {"session_id": session_id})
        if title_rows and title_rows[0]["title"] == "New Chat":
            new_title = request.query[:50]
            if len(request.query) > 50:
                new_title += "..."
            await auth_db.update_chat_session_title(session_id, current_user["id"], new_title)

        # Save successful/blocked/failed query logs into chat messages
        results_str = "[]"
        if final_state.get("query_results") is not None:
            try:
                results_str = json.dumps(final_state["query_results"])
            except Exception:
                results_str = "[]"

        await auth_db.create_chat_message(
            session_id=session_id,
            user_query=request.query,
            generated_sql=final_state.get("generated_sql"),
            query_results=results_str,
            execution_error=final_state.get("execution_error"),
            retry_count=final_state.get("retry_count", 0),
            narrative_response=final_state.get("narrative_response") or ""
        )
        
        return QueryResponse(
            user_query=final_state["user_query"],
            user_role=final_state["user_role"],
            relevant_tables=final_state["relevant_tables"],
            generated_sql=final_state["generated_sql"],
            query_results=final_state["query_results"],
            execution_error=final_state["execution_error"],
            retry_count=final_state["retry_count"],
            narrative_response=final_state["narrative_response"] or "",
            session_id=session_id
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
        
        # Log exception failure in chat messages
        try:
            await auth_db.create_chat_message(
                session_id=session_id,
                user_query=request.query,
                generated_sql=None,
                query_results="[]",
                execution_error=str(e),
                retry_count=0,
                narrative_response="System Execution Error"
            )
        except Exception:
            pass
            
        raise HTTPException(status_code=500, detail=f"Agent execution error: {str(e)}")

@router.post("/api/v1/dashboard")
async def add_widget(
    request: CreateDashboardWidgetRequest,
    current_user: dict = Depends(get_current_user),
    active_db: dict = Depends(get_active_db)
):
    try:
        widget_id = await auth_db.create_dashboard_widget(
            user_id=current_user["id"],
            database_id=active_db["id"],
            title=request.title,
            chart_type=request.chart_type,
            x_axis=request.x_axis,
            y_axis=request.y_axis,
            query=request.query,
            generated_sql=request.generated_sql,
            narrative_response=request.narrative_response
        )
        return {"status": "success", "id": widget_id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to pin widget: {str(e)}")

@router.delete("/api/v1/dashboard/{widget_id}")
async def delete_widget(
    widget_id: int,
    current_user: dict = Depends(get_current_user)
):
    try:
        success = await auth_db.delete_dashboard_widget(widget_id, current_user["id"])
        if not success:
            raise HTTPException(status_code=404, detail="Widget not found or not owned by user.")
        return {"status": "success", "message": "Widget unpinned successfully."}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete widget: {str(e)}")

@router.get("/api/v1/dashboard")
async def get_dashboard(
    current_user: dict = Depends(get_current_user),
    active_db: dict = Depends(get_active_db)
):
    try:
        widgets = await auth_db.get_dashboard_widgets(current_user["id"], active_db["id"])
        
        # Real-time execution: run the SQL for each widget!
        db = get_db_manager(active_db["url"])
        
        realtime_widgets = []
        for w in widgets:
            data_results = []
            error_msg = None
            sql = w["generated_sql"]
            if sql:
                try:
                    data_results = await db.execute_query(sql)
                except Exception as ex:
                    error_msg = str(ex)
                    
            realtime_widgets.append({
                "id": w["id"],
                "user_id": w["user_id"],
                "database_id": w["database_id"],
                "title": w["title"],
                "chart_type": w["chart_type"],
                "x_axis": w["x_axis"],
                "y_axis": w["y_axis"],
                "query": w["query"],
                "generated_sql": w["generated_sql"],
                "narrative_response": w["narrative_response"],
                "created_at": w["created_at"],
                "results": data_results,
                "error": error_msg
            })
            
        return {"widgets": realtime_widgets}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dashboard: {str(e)}")

@router.get("/api/v1/tables")
async def get_tables(active_db: dict = Depends(get_active_db), current_user: dict = Depends(get_current_user)):
    if not current_user.get("can_view_schema", True):
        raise HTTPException(status_code=403, detail="Permission Denied: You do not have permission to view schemas.")
    try:
        db = get_db_manager(active_db["url"])
        tables = await db.get_table_names()
        return {"tables": tables}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch table list: {str(e)}")

@router.get("/api/v1/tables/{table_name}/schema")
async def get_table_schema(table_name: str, active_db: dict = Depends(get_active_db), current_user: dict = Depends(get_current_user)):
    if not current_user.get("can_view_schema", True):
        raise HTTPException(status_code=403, detail="Permission Denied: You do not have permission to view schemas.")
    try:
        db = get_db_manager(active_db["url"])
        tables = await db.get_table_names()
        if table_name not in tables:
            raise HTTPException(status_code=404, detail=f"Table '{table_name}' not found.")
        
        columns = await db.get_table_schema(table_name)
        fkeys = await db.get_foreign_keys(table_name)
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
