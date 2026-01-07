from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import logging
from backend.api.helpers import summarize, search, extract, rerank_chunks
from backend.utils.utils import get_current_user

# Local utilities & RAG pipeline
from backend.rag.pipeline import get_or_create_collection

from langchain_core.tools import tool
from langchain_ollama import ChatOllama
from langchain_core.messages import HumanMessage, ToolMessage, SystemMessage

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

llm = ChatOllama(
    model="llama3.2:3b",
    temperature=0.3,
    num_ctx=4096,
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

# ─── Tool definitions (top level, with docstrings) ───────────────────────
@tool
def rag_search(query: str, document_id: int | None = None) -> str:
    """Search the user's documents for relevant information."""
    raise NotImplementedError("Must be executed with user context")

@tool
def rag_summarize(document_id: int | None = None) -> str:
    """Generate a concise summary of the user's documents."""
    raise NotImplementedError("Must be executed with user context")

@tool
def rag_extract(field: str, document_id: int | None = None) -> str:
    """Extract specific information like names, emails, dates from documents."""
    raise NotImplementedError("Must be executed with user context")

# ─── Request schema ──────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    document_id: int | None = None  # None = search all documents

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
1. If the rag_search tool returns "No relevant information found", you MUST tell the user: 
   "I don't have information about that in your uploaded documents."
   
2. NEVER make up information or use general knowledge to answer questions about 
   content that should be in documents (like "What is SQL?" when documents are about transformers)
   
3. Only use general knowledge for:
   - Explaining what the user's documents are ABOUT (e.g., "Your document is a research paper on neural networks")
   - Clarifying questions before searching
   - General conversational responses

4. When information IS found in documents, cite the source file name and page.

5. Be honest: "Your documents don't contain information about [topic]" is a valid answer."""),
    HumanMessage(content=request.message)
]
    
    # store citation from tool path
    final_citations = []
    def stream_response():
        nonlocal final_citations
        try:
            tool_call_results = {}
            used_documents = False  # ← NEW: flag to track if docs were used

            for chunk in model_with_tools.stream(messages): # LLM starts thinking token-by-token, Each chunk is partial output
                if chunk.content:
                    yield f"data: {json.dumps({'content': chunk.content})}\n\n"

                if hasattr(chunk, 'tool_calls') and chunk.tool_calls:
                    tool_call = chunk.tool_calls[0]
                    tool_name = tool_call["name"]
                    args = tool_call["args"]
                    tool_id = tool_call["id"]

                    logger.info(f"🔧 Tool called: {tool_name}")
                    logger.info(f"📋 Args: {json.dumps(args, indent=2)}")

                    try:
                        if tool_name == "rag_search":
                            result = execute_rag_search(args)
                            # extract citations if search was used
                            docs, metas = search(**args, user_email=user_email)
                            _, reranked_metas = rerank_chunks(
                                query=args.get("query", ""),
                                chunks=docs,
                                metadatas=metas,
                                top_k=6
                            )
                            for meta in reranked_metas:
                                final_citations.append({
                                    "document_id":meta.get("document_id"),
                                    "source": meta.get("filename", "unknown"),
                                    "page": meta.get("page", "?"),
                                    "snippet": meta.get("text", "")[:150] + "..."
                                })
                        elif tool_name == "rag_summarize":
                            result = execute_rag_summarize(args)
                        elif tool_name == "rag_extract":
                            result = execute_rag_extract(args)
                        else:
                            result = f"Unknown tool: {tool_name}"

                        # Only count as "used" if we got real info
                        if "No relevant information found" not in result and result.strip():
                            used_documents = True

                        tool_call_results[tool_id] = result
                        logger.info(f"✅ Tool result (first 200 chars): {result[:200]}...")
                    except Exception as tool_error:
                        logger.error(f"❌ Tool error: {str(tool_error)}")
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