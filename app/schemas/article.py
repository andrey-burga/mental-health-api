from datetime import datetime
from typing import Optional
from pydantic import BaseModel
from app.schemas.user import UserResponse

class ArticleBase(BaseModel):
    slug: str
    title: str
    description: str
    excerpt: str
    content: str
    category: str
    published_at: datetime
    author_id: Optional[str] = None

class ArticleCreate(ArticleBase):
    pass

class ArticleResponse(ArticleBase):
    id: str
    created_at: datetime
    # Opcionalmente podemos anidar el autor para que devuelva sus datos completos
    author: Optional[UserResponse] = None

    class Config:
        from_attributes = True