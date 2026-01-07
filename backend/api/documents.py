# backend/api/documents.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
from fastapi.responses import FileResponse

from backend.db.database import get_db
from backend.models.document import Document
from backend.models.models import User
from backend.utils.utils import get_current_user
from backend.rag.pipeline import get_or_create_collection

router = APIRouter(prefix="/api", tags=["documents"])

UPLOAD_DIR = Path("uploaded_files")

# ============================
# LIST USER DOCUMENTS
# ============================
@router.get("/documents")
def list_documents(
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get user first
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Query documents by user_id
    docs = (
        db.query(Document)
        .filter(Document.user_id == user.id)
        .order_by(Document.upload_date.desc())
        .all()
    )

    return [doc.to_dict() for doc in docs]


# ============================
# GET DOCUMENT BY ID
# ============================
@router.get("/documents/{doc_id}")
def get_document(
    doc_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get user first
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Query by both doc_id and user_id
    doc = (
        db.query(Document)
        .filter(
            Document.id == doc_id,
            Document.user_id == user.id
        )
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    return doc.to_dict()


# ============================
# VIEW DOCUMENT FILE
# ============================
@router.get("/documents/{doc_id}/view")
def view_document(
    doc_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get user first
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Query by both doc_id and user_id
    doc = db.query(Document).filter(
        Document.id == doc_id,
        Document.user_id == user.id
    ).first()
    
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    file_path = Path(doc.file_path) 
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on server")
    
    return FileResponse(
        path=str(file_path),
        media_type="application/pdf",
        filename=doc.filename
    )


# ============================
# DELETE DOCUMENT + EMBEDDINGS
# ============================
@router.delete("/documents/{doc_id}")
def delete_document(
    doc_id: int,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Get user first
    user = db.query(User).filter(User.email == current_user["email"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Query by both doc_id and user_id
    doc = (
        db.query(Document)
        .filter(
            Document.id == doc_id,
            Document.user_id == user.id
        )
        .first()
    )

    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        # 1️⃣ Delete embeddings from Chroma using CORRECT field
        collection = get_or_create_collection(current_user["email"])
        
        # ✅ Use document_id instead of filename for reliable deletion
        result = collection.delete(where={"document_id": doc_id})
        print(f"🗑️ Deleted {len(result) if result else 0} chunks from Chroma for doc {doc_id}")

        # 2️⃣ Delete file from disk
        file_path = Path(doc.file_path)
        if file_path.exists():
            file_path.unlink()
            print(f"🗑️ Deleted file: {file_path}")

        # 3️⃣ Delete DB record
        db.delete(doc)
        db.commit()
        print(f"✅ Document {doc_id} deleted successfully")

        return {
            "message": "Document deleted successfully",
            "document_id": doc_id
        }
        
    except Exception as e:
        db.rollback()
        print(f"❌ Delete failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")