import uuid
from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base

class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    text = Column(String, nullable=False)
    disorder_id = Column(String, ForeignKey("disorders.id"), nullable=False)

    # Relación inversa con Disorder
    disorder = relationship("Disorder", back_populates="symptoms")