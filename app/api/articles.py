from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.models import User
from app.database import get_db
from app.schemas.article import ArticleCreate, ArticleResponse, ArticleUpdate
from app.services.article import ArticleService
from app.services.auth_service import service_get_current_user as get_current_user

router = APIRouter()


# ==========================================
# HELPER DE PERMISOS (Seguridad Centralizada)
# ==========================================
def verify_author_or_admin(current_user: User, article_author_id: str) -> None:
    """
    Verifica si el usuario actual es Administrador o el Autor del recurso.
    Si no cumple ninguna de las dos, lanza un HTTP 403 Forbidden.
    """
    is_admin = getattr(current_user, "is_admin", False) or getattr(current_user, "role", None) == "admin"
    is_author = str(article_author_id) == str(current_user.id)

    if not (is_admin or is_author):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permisos para realizar esta acción sobre este artículo"
        )


# ==========================================
# RUTAS DE LA API
# ==========================================

# GET /api/articles - Listar todos los artículos
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


# POST /api/articles - Crear artículo
@router.post("/", response_model=ArticleResponse, status_code=status.HTTP_201_CREATED)
def create_article(
    article: ArticleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    existing = ArticleService.get_by_slug(db, slug=article.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El slug ya está registrado"
        )

    return ArticleService.create(
        db,
        article_data=article,
        author_id=current_user.id
    )


# PATCH /api/articles/{article_id} - Actualizar artículo
@router.patch("/{article_id}", response_model=ArticleResponse)
def update_article(
    article_id: str,
    article_data: ArticleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Buscar el artículo
    article = ArticleService.get_by_id(db, article_id=article_id)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Artículo no encontrado"
        )

    # 2. Verificar permisos (Admin O Autor)
    verify_author_or_admin(current_user, article.author_id)

    # 3. Validar duplicidad de slug si viene en el payload y es distinto al actual
    if article_data.slug and article_data.slug != article.slug:
        existing_slug = ArticleService.get_by_slug(db, slug=article_data.slug)
        if existing_slug:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="El nuevo slug ya está en uso por otro artículo"
            )

    # 4. Actualizar
    updated_article = ArticleService.update(db, article_id=article_id, article_data=article_data)
    return updated_article


# DELETE /api/articles/{article_id} - Eliminar artículo
@router.delete("/{article_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_article(
    article_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Buscar el artículo
    article = ArticleService.get_by_id(db, article_id=article_id)
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Artículo no encontrado"
        )

    # 2. Verificar permisos (Admin O Autor)
    verify_author_or_admin(current_user, article.author_id)

    # 3. Eliminar
    ArticleService.delete(db, article_id=article_id)
    return None