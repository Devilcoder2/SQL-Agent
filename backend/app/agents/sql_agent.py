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


llm = ChatGoogleGenerativeAI(mode="gemini-1.5-flash", temperature=0.0)
db_manager = DatabaseManager()
vector_store = VectorStoreManager()

# Helper to strip markdown SQL tags if the LLM wraps code in ```sql ... ```
def clean_sql_query(raw_query: str) -> str:
    cleaned = re.sub(r"```sql\s*", "", raw_query, flags=re.IGNORECASE)
    cleaned = re.sub(r"```\s*", "", cleaned)
    return cleaned.strip()
