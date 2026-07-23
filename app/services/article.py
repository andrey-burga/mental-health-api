from sqlalchemy.orm import Session, joinedload
from app.models.article import Article
from app.schemas.article import ArticleCreate

class ArticleService:
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100):
        # El .options(joinedload(...)) es el equivalente exacto a "include" en Prisma.
        # Trae la información del autor en una sola consulta SQL (JOIN).
        return db.query(Article).options(joinedload(Article.author)).offset(skip).limit(limit).all()

    @staticmethod
    def get_by_id(db: Session, article_id: str):
        return db.query(Article).options(joinedload(Article.author)).filter(Article.id == article_id).first()

    @staticmethod
    def get_by_slug(db: Session, slug: str):
        return db.query(Article).options(joinedload(Article.author)).filter(Article.slug == slug).first()

    @staticmethod
    def create(db: Session, article_data: ArticleCreate):
        # Convertimos el esquema de Pydantic a un diccionario y creamos la instancia del modelo
        db_article = Article(**article_data.model_dump())
        db.add(db_article)
        db.commit()
        db.refresh(db_article)  # Refresca para obtener el ID generado y fechas por defecto
        return db_article