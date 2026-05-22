from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base

class Video(Base):
    __tablename__ = "videos"
    id         = Column(Integer, primary_key=True, index=True)
    filename   = Column(String)
    filepath   = Column(String)
    s3_key     = Column(String, nullable=True)
    status     = Column(String, default="uploaded")  # uploaded | processing | done | error
    thumbnail_path = Column(String, nullable=True)
    transcript     = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())