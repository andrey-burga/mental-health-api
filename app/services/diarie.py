from sqlalchemy.orm import Session
from app.models.diarie import Diarie
from app.schemas.diarie import DiarieCreate

class DiarieService:
    
    @staticmethod
    def create_entry(db: Session, entry_in: DiarieCreate, user_id: str) -> Diarie:
        db_entry = Diarie(
            mood=entry_in.mood,
            text=entry_in.text,
            tag=entry_in.tag,
            user_id=user_id
        )
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        return db_entry

    @staticmethod
    def get_entries_by_user(db: Session, user_id: str) -> list[Diarie]:
        return db.query(Diarie).filter(Diarie.user_id == user_id).order_by(Diarie.created_at.desc()).all()

    @staticmethod
    def delete_entry(db: Session, entry_id: str, user_id: str) -> bool:
        db_entry = db.query(Diarie).filter(Diarie.id == entry_id, Diarie.user_id == user_id).first()
        if not db_entry:
            return False
        db.delete(db_entry)
        db.commit()
        return True