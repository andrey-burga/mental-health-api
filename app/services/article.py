from sqlalchemy.orm import Session, joinedload
from app.models.article import Article
from app.schemas.article import ArticleCreate
from app.schemas.article import ArticleUpdate
from sqlalchemy import desc

class ArticleService:
    
    
    @staticmethod
    def get_all(db: Session, skip: int = 0, limit: int = 100):
        return (
            db.query(Article)
            .options(joinedload(Article.author))
            .order_by(desc(Article.published_at))
            .offset(skip)
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, article_id: str):
        return db.query(Article).options(joinedload(Article.author)).filter(Article.id == article_id).first()

    @staticmethod
    def get_by_slug(db: Session, slug: str):
        return db.query(Article).options(joinedload(Article.author)).filter(Article.slug == slug).first()

    @staticmethod
    def create(db: Session, article_data: ArticleCreate, author_id: str):

        new_article = Article(
            **article_data.model_dump(),
            author_id=author_id
        )

        db.add(new_article)
        db.commit()
        db.refresh(new_article)

        return new_article

    @staticmethod
    def update(db: Session, article_id: str, article_data: ArticleUpdate):
        article = db.query(Article).filter(Article.id == article_id).first()

        if not article:
            return None

        update_data = article_data.model_dump(exclude_unset=True)

        for key, value in update_data.items():
            setattr(article, key, value)

        db.commit()
        db.refresh(article)

        return article

    @staticmethod
    def delete(db: Session, article_id: str) -> bool:
        article = db.query(Article).filter(Article.id == article_id).first()

        if not article:
            return False

        db.delete(article)
        db.commit()
        
        return True