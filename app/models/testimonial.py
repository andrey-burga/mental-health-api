import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text
from app.database import Base

class Testimonial(Base):
    __tablename__ = "testimonials"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    slug = Column(String, unique=True, nullable=False, index=True)
    title = Column(String, nullable=False)
    excerpt = Column(Text, nullable=False)
    content = Column(Text, nullable=False)
    author = Column(String, nullable=False)
    role = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)