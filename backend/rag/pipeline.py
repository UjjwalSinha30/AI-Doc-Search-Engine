# ============================================
# RAG PIPELINE — extract → chunk → embed → store
# ============================================

import os
import uuid
from pathlib import Path
from typing import List

import chromadb
from chromadb.config import Settings

# Tool that splits long text into smaller chunks
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Loaders that read/extract text from documents
from langchain_community.document_loaders import PyPDFLoader, Docx2txtLoader, TextLoader

# Use OpenAIEmbeddings with Grok (xAI) endpoint
from langchain_openai import OpenAIEmbeddings


# =========================
# CONFIGURATION
# =========================

# Folder where ChromaDB will store embeddings (vector DB)
CHROMA_DIR = Path("chroma_db")

# Create folder automatically if missing
CHROMA_DIR.mkdir(exist_ok=True)

# Create a *persistent* Chroma client = saves DB to disk
client = chromadb.PersistentClient(path=str(CHROMA_DIR))


# Create or fetch a collection for a specific user
def get_or_create_collection(user_email: str):
    """
    Each user gets their own vector database collection.
    Example: docs_john_gmail_com
    """
    # Clean email so it's usable as a folder/collection name
    collection_name = f"docs_{user_email.replace('@', '_').replace('.', '_')}"
    
    try:
        # Try getting existing collection
        return client.get_collection(name=collection_name)
    except:
        # If it doesn't exist → create new one
        return client.create_collection(name=collection_name)



# Converts text into numeric vectors
# Grok Embeddings (uses your XAI_API_KEY)
embeddings = XAIEmbeddings(
    model="text-embedding-3-small", 
    xai_api_key=os.getenv("XAI_API_KEY")  
)


# Split text into chunks
text_splitter = RecursiveCharacterTextSplitter(
    chunk_size=1000,       # each chunk = 1000 characters
    chunk_overlap=200,     # overlap so meaning is preserved
    length_function=len,
)


# =========================
# MAIN PROCESSING FUNCTION
# =========================
def process_uploaded_file(
    file_path: str,
    original_filename: str,
    user_email: str
) -> None:
    """
    This function does all RAG steps:
      1. Read PDF/DOCX/TXT
      2. Extract full text
      3. Split into chunks
      4. Generate embeddings
      5. Save to Chroma DB
    And runs in background after upload.
    """

    print(f"Starting RAG processing: {original_filename} for {user_email}")

    # Convert to Path object for safety
    file_path = Path(file_path)

    # If file missing → stop
    if not file_path.exists():
        print(f"File not found: {file_path}")
        return

    try:
        # ============================
        # 1. Choose the correct loader
        # ============================

        if file_path.suffix.lower() == ".pdf":
            loader = PyPDFLoader(str(file_path))  # extract PDF pages

        elif file_path.suffix.lower() in {".docx", ".doc"}:
            loader = Docx2txtLoader(str(file_path))  # extract doc/docx text

        elif file_path.suffix.lower() in {".txt", ".md"}:
            loader = TextLoader(str(file_path), encoding="utf-8")  # read raw text

        else:
            print(f"Unsupported file type: {file_path.suffix}")
            return

        # Load the entire document as "pages" or "sections"
        documents = loader.load()
        print(f"Extracted {len(documents)} page(s)/section(s)")


        # ============================
        # 2. Split into chunks
        # ============================
        chunks = text_splitter.split_documents(documents)
        print(f"Split into {len(chunks)} chunks")

        if len(chunks) == 0:
            print("No text extracted")
            return


        # ============================
        # 3. Generate embeddings + save
        # ============================

        # Get (or create) the vector collection for this user
        collection = get_or_create_collection(user_email)

        # Create unique IDs for each chunk
        ids = [str(uuid.uuid4()) for _ in chunks]

        # Extract text of each chunk
        texts = [chunk.page_content for chunk in chunks]

        # Metadata stored with each chunk
        metadatas = []
        for i, chunk in enumerate(chunks):
            metadatas.append({
                "source": original_filename,       # file name
                "chunk_index": i,                   # which chunk number
                "page": chunk.metadata.get("page", 0),
                "total_chunks": len(chunks),
                "user_email": user_email,           # helps filtering later
            })


        # Add everything to Chroma
        # Chroma generates embeddings automatically using OpenAI model
        collection.add(
            ids=ids,
            documents=texts,
            metadatas=metadatas,
        )

        print(f"Successfully stored {len(chunks)} chunks in Chroma for {user_email}")


    except Exception as e:
        print(f"Error processing {original_filename}: {e}")
        raise e
