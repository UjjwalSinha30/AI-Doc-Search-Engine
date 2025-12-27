from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import json
import logging
from backend.api.helpers import summarize, search, extract
from backend.utils.utils import get_current_user

# Local utilities & RAG pipeline
from backend.utils.utils import get_current_user
from backend.rag.pipeline import get_or_create_collection
# @tool → tells LLM "this function can be called"
from langchain_core.tools import tool 
# ChatOllama → supports tool calling
from langchain_ollama import ChatOllama
# HumanMessage → user input
# ToolMessage → tool result sent back to LLM
from langchain_core.messages import HumanMessage, ToolMessage, SystemMessage

# Local LLM - THIS IS REQUIRED
from langchain_ollama import OllamaLLM

# setup logging 
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize the local LLM
llm = ChatOllama(
    model="llama3.2:3b",
    temperature=0.3,
    num_ctx=4096,
)

router = APIRouter(prefix="/api", tags=["chat"])

# Define base functions 
def rag_search_base(query: str, document_id: int | None = None, user_email: str | None = None) -> str:
    """Search the user's documents for relevant information."""
    if not user_email:
        return "Error: User not authenticated."
    docs, _ = search(query=query, document_id=document_id, user_email=user_email)
    if not docs:
        return "No relevant information found."
    return "\n\n".join(docs[:10])

def rag_summarize_base(document_id: int | None = None, user_email: str | None = None) -> str:
    """Generate a concise summary of the user's documents."""
    if not user_email:
        return "Error: User not authenticated."
    docs, _ = search(query="", document_id=document_id, user_email=user_email)
    return summarize(docs)

def rag_extract_base(field: str, document_id: int | None = None, user_email: str | None = None) -> str:
    """Extract specific information like names, emails, dates from documents."""
    if not user_email:
        return "Error: User not authenticated."
    docs, _ = search(query=field, document_id=document_id, user_email=user_email)
    results = extract(docs, field)
    if not results:
        return f"No '{field}' found in documents."
    return "\n".join(results[:20])

    # Create tools with user_email baked in using closures
    # “Call rag_search with these args”
    @tool
    def rag_search(query: str, document_id: int | None = None) -> str:
        """Search the user's documents for relevant information."""
        return rag_search_base(query=query, document_id=document_id, user_email=user_email)
       # LangChain registers metadata (name, args, description)
       # LLM now knows this tool exists
       # LLM can decide to call it
    
    @tool
    def rag_summarize(document_id: int | None = None) -> str:
        """Generate a concise summary of the user's documents."""
        return rag_summarize_base(document_id=document_id, user_email=user_email)
    
    @tool
    def rag_extract(field: str, document_id: int | None = None) -> str:
        """Extract specific information like names, emails, dates from documents."""
        return rag_extract_base(field=field, document_id=document_id, user_email=user_email)
    
    tools = [rag_search, rag_summarize, rag_extract]

# ----------------------
# Request schema
# ----------------------
class ChatRequest(BaseModel):
    message: str
    document_id: int | None = None

# ----------------------
# Chat endpoint
# ----------------------
@router.post("/chat")
async def chat(request: ChatRequest, current_user: dict = Depends(get_current_user)):
    
    user_email = current_user["email"]
    
    if not request.message or not request.message.strip():
        return StreamingResponse(
            iter(["data: [DONE]\n\n"]),
            media_type="text/event-stream"
        )

    # Inject user_email into tools (via closures)
    def call_rag_search(args):
        return rag_search_base(**args, user_email=user_email)

    def call_rag_summarize(args):
        return rag_summarize_base(**args, user_email=user_email)

    def call_rag_extract(args):
        return rag_extract_base(**args, user_email=user_email)    

    # LLM decides when to call tools
    model_with_tools = llm.bind_tools([rag_search, rag_summarize, rag_extract])  # Adds tool schemas to the LLM prompt
    
    # Tool-calling streaming loop
    messages = [
        SystemMessage(content="""You are a precise document assistant. Follow these rules EVERY time:

1. If the question needs ANY information from documents → ALWAYS call EXACTLY ONE tool
2. Tool choice rules:
   - Need facts, quotes, details, search → rag_search
   - Want summary or overview → rag_summarize
   - Want specific value (name/date/number/email...) → rag_extract
3. Call ONLY ONE tool. Never multiple at once.
4. NEVER guess. If no tool fits perfectly, still prefer rag_search.
5. After tool call → STOP. Do NOT continue writing.
6. Only answer after you receive tool result.

Be short and direct."""),
        HumanMessage(content=request.message)
    ]

    # Streaming generator for LLM output to frontend
    def stream_response():
        try:
            # First pass: stream initial response + detect tool calls
            tool_called = False

            for chunk in model_with_tools.stream(messages):
                if chunk.content:
                    yield f"data: {json.dumps({'content': chunk.content})}\n\n"

                # Tool call detection
                if hasattr(chunk, 'tool_calls') and chunk.tool_calls:
                        # ENFORCE: only take the FIRST tool call
                        tool_call = chunk.tool_calls[0]
                        tool_name = tool_call["name"]
                        args = tool_call["args"]
                        tool_id = tool_call["id"]

                        logger.info(f"Tool called: {tool_name} | Args: {args}")

                        # Execute tool
                        if tool_name == "rag_search":
                            result = rag_search.invoke(args)
                        elif tool_name == "rag_summarize":
                            result = rag_summarize.invoke(args)
                        elif tool_name == "rag_extract":
                            result = rag_extract.invoke(args)
                        else:
                            result = "Unknown tool."

                        tool_call_results[tool_id] = result

                        logger.info(f"Tool result: {result[:200]}...")

                        # Add to messages for final answer
                        messages.append(chunk)
                        messages.append(ToolMessage(content=result, tool_call_id=tool_id))

                        tool_called = True

                        # Stop after first tool call (enforce one per turn)
                        break

            # Final answer only after tool use (or direct answer if no tool)
            if tool_called:
                logger.info("Generating final answer after tool...")
                final = llm.invoke(messages)
                for token in final.content:
                    yield f"data: {json.dumps({'content': token})}\n\n"
            else:
                # If no tool was called, stream the direct response
                pass  # already streamed in the loop

            yield f"data: {json.dumps({'citations': []})}\n\n"

        except Exception as e:
            logger.error(f"Stream error: {str(e)}")
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(stream_response(), media_type="text/event-stream")