# app/models/reflection.py
from datetime import datetime
from sqlalchemy import Column, String, Text, Boolean, Date, DateTime
from app.database import Base  # Importas tu declarative_base de SQLAlchemy


class DailyReflection(Base):
    __tablename__ = "daily_reflections"

    id = Column(String(36), primary_key=True, index=True)
    phrase = Column(Text, nullable=False)
    author = Column(String(100), nullable=True, default="Anónimo")
    show_date = Column(Date, unique=True, nullable=True, index=True)
    active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)