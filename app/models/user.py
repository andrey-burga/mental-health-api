import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = Column(String, unique=True, nullable=False, index=True)
    password = Column(String, nullable=False)
    name = Column(String, nullable=False)
    role_id = Column(String, ForeignKey("roles.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relaciones
    role = relationship("Role", back_populates="users")
    articles = relationship("Article", back_populates="author")
    testimonials = relationship("Testimonial", back_populates="author")
    # Corregido: plural y apuntando al back_populates correcto en Diarie
    diaries = relationship("Diarie", back_populates="user", cascade="all, delete-orphan")