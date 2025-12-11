import os
import shutil
from fastapi import APIRouter, File, UploadFile, BackgroundTasks, Depends, HTTPException
from fastapi.responses import JSONResponse
from backend.api.utils import get_current_user  # protected route
from backend.rag.pipeline import process_uploaded_file


# Create router for file-related endpoints
router = APIRouter(prefix="/api", tags=["files"])

# Directory where uploaded files will be stored
Upload_DIR = "uploaded_files"
os.makedirs(Upload_DIR, exist_ok=True)  # Create folder if not exists

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx", ".png", ".jpg", ".jpeg"}

MAX_FILE_SIZE = 50 * 1024 * 1024

def validate_file(file: UploadFile):
    # Extract extension and check if allowed
    ext = os.path.splitext(file.filename)[1].lower() 
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=400, detail=f"Invalid file type: {ext}. Allowed: PDF, TXT, DOCX, MD, CSV")

    # Check file size using .seek() without loading into memory
    file.file.seek(0, 2)  # Go to end of file
    size = file.file.tell()  # Get size in bytes
    file.file.seek(0)        # Reset pointer to start

    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 50MB")
    
def background_process_file(file_path: str, original_filename: str, user_email: str):
    """
    Background task — this runs after the response is sent.
    Put your full RAG pipeline here later.
    """
    print(f"[BACKGROUND] Started processing: {original_filename}")
    print(f"[BACKGROUND] Saved at: {file_path}")
    print(f"[BACKGROUND] User: {user_email}")
    
    # TODO: Add real RAG steps here:
    # - Extract text (PyPDF2, docx, etc.)
    # - Chunk text
    # - Generate embeddings
    # - Save to Chroma/Qdrant/Pinecone
    
    print(f"[BACKGROUND] Successfully processed: {original_filename}")
    
@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user)
):
    """
    Uploads a file:
    1. Validates type & size
    2. Saves file to server
    3. Starts background processing
    4. Returns immediate response
    """
    try:
        # Step 1: Validate file
        validate_file(file)
        
        # Step 2: create safe filename (prefix with user email)
        safe_filename = f"{current_user['email'].split('@')[0]}_{file.filename}"
        file_path = os.path.join(Upload_DIR, safe_filename)
        
        #step 3: Save file to disk
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Step 4: Start async background task
        background_tasks.add_task(
            background_process_file,
            file_path,
            file.filename,
            current_user["email"]
        )    
        
        # Step 5: Return immediate response
        return JSONResponse({
            "message": "File uploaded & processing started",
            "filename": safe_filename,
            "size_kb": os.path.getsize(file_path) // 1024,
            "status": "processing"
        })
    except HTTPException as e:
        # Pass FastAPI validation errors directly
        raise e
    except Exception as e:
        # Any unknown server error
        raise HTTPException(status_code=500, detail="Upload failed")