from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import logging
from api.helpers import summarize, search, extract, rerank_chunks
from utils.utils import get_current_user

# Local utilities & RAG pipeline
from rag.pipeline import get_or_create_collection

from langchain_core.tools import tool
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, ToolMessage, SystemMessage
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://ollama:11434")

llm = ChatOllama(
    model="llama3.2:3b",
    base_url=OLLAMA_BASE_URL,
    temperature=0.1,
    num_ctx=8192,
)

router = APIRouter(prefix="/api", tags=["chat"])

# ─── Base functions (pure, no @tool here) ───────────────────────────────
def rag_search_base(query: str, document_id: int | None = None, user_email: str | None = None) -> str:
    if not user_email:
        return "Error: User not authenticated."
    docs, metas = search(query=query, document_id=document_id, user_email=user_email)
    logger.info(f"Raw retrieval: {len(docs)} chunks for query '{query}'")
    if not docs:
        return "No relevant information found."
    # Re-rank inside search for best results
    reranked_docs, _ = rerank_chunks(query=query, chunks=docs, metadatas=metas, top_k=6, threshold=0.3)
    if not reranked_docs:
        return "No relevant information found."
    return "\n\n".join(reranked_docs)

def rag_summarize_base(document_id: int | None = None, user_email: str | None = None) -> str:
    if not user_email:
        return "Error: User not authenticated."
    docs, _ = search(query="", document_id=document_id, user_email=user_email)
    return summarize(docs)

def rag_extract_base(field: str, document_id: int | None = None, user_email: str | None = None) -> str:
    if not user_email:
        return "Error: User not authenticated."
    docs, metas = search(query=field, document_id=document_id, user_email=user_email)
    if not docs:
        return f"No '{field}' found in documents."
    reranked_docs, _ = rerank_chunks(query=field, chunks=docs, metadatas=metas, top_k=10)
    results = extract(reranked_docs, field)
    if not results:
        return f"No '{field}' found in documents."
    return "\n".join(results[:20])

# ─── Tool definitions with better descriptions ───────────────────────
@tool
def rag_search(query: str, document_id: int | None = None) -> str:
    """
    Search the user's uploaded documents for information relevant to the query.
    
    Args:
        query: The search question or keywords (required, must be a string)
        document_id: Optional ID to search only within a specific document (must be an integer or null)
    
    Returns:
        Relevant text passages from the documents, or "No relevant information found" if nothing matches.
    
    Example:
        rag_search(query="What is the main topic?", document_id=None)
    """
    raise NotImplementedError("Must be executed with user context")

@tool
def rag_summarize(document_id: int | None = None) -> str:
    """
    Generate a concise summary of the user's documents.
    
    Args:
        document_id: Optional ID to summarize only a specific document (must be an integer or null)
    
    Returns:
        A summary of the document content.
    
    Example:
        rag_summarize(document_id=None)
    """
    raise NotImplementedError("Must be executed with user context")

@tool
def rag_extract(field: str, document_id: int | None = None) -> str:
    """
    Extract specific structured information from documents (names, emails, dates, etc.).
    
    Args:
        field: The type of information to extract (e.g., "email", "date", "name")
        document_id: Optional ID to extract from a specific document (must be an integer or null)
    
    Returns:
        List of extracted values.
    
    Example:
        rag_extract(field="email", document_id=None)
    """
    raise NotImplementedError("Must be executed with user context")

# ─── Request schema ──────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    document_id: int | None = None  # None = search all documents

# ─── Argument validation helper ──────────────────────────────────────────
def validate_and_clean_args(tool_name: str, args: dict) -> dict:
    """Validate and clean tool arguments to prevent type errors."""
    cleaned = {}
    
    if tool_name == "rag_search":
        # Ensure query is a string
        query = args.get("query", "")
        if isinstance(query, dict):
            # LLM passed a dict instead of string - extract value if possible
            query = str(query.get("document_id", "")) if query else ""
        cleaned["query"] = str(query) if query else ""
        
        # Ensure document_id is int or None
        doc_id = args.get("document_id")
        if isinstance(doc_id, dict):
            doc_id = None  # Invalid dict, ignore it
        cleaned["document_id"] = int(doc_id) if doc_id is not None and str(doc_id).isdigit() else None
        
    elif tool_name == "rag_summarize":
        doc_id = args.get("document_id")
        if isinstance(doc_id, dict):
            doc_id = None
        cleaned["document_id"] = int(doc_id) if doc_id is not None and str(doc_id).isdigit() else None
        
    elif tool_name == "rag_extract":
        # Ensure field is a string
        field = args.get("field", "")
        if isinstance(field, dict):
            field = ""
        cleaned["field"] = str(field) if field else ""
        
        doc_id = args.get("document_id")
        if isinstance(doc_id, dict):
            doc_id = None
        cleaned["document_id"] = int(doc_id) if doc_id is not None and str(doc_id).isdigit() else None
    
    return cleaned

# ─── Chat endpoint ───────────────────────────────────────────────────────
@router.post("/chat")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    
    user_email = current_user["email"]
    
    if not request.message or not request.message.strip():
        return StreamingResponse(iter(["data: [DONE]\n\n"]), media_type="text/event-stream")

    # Inject user_email via closures
    def execute_rag_search(args): return rag_search_base(**args, user_email=user_email)
    def execute_rag_summarize(args): return rag_summarize_base(**args, user_email=user_email)
    def execute_rag_extract(args): return rag_extract_base(**args, user_email=user_email)

    # Bind tools
    model_with_tools = llm.bind_tools([rag_search, rag_summarize, rag_extract])

    messages = [
        SystemMessage(content="""You are a document Q&A assistant with access to the user's uploaded documents.

CRITICAL RULES:
1. ONLY say "I don't have information about that in your uploaded documents" when:
   - the rag_search tool returns exactly "No relevant information found."
   - OR the tool returns empty / no chunks at all.

2. If the tool returns ANY content (even partial or not perfect match), you MUST:
   - Use that content as the basis for your answer.
   - Never ignore it or say you don't have information.
   - Summarize / explain / quote from it naturally.
   - Cite source file name and page when possible.

3. NEVER make up information or use external/general knowledge for questions that are clearly about the user's documents.

4. When information IS found, always include citations like [filename, page X] where available.

5. If the retrieved content is not directly relevant, politely say so and ask for clarification — but do NOT default to "no information" unless truly nothing was found.

TOOL USAGE RULES:
- Always provide 'query' as a STRING.
- 'document_id' should be INTEGER or null (never dict/object).
- Example: rag_search(query="What is the main topic?", document_id=null)"""),
        HumanMessage(content=request.message)
    ]
    
    # store citation from tool path
    final_citations = []
    def stream_response():
        nonlocal final_citations
        try:
            tool_call_results = {}
            used_documents = False  # flag to track if docs were used

            for chunk in model_with_tools.stream(messages):
                if chunk.content:
                    yield f"data: {json.dumps({'content': chunk.content})}\n\n"

                if hasattr(chunk, 'tool_calls') and chunk.tool_calls:
                    tool_call = chunk.tool_calls[0]
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    tool_id = tool_call["id"]

                    logger.info(f"🔧 Tool called: {tool_name}")
                    logger.info(f"📋 Raw args: {json.dumps(args, indent=2)}")

                    try:
                        # Validate and clean arguments
                        cleaned_args = validate_and_clean_args(tool_name, args)
                        logger.info(f"✨ Cleaned args: {json.dumps(cleaned_args, indent=2)}")
                        
                        if tool_name == "rag_search":
                            # Check if query is empty after cleaning
                            if not cleaned_args.get("query"):
                                result = "Error: Search query cannot be empty. Please provide a search term."
                            else:
                                result = execute_rag_search(cleaned_args)
                                # extract citations if search was used
                                docs, metas = search(**cleaned_args, user_email=user_email)
                                _, reranked_metas = rerank_chunks(
                                    query=cleaned_args.get("query", ""),
                                    chunks=docs,
                                    metadatas=metas,
                                    top_k=6
                                )
                                for meta in reranked_metas:
                                    final_citations.append({
                                        "document_id": meta.get("document_id"),
                                        "source": meta.get("filename", "unknown"),
                                        "page": meta.get("page", "?"),
                                        "snippet": meta.get("text", "")[:150] + "..."
                                    })
                        elif tool_name == "rag_summarize":
                            result = execute_rag_summarize(cleaned_args)
                        elif tool_name == "rag_extract":
                            if not cleaned_args.get("field"):
                                result = "Error: Field to extract cannot be empty."
                            else:
                                result = execute_rag_extract(cleaned_args)
                        else:
                            result = f"Unknown tool: {tool_name}"

                        # Only count as "used" if we got real info
                        if "No relevant information found" not in result and result.strip() and not result.startswith("Error:"):
                            used_documents = True

                        tool_call_results[tool_id] = result
                        logger.info(f"✅ Tool result (first 200 chars): {result[:200]}...")
                    except Exception as tool_error:
                        logger.error(f"❌ Tool error: {str(tool_error)}", exc_info=True)
                        result = f"Error executing tool: {str(tool_error)}"
                        tool_call_results[tool_id] = result

                    messages.append(chunk)
                    messages.append(ToolMessage(content=result, tool_call_id=tool_id))
                    break

            # Final answer
            if tool_call_results:
                logger.info("→ Generating final answer...")
                final_response = llm.invoke(messages)
                
                content = ""
                if hasattr(final_response, 'content'):
                    content = final_response.content
                elif isinstance(final_response, str):
                    content = final_response
                else:
                    content = str(final_response)

                logger.info(f"Final LLM response: {content}")

                # Fallback if empty
                if not content.strip():
                    content = "I don't have that information in your documents."

                # Word-by-word streaming
                words = content.split()
                for word in words:
                    yield f"data: {json.dumps({'content': word + ' '})}\n\n"

            # Send citations ONLY if documents were actually used
            if used_documents and final_citations:
                yield (
                    "data: " + json.dumps({
                        "citations": final_citations
                    }) + "\n\n"
                )
            else:
                yield f"data: {json.dumps({'citations': []})}\n\n"

        except Exception as e:
            logger.error(f"❌ Stream error: {str(e)}", exc_info=True)
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")