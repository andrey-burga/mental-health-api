from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.article import ArticleCreate, ArticleResponse
from app.services.article import ArticleService

router = APIRouter()

# GET /api/articles - Listar todos los artículos
# response_model=List[ArticleResponse] le dice a FastAPI que valide y formatee la salida
@router.get("/", response_model=List[ArticleResponse])
def read_articles(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return ArticleService.get_all(db, skip=skip, limit=limit)

# GET /api/articles/slug/{slug} - Obtener artículo por su slug
@router.get("/slug/{slug}", response_model=ArticleResponse)
def read_article_by_slug(slug: str, db: Session = Depends(get_db)):
    article = ArticleService.get_by_slug(db, slug=slug)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Artículo no encontrado"
        )
    return article

# POST /api/articles - Crear un artículo nuevo
@router.post("/", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
def create_article(article: ArticleCreate, db: Session = Depends(get_db)):
    # Podríamos validar si el slug ya existe antes de crearlo
    existing = ArticleService.get_by_slug(db, slug=article.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El slug ya está registrado"
        )
    return ArticleService.create(db, article_data=article)