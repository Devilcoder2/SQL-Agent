# pyrefly: ignore [missing-import]
import sqlglot
# pyrefly: ignore [missing-import]
from sqlglot import exp, parse
from typing import List

class SQLSecurityError(Exception): 
    """Raised when a SQL query violates security guardrails."""
    pass 

def verify_sql_safe(sql_query: str) -> bool: 
    """
    Parses and walks the Abstract Syntax Tree (AST) of the SQL query.
    Blocks destructive actions (inserts, updates, drops, etc.) 
    and system schema scraping.
    """

    try: 
        statements = list(parse(sql_query))
    except Exception as e: 
        raise SQLSecurityError(f"SQL parsing syntax error during safety check: {e}")
    
    if not statements: 
        raise SQLSecurityError("Empty SQL query detected.")

    PROHIBITED_NODES = (
        exp.Drop,       
        exp.Insert,     
        exp.Update, 
        exp.Delete,     
        exp.Alter,      
        exp.Create,     
        exp.Command,    
        exp.Merge  
    )

    for stmt in statements: 
        for node in stmt.walk(): 
            if isinstance(node, PROHIBITED_NODES): 
                raise SQLSecurityError(
                    f"Security Exception: Operation '{type(node).__name__.upper()}' is forbidden. "
                    f"Only read-only SELECT queries are allowed."
                )
            
            if isinstance(node, exp.Table):
                table_name = node.name.lower()
                if table_name in ("sqlite_master", "sqlite_temp_master", "sqlite_schema", "sqlite_temp_schema"):
                    raise SQLSecurityError(
                        "Security Exception: Accessing database catalog system tables is prohibited."
                    )
    
    return True