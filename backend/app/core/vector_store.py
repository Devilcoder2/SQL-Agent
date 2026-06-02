import os
# pyrefly: ignore [missing-import]
import chromadb
from typing import List, Dict, Any

class VectorStoreManager:
    """
    Manages semantic indexing and querying for database tables and business glossaries 
    using local ChromaDB storage.
    """

    def __init__(self, persist_directory: str = None): 
        self.persist_dir = persist_directory or os.path.join(
            os.path.dirname(os.path.abspath(__file__)), 
            "../../../data/chroma"
        )

        self.client = chromadb.PersistentClient(path=self.persist_dir)

        #1. table_schemas: Stores table structural profiles
        self.table_collection = self.client.get_or_create_collection(
            name="table_schemas",
            metadata={"hnsw:space": "cosine"}  
        )

        # 2. business_glossary: Stores business metrics and definitions
        self.glossary_collection = self.client.get_or_create_collection(
            name="business_glossary",
            metadata={"hnsw:space": "cosine"}
        )
    
    def upsert_tables(self, tables_data: List[Dict[str, Any]]):
        """
        Indexes table structures into ChromaDB.
        tables_data is a list of dicts: [{"name": "TableName", "description": "text summary"}]
        """ 
        ids = [t["name"] for t in tables_data]
        documents = [t["description"] for t in tables_data]
        metadatas = [{"table_name": t["name"]} for t in tables_data]

        self.table_collection.upsert(
            ids=ids,
            documents=documents,
            metadatas=metadatas
        )
    
    def search_relevant_tables(self, query: str, limit: int = 5) -> List[str]:
        """
        Queries ChromaDB for the table names most semantically relevant to the user query.
        """
        results = self.table_collection.query(
            query_texts=[query],
            n_results=limit
        )

        if results and results["metadatas"] and results["metadatas"][0]:
            return [meta["table_name"] for meta in results["metadatas"][0]]
        return []

    def upsert_glossary_term(self, term: str, definition: str, sql_hint: str):
        """
        Stores a custom business term with its definition and the exact SQL code snippet.
        """
        self.glossary_collection.upsert(
            ids=[term.lower().strip()],
            documents=[definition],
            metadatas={
                "term": term,
                "sql_hint": sql_hint
            }
        )
    
    def search_glossary(self, query: str, limit: int = 3) -> List[Dict[str, Any]]:
        """
        Looks up relevant business glossary terms based on user input.
        """
        results = self.glossary_collection.query(
            query_texts=[query],
            n_results=limit
        )

        resolved_terms = []
        if results and results["metadatas"] and results["metadatas"][0]:
            for meta, doc, dist in zip(results["metadatas"][0], results["documents"][0], results["distances"][0]):
                if dist < 0.6:
                    resolved_terms.append({
                        "term": meta["term"],
                        "definition": doc,
                        "sql_hint": meta["sql_hint"],
                        "score": 1 - dist
                    })
        return resolved_terms