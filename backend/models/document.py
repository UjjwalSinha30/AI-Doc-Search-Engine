from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, UniqueConstraint
from sqlalchemy.orm import relationship
from db.database import Base
from datetime import datetime


class Document(Base):
    __tablename__ = "documents"
    
    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False, index=True)
    file_hash = Column(String(64), nullable=False, index=True)
    file_path = Column(String(500), nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow)
    page_count = Column(Integer, default=0)
    chunk_count = Column(Integer, default=0)
    
    # Foreign key to user
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    # Relationship back to User
    user = relationship("User", back_populates="documents")

    __table_args__= (
        UniqueConstraint('file_hash', 'user_id', name='uix_filehash_userid'),
    )
    
    def to_dict(self):
        return {
            "id": self.id,
            "filename": self.filename,
            "upload_date": self.upload_date.isoformat(),
            "page_count": self.page_count,
            "chunk_count": self.chunk_count,
        }