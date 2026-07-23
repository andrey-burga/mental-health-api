import uuid
from sqlalchemy import Column, String, Text
from app.database import Base

class Resource(Base):
    __tablename__ = "resources"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    type = Column(String, nullable=False)  # help | wellbeing | habit | porn