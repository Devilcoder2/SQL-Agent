import os
# pyrefly: ignore [missing-import]
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
# pyrefly: ignore [missing-import]
from fastapi.middleware.cors import CORSMiddleware
# pyrefly: ignore [missing-import]
from fastapi.responses import StreamingResponse
# pyrefly: ignore [missing-import]
from fastapi.staticfiles import StaticFiles
# pyrefly: ignore [missing-import]
from pydantic import BaseModel  
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side
from openpyxl.utils import get_column_letter
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
# pyrefly: ignore [missing-import]
from pptx import Presentation
# pyrefly: ignore [missing-import]
from pptx.util import Inches, Pt
# pyrefly: ignore [missing-import]
from pptx.dml.color import RGBColor
from io import BytesIO
from typing import List, Dict, Any, Optional,Set
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

class ExcelExportRequest(BaseModel): 
    results: List[Dict[str, Any]]

class PDFExportRequest(BaseModel): 
    query: str
    narrative: str
    results: List[Dict[str, Any]]

class PPTXExportRequest(BaseModel): 
    query: str
    narrative: str
    sql: str 


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

@app.websocket("/ws/warroom/{room_id}")
async def websocket_endpoint(websocket: WebSocket, room_id: str): 
    await manager.connect(websocket, room_id)
    try: 
        while True: 
            data = await websocket.receive_json()
            await manager.broadcast(data, room_id, exclude_websocket=websocket)
    
    except WebSocketDisconnect: 
        manager.disconnect(websocket, room_id)


# --- Document Exporter Routes ---

@app.post("/api/v1/export/excel")
async def export_excel(req: ExcelExportRequest): 
    if not req.results: 
        raise HTTPException(status_code=400, detail="No data available to export.")
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Query Results"

    headers = list(req.results[0].keys())
    ws.append(headers)

    # Header styling
    header_font = Font(name="Segoe UI", size=11, bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
    center_align = Alignment(horizontal="center", vertical="center")
    border_side = Side(border_style="thin", color="E2E8F0")
    cell_border = Border(left=border_side, right=border_side, top=border_side, bottom=border_side)

    for col_num in range(1, len(headers) + 1): 
        cell = ws.cell(row=1, column=col_num)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = center_align
        cell.border = cell_border
        
    for row_data in req.results:
        row_values = [row_data[h] for h in headers]
        ws.append(row_values)
    
    #Append a SUM formula summary row for numerical columns
    row_count = len(req.results)
    if row_count > 0:
        summary_row = ["Total Summary"] + [""] * (len(headers) - 1)
        ws.append(summary_row)
        ws.cell(row=row_count + 2, column=1).font = Font(bold=True)
        
        for idx, header in enumerate(headers):
            first_val = req.results[0][header]
            if isinstance(first_val, (int, float)) and idx > 0:
                col_letter = get_column_letter(idx + 1)
                formula_cell = ws.cell(row=row_count + 2, column=idx + 1)
                formula_cell.value = f"=SUM({col_letter}2:{col_letter}{row_count + 1})"
                formula_cell.font = Font(bold=True)
                formula_cell.border = cell_border
                
    for col in ws.columns:
        max_len = max(len(str(cell.value or '')) for cell in col)
        col_letter = get_column_letter(col[0].column)
        ws.column_dimensions[col_letter].width = max(max_len + 3, 12)
    
    file_stream = BytesIO()
    wb.save(file_stream)
    file_stream.seek(0)
    
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=query_results.xlsx"}
    )

@app.post("/api/v1/export/pptx")
async def export_pptx(req: PPTXExportRequest):
    prs = Presentation()
    
    slate_dark = RGBColor(15, 23, 42)
    blue_primary = RGBColor(37, 99, 235)
    text_dark = RGBColor(51, 65, 85)
    
    # Slide 1: Cover Slide
    slide = prs.slides.add_slide(prs.slide_layouts[5])
    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(1), Inches(9), Inches(1))
    tf = title_box.text_frame
    p = tf.add_paragraph()
    p.text = "SQL Intelligence Slide Deck"
    p.font.bold = True
    p.font.size = Pt(36)
    p.font.color.rgb = blue_primary
    
    query_box = slide.shapes.add_textbox(Inches(0.5), Inches(2.5), Inches(9), Inches(2))
    qtf = query_box.text_frame
    qp = qtf.add_paragraph()
    qp.text = f"User Request:\n\"{req.query}\""
    qp.font.italic = True
    qp.font.size = Pt(18)
    qp.font.color.rgb = text_dark
    
    # Slide 2: SQL Statement
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(9), Inches(0.8))
    tf = title_box.text_frame
    p = tf.add_paragraph()
    p.text = "Generated SQL Query"
    p.font.bold = True
    p.font.size = Pt(24)
    p.font.color.rgb = blue_primary
    
    sql_box = slide.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(9), Inches(4.5))
    sq_tf = sql_box.text_frame
    sq_tf.word_wrap = True
    sq_p = sq_tf.add_paragraph()
    sq_p.text = req.sql
    sq_p.font.name = "Courier New"
    sq_p.font.size = Pt(12)
    sq_p.font.color.rgb = slate_dark
    
    # Slide 3: Executive Narrative
    slide = prs.slides.add_slide(prs.slide_layouts[6])
    title_box = slide.shapes.add_textbox(Inches(0.5), Inches(0.5), Inches(9), Inches(0.8))
    tf = title_box.text_frame
    p = tf.add_paragraph()
    p.text = "Executive Briefing Summary"
    p.font.bold = True
    p.font.size = Pt(24)
    p.font.color.rgb = blue_primary
    
    narr_box = slide.shapes.add_textbox(Inches(0.5), Inches(1.5), Inches(9), Inches(4.5))
    n_tf = narr_box.text_frame
    n_tf.word_wrap = True
    
    for paragraph_text in req.narrative.split("\n"):
        if paragraph_text.strip():
            np = n_tf.add_paragraph()
            np.text = paragraph_text.strip()
            np.font.size = Pt(14)
            np.font.color.rgb = text_dark
            np.space_after = Pt(8)
            
    file_stream = BytesIO()
    prs.save(file_stream)
    file_stream.seek(0)
    
    return StreamingResponse(
        file_stream,
        media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
        headers={"Content-Disposition": "attachment; filename=briefing_deck.pptx"}
    )


# Mount static frontend files to root path
frontend_dir = os.path.normpath(
    os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../frontend/dist")
)
if os.path.exists(frontend_dir):
    app.mount("/", StaticFiles(directory=frontend_dir, html=True), name="static")

