import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base

class Article(Base):
    __tablename__ = "articles"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    excerpt = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String, nullable=False)
    published_at = Column(DateTime, nullable=False)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    author = relationship("User", back_populates="articles")