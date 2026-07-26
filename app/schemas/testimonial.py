from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.role import RoleResponse


class TestimonialBase(BaseModel):
    slug: str
    title: str
    excerpt: str
    content: str


class TestimonialCreate(TestimonialBase):
    pass



class TestimonialResponse(TestimonialBase):
    id: str
    created_at: datetime
    author: AuthorResponse

    class Config:
        from_attributes = True



class TestimonialUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None

class AuthorResponse(BaseModel):
    id: str
    name: str
    role: RoleResponse

    class Config:
        from_attributes = True

