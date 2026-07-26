import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    excerpt = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    
    # Clave foránea que conecta con la tabla de usuarios
    author_id = Column(String, ForeignKey("users.id"), nullable=False)
    
    # Relación para acceder a los datos del usuario directamente
    author = relationship("User", back_populates="testimonials")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))