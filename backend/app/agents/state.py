from typing import TypedDict, List, Dict, Any, Optional

class AgentState(TypedDict): 
    user_query: str
    user_role: str
    relevant_tables: List[str]
    table_schemas: str
    glossary_terms: List[Dict[str, Any]]
    generated_sql: Optional[str]
    query_results: Optional[List[Dict[str, Any]]]
    execution_error: Optional[str]
    retry_count: int
    narrative_response: Optional[str]