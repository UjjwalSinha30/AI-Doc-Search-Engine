# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db.database import engine, Base
from api.auth import router as auth_router  # your auth router
from api.file import router as file_router  # your upload router
from api.chat import router as chat_router  # your chat router
from models import models  # Ensure models are imported
from api.documents import router as documents_router
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="AI Knowledge Search Engine", description="Personal RAG-powered document search and chat",
    version="1.0.0",)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://localhost"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
# Base.metadata.create_all(bind=engine)

# Better approach - lazy initialization:
@app.on_event("startup")
async def startup_event():
    """Initialize database tables on startup with retry logic."""
    import time
    max_retries = 5
    retry_delay = 2
    
    for attempt in range(max_retries):
        try:
            Base.metadata.create_all(bind=engine)
            logger.info("✅ Database tables created successfully")
            break
        except Exception as e:
            if attempt < max_retries - 1:
                logger.warning(f"Database connection attempt {attempt + 1} failed, retrying in {retry_delay}s...")
                time.sleep(retry_delay)
            else:
                logger.error(f"❌ Failed to connect to database after {max_retries} attempts: {e}")
                raise

# Include routers
app.include_router(auth_router)  # /api/signup, /api/login, /api/me, /api/refresh
app.include_router(file_router)  # /api/upload
app.include_router(chat_router)
app.include_router(documents_router)


@app.get("/")
def root():
    return {
        "message": "AI Knowledge Search Engine API v1",
        "docs": "/docs",
        "redoc": "/redoc"
        }

@app.get("/health")
def health_check():
    return {"status": "healthy"} 
