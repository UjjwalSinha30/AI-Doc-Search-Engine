from sqlalchemy import Column, Integer, String
from db.database import Base
from sqlalchemy.orm import relationship

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False) 
    
    # relationship to documents
    documents = relationship("Document", back_populates="user", cascade="all, delete-orphan")