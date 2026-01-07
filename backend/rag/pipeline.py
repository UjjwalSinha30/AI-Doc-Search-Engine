# backend/rag/pipeline.py
import os
import uuid
from pathlib import Path

import chromadb
# Splits long text into smaller overlapping chunks
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader

# FREE LOCAL EMBEDDINGS — no API key needed!
from langchain_huggingface import HuggingFaceEmbeddings
from backend.db.database import SessionLocal
from backend.models.document import Document
from backend.models.models import User
import torch



# safe gpu detection
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"🔥 Embeddings using device: {device.upper()} | GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU only'}")


# =========================
# CONFIG
# =========================
# Directory where ChromaDB data will be stored on disk
CHROMA_DIR = Path("chroma_db")
CHROMA_DIR.mkdir(exist_ok=True)  # Create folder if not exists

# Persistent Chroma client (data survives server restart)
client = chromadb.PersistentClient(path=str(CHROMA_DIR))

def get_or_create_collection(user_email: str):
    """
    Each user gets their own vector collection.
    Example:
      k@gmail.com → docs_k_gmail_com
    """
    collection_name = f"docs_{user_email.replace('@', '_').replace('.', '_')}"
    try:
        return client.get_collection(name=collection_name)
    except:
        return client.create_collection(name=collection_name)

# HuggingFace Embeddings 
embeddings = HuggingFaceEmbeddings(
    model_name="sentence-transformers/all-MiniLM-L6-v2",  # Fast & accurate (384 dims)
    model_kwargs={'device': device},  
)

# Splits text into chunks of 1000 characters
# with 200-character overlap to preserve context
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,
    chunk_overlap=200,
    length_function=len,
)

# =========================
# MAIN PIPELINE
# =========================
def process_uploaded_file(
    file_path: str,
    original_filename: str,
    user_email: str,
    file_hash: str,
    document_id: int
) -> None:
    """
    Background job: PDF/TXT/DOCX → text → chunks → embeddings → ChromaDB
    """
    print(f"🚀 Starting RAG processing: {original_filename} for {user_email}")

    file_path = Path(file_path)
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return

    try:
        # load document
        # 1. Extract text
        if file_path.suffix.lower() == ".pdf":
            loader = PyPDFLoader(str(file_path))
            print("📄 Extracting PDF...")
        elif file_path.suffix.lower() in {".docx", ".doc"}:
            loader = Docx2txtLoader(str(file_path))
            print("📝 Extracting DOCX...")
        elif file_path.suffix.lower() in {".txt", ".md"}:
            loader = TextLoader(str(file_path), encoding="utf-8")
            print("📄 Extracting TXT/MD...")
        else:
            print(f"❌ Unsupported type: {file_path.suffix}")
            return
        
        
        # documents = [page1_text, page2_text, ...]
        documents = loader.load()
        if not documents:
            raise RuntimeError(
                f"PDF extraction failed (0 pages). "
                f"File may be scanned or unsupported: {file_path}"
            )    

        print(f"✅ Extracted {len(documents)} page(s)/section(s)")

        # Split large text into overlapping chunks
        chunks = text_splitter.split_documents(documents)
        print(f"✂️ Split into {len(chunks)} chunks (1000 chars each)")

        if not chunks:
            print("⚠️ No text extracted — skipping")
            return
        
        # === SAVE METADATA TO MYSQL ===
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == user_email).first()
            if not user:
                print(f"⚠️ User not found: {user_email}")
                return

            doc_record = db.query(Document).filter(Document.id == document_id).first()
            if not doc_record:
                print("❌ Document not found for update")
                return

            doc_record.page_count = len(documents)
            doc_record.chunk_count = len(chunks)
            db.commit()
            print(f"💾 Document saved with ID: {document_id}")

        except Exception as e:
            print(f"❌ DB error: {e}")
            db.rollback()
            return
        finally:
            db.close()
            
    # 4. PREPARE CHROMA DATA
        # Metadata helps with citations & debugging
        collection = get_or_create_collection(user_email)
        
        # Generate unique IDs for each chunk
        ids = [str(uuid.uuid4()) for _ in chunks]
        
        # Extract actual text from each chunk
        texts = [chunk.page_content for chunk in chunks]

        metadatas = []
        for i, chunk in enumerate(chunks):
            metadatas.append({
                "document_id": document_id,
                "filename": original_filename,
                "chunk_index": i,
                "page": chunk.metadata.get("page", 0),
                "user_email": user_email,
            })

        # -----------------------
        # 5. EMBED & STORE
        # -----------------------
        # Create embeddings locally and store everything in Chroma
        collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas,
            embeddings=embeddings.embed_documents(texts),
        )

        print(f"🎉 SUCCESS: Stored {len(chunks)} chunks for document_id={document_id}")

        print(f"🎉 Stored {len(chunks)} chunks in Chroma")

    except Exception as e:
        print(f"💥 PROCESSING FAILED: {type(e).__name__}: {str(e)}")
        import traceback
        traceback.print_exc()
        raise
    

    