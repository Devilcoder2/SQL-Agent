# pyrefly: ignore [missing-import]
from pydantic import BaseModel
from typing import List, Dict, Any, Optional

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

class RegisterEnterpriseRequest(BaseModel):
    enterprise_name: str
    username: str
    password: str

class RegisterSingleRequest(BaseModel):
    username: str
    password: str

class LoginRequest(BaseModel):
    username: str
    password: str
    enterprise_name: Optional[str] = None

class CreateEnterpriseUserRequest(BaseModel):
    username: str
    password: str
    role: str

class UpdateUserRoleRequest(BaseModel):
    role: str

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

class CreateAlertRequest(BaseModel):
    name: str
    query: str
    condition: str
    interval_seconds: int
