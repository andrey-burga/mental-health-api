import uuid
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Habit(Base):
    __tablename__ = "habits"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    text = Column(String, nullable=False)
    completed = Column(Boolean, default=False)
    category = Column(String, nullable=False) # 'Físico', 'Mental', 'Emocional', 'Social'
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relación con User (coincidiendo con habits= relationship en tu User)
    user = relationship("User", back_populates="habits")