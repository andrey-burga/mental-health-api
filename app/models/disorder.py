import uuid
from sqlalchemy import Column, String
from sqlalchemy.orm import relationship
from app.database import Base

class Disorder(Base):
    __tablename__ = "disorders"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)

    # Relación uno-a-muchos con Symptom
    # cascade="all, delete-orphan" asegura que si borras un trastorno, se borren sus síntomas (como en Prisma)
    symptoms = relationship("Symptom", back_populates="disorder", cascade="all, delete-orphan")