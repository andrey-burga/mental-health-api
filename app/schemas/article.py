from datetime import datetime,timezone
from typing import Optional
from pydantic import BaseModel, ConfigDict,Field
from app.schemas.user import UserResponse


class ArticleBase(BaseModel):
    title: str
    slug: str
    description: str
    excerpt: str
    content: str
    category: str
    published_at: datetime


class ArticleCreate(ArticleBase):
    published_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    pass


class ArticleUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    description: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    published_at: Optional[datetime] = None


class ArticleResponse(ArticleBase):
    id: str
    created_at: datetime
    author: Optional[UserResponse] = None

    model_config = ConfigDict(from_attributes=True)
