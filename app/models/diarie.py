import uuid
from sqlalchemy import Column, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base
from datetime import datetime, timezone

class Diarie(Base):
    __tablename__ = "diarie"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    mood = Column(String, nullable=False)
    text = Column(Text, nullable=False)
    tag = Column(String, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Corregido: user_id debe ser una columna ForeignKey, no un relationship directo
    user_id = Column(String, ForeignKey("users.id"), nullable=False)

    # Relación hacia el usuario
    user = relationship("User", back_populates="diaries")