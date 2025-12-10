from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from database import engine, Base, get_db
from models import User
from schemas import UserCreate, UserOut
from auth import (
    create_access_token, create_refresh_token,
    verify_token, get_current_user, authenticate_user, create_user
)
from sqlalchemy.orm import Session

app = FastAPI()

# CORS — THIS ONE WORKS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

# SIGNUP
@app.post("/api/signup", response_model=UserOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )
    
    # Create new: import create_user from auth.py
    from auth import create_user
    db_user = create_user(db, user)
    return db_user

# USER LOGIN + SET HTTP-ONLY REFRESH COOKIE
@app.post("/api/login")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    
    # Validate user
    user = authenticate_user(db, form_data.username, form_data.password)
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    # Generate Access & Refresh tokens
    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})

    response = {"access_token": access_token, "token_type": "bearer"}
    
     # JSONResponse required to attach cookie
    from fastapi.responses import JSONResponse
    resp = JSONResponse(content=response)
    
    # Store refresh token as HTTP-only cookie
    resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,       # JS cannot access this → secure
        secure=False,        # True only in production (HTTPS)
        samesite="lax",
        max_age=7*24*60*60   # Cookie validity = 7 days
    )
    return resp

# REFRESH ACCESS TOKEN (Called when frontend gets 401)
@app.post("/api/refresh")
def refresh_token(refresh_token: str = Depends(verify_token)):
    """
    Gets refresh token from cookie,
    verifies it, then returns a new access token.
    
    verify_token:
      - extracts cookie automatically
      - validates signature & expiry
      - returns decoded payload (sub=email)
    """
    access_token = create_access_token({"sub": refresh_token["sub"]})
    return {"access_token": access_token}  


# PROTECTED ROUTE → Requires access token
@app.get("/api/me")
def  read_users_me(current_user: dict = Depends(get_current_user)):
    return current_user

# SIMPLE HEALTH CHECK ROUTE
@app.get("/")
def root():
    return {"message": "FastAPI Auth Backend Running"}
    