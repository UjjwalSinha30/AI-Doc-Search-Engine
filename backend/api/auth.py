# backend/api/auth.py
import json
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import Response
from sqlalchemy.orm import Session
from backend.db.database import get_db
from backend.models.models import User
from backend.schema.schemas import UserCreate, UserOut
from ..utils.utils import (  # we'll move shared functions here
    create_access_token,
    create_refresh_token,
    verify_token,
    get_current_user,
    authenticate_user,
    create_user,
)

router = APIRouter(prefix="/api", tags=["auth"])

# Move all your JWT functions to backend/api/utils.py (see below)
# OR keep them here — but DON'T keep them in main.py


@router.post("/signup", response_model=UserOut)
def signup(user: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    db_user = create_user(db, user)
    return db_user


@router.post("/login")
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token({"sub": user.email})
    refresh_token = create_refresh_token({"sub": user.email})

    resp = Response(
        content=json.dumps({"access_token": access_token, "token_type": "bearer"}),
        media_type="application/json"
    )
    resp.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=False,
        samesite="lax",
        max_age=7 * 24 * 60 * 60,
    )
    return resp

@router.post("/logout")
def logout():
    resp = Response(
        content=json.dumps({"message": "Logged out"}),
        media_type="application/json"
    )
    resp.delete_cookie(key="refresh_token")
    return resp


@router.post("/refresh")
def refresh(token_data: dict = Depends(verify_token)):
    access_token = create_access_token({"sub": token_data["sub"]})
    return {"access_token": access_token}


@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    return current_user
