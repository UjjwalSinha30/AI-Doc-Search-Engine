# backend/main.py
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.db.database import engine, Base
from backend.api.auth import router as auth_router
from backend.api.file import router as file_router  # your upload router

app = FastAPI(title="AI Knowledge Search Engine")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Create tables
Base.metadata.create_all(bind=engine)

# Include routers
app.include_router(auth_router)   # /api/signup, /api/login, /api/me, /api/refresh
app.include_router(file_router)   # /api/upload

@app.get("/")
def root():
    return {"message": "AI Knowledge Search Engine API v1"}