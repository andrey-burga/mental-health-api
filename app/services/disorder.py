from sqlalchemy.orm import Session, joinedload
from app.models.disorder import Disorder
from app.models.symptom import Symptom
from app.schemas.disorder import DisorderCreate, SymptomCreate

class DisorderService:
    @staticmethod
    def get_all(db: Session):
        # Trae todos los trastornos e incluye su lista de síntomas de forma automática
        return db.query(Disorder).options(joinedload(Disorder.symptoms)).all()

    @staticmethod
    def get_by_slug(db: Session, slug: str):
        return db.query(Disorder).options(joinedload(Disorder.symptoms)).filter(Disorder.slug == slug).first()

    @staticmethod
    def create(db: Session, disorder_data: DisorderCreate):
        db_disorder = Disorder(**disorder_data.model_dump())
        db.add(db_disorder)
        db.commit()
        db.refresh(db_disorder)
        return db_disorder

    @staticmethod
    def add_symptom(db: Session, symptom_data: SymptomCreate):
        db_symptom = Symptom(**symptom_data.model_dump())
        db.add(db_symptom)
        db.commit()
        db.refresh(db_symptom)
        return db_symptom