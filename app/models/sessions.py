import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Session(Base):
    __tablename__ = "sessions"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    
    refresh_token_hash = Column(String, unique=True, nullable=False, index=True)
    device_name = Column(String, nullable=True) # Ej: "Samsung Galaxy S25"
    ip_address = Column(String, nullable=True)  # Ej: "181.xxx.xxx.xxx"
    location = Column(String, nullable=True)    # Ej: "Medellín, Colombia"
    
    last_active_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relación inversa con User
    user = relationship("User", back_populates="sessions")