from datetime import datetime
from pydantic import BaseModel

class TestimonialBase(BaseModel):
    slug: str
    title: str
    excerpt: str
    content: str
    author: str
    role: str

class TestimonialCreate(TestimonialBase):
    pass

class TestimonialResponse(TestimonialBase):
    id: str
    created_at: datetime

    class Config:
        from_attributes = True