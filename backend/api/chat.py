from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
# from pathlib import Path

# Add parent directory to path for imports
# sys.path.insert(0, str(Path(__file__).parent.parent.parent))

# Local LLM
from langchain_ollama import OllamaLLM

# Local utilities & RAG pipeline
from backend.utils.utils import get_current_user
from backend.rag.pipeline import get_or_create_collection

router = APIRouter(prefix="/api", tags=["chat"])

# ----------------------
# Local LLM (Ollama) — no API keys needed
# ----------------------
llm = OllamaLLM(
    model="llama3.2:3b",  # Free local LLM (fast & accurate)
    temperature=0.3,
)

# ----------------------
# Request schema
# ----------------------
class ChatRequest(BaseModel):
    message: str
    document_id: int | None = None  # list of filenames to query 

# ----------------------
# Chat endpoint
# ----------------------
@router.post("/chat")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    if not request.message or not request.message.strip():
        return StreamingResponse(
            iter(["data: [DONE]\n\n"]),
            media_type="text/event-stream"
        )
    # Identify user (used to isolate their documents)
    user_email = current_user["email"]
    collection = get_or_create_collection(user_email)  # Get user's document collection
    
    # build filter for selected docs
    where_clause = None
    if request.document_id is not None:
        where_clause = {
            "document_id": request.document_id
        }
        
    # retrieve relevant chunks 
    results = collection.query(
        query_texts=[request.message],
        n_results=6,
        where=where_clause,
        include=["documents", "metadatas"]
    ) 
       
    # 5. Build context and citation list
    context_parts = []    # Holds retrieved document text
    sources = []          # Holds citation 
    
    # Build context and citation list
    if results["documents"] and results["documents"][0]:
        for i, (doc, meta) in enumerate(zip(results["documents"][0], results["metadatas"][0])):
            context_parts.append(f"[{i+1}] {doc}")
            sources.append({"source": meta.get("filename","unknown"), "page": meta.get("page", "?")})
    
    if not context_parts:
        context = "No relevant documents found."
    else:
        context = "\n\n".join(context_parts)

    # Prompt for LLM
    prompt = f"""You are a helpful AI assistant. Answer using ONLY this context:

{context}

Question: {request.message}

Rules:
- If question is vague, ask for clarification
- If no relevant info exists, say so clearly


Answer naturally. Cite sources with [1], [2] if used.
If no info, say: "I don't have information about that in your documents."
"""

    # Streaming generator for LLM output to frontend
    def stream():
        for chunk in llm.stream(prompt):
            yield f"data: {json.dumps({'content': chunk})}\n\n"
        yield f"data: {json.dumps({'citations': sources})}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(stream(), media_type="text/event-stream")
