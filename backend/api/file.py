import os
import shutil
from fastapi import APIRouter, File, UploadFile, BackgroundTasks, Depends, HTTPException
from fastapi.responses import JSONResponse
from utils.utils import get_current_user
from rag.pipeline import process_uploaded_file
from utils.file_hash import compute_file_hash
from sqlalchemy.orm import Session
from db.database import get_db  
from models.document import Document
from models.models import User
import uuid


router = APIRouter(prefix="/api", tags=["files"])

Upload_DIR = "uploaded_files"
os.makedirs(Upload_DIR, exist_ok=True)

ALLOWED_EXTENSIONS = {".txt", ".pdf", ".docx", ".md", ".csv"}
MAX_FILE_SIZE = 50 * 1024 * 1024

def validate_file(file: UploadFile):
    ext = os.path.splitext(file.filename)[1].lower() 
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid file type: {ext}. Allowed: PDF, TXT, DOCX, MD, CSV"
        )

    file.file.seek(0, 2)
    size = file.file.tell()
    file.file.seek(0)

    if size > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File too large. Max 50MB")

@router.post("/upload")
async def upload_file(
    file: UploadFile = File(...),
    background_tasks: BackgroundTasks = BackgroundTasks(),
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        # Step 1: Validate file
        validate_file(file)
        
        # Step 2: Read file bytes ONCE
        file_bytes = await file.read()
        
        # Step 3: Compute hash and check for duplicates 
        file_hash = compute_file_hash(file_bytes)
        
        # Get user from DB
        user = db.query(User).filter(User.email == current_user["email"]).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check for duplicate - file_hash must be unique per user
        existing = db.query(Document).filter(
            Document.file_hash == file_hash,
            Document.user_id == user.id
        ).first()
        
        if existing:
            raise HTTPException(status_code=400, detail="File already uploaded by this user")
        
        # Step 4: Create unique safe filename
        unique_id = str(uuid.uuid4())[:8]
        safe_filename = f"{unique_id}_{file.filename.replace(' ','_')}"
        file_path = os.path.join(Upload_DIR, safe_filename)
        
        # Step 5: Save file to disk using the bytes we already read
        with open(file_path, "wb") as buffer:
            buffer.write(file_bytes)  # ✅ Write the bytes directly
            
        print(f"✅ File saved to: {file_path} ({len(file_bytes)} bytes)")

        try:
            new_doc = Document(
                filename=file.filename,
                file_path=file_path,
                file_hash=file_hash,
                user_id=user.id,
            )
            db.add(new_doc)
            
            db.commit()
            db.refresh(new_doc)

            document_id = new_doc.id
            print(f"document saved in db with id: {document_id}")

        except Exception as db_error:
            db.rollback()
            print(f"❌ DB save failed: {db_error}")
            raise HTTPException(status_code=500, detail=f"Database error: {str(db_error)}")    
            
        # Step 6: Start background processing
        background_tasks.add_task(
            process_uploaded_file,
            file_path=file_path,
            original_filename=file.filename,
            user_email=user.email,
            file_hash=file_hash,
            document_id=document_id  # pass the new id
        )    
        
        # Step 7: Return success
        return JSONResponse({
            "message": "File uploaded & processing started",
            "document_id": document_id,
            "filename":file.filename,
            "size_kb": len(file_bytes) // 1024,
            "status": "processing"
        })
        
    except HTTPException as e:
        raise e
    except Exception as e:
        print(f"❌ Upload error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))