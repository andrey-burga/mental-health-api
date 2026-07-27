from datetime import date
from typing import Optional
from sqlalchemy.orm import Session
from sqlalchemy.sql.expression import func
import uuid

from app.models.reflection import DailyReflection
from app.schemas.reflection import DailyReflectionCreate


class ReflectionService:

    @staticmethod
    def get_today_reflection(db: Session) -> Optional[DailyReflection]:
        """
        Obtiene la reflexión para el día actual.
        1. Busca una frase programada para la fecha de hoy (show_date = today).
        2. Si no existe, intenta traer una frase activa aleatoria.
        """
        today = date.today()

        # 1. Intentar buscar por la fecha exacta del día de hoy
        reflection = (
            db.query(DailyReflection)
            .filter(
                DailyReflection.show_date == today,
                DailyReflection.active == True,
            )
            .first()
        )

        if reflection:
            return reflection

        # 2. Fallback: Si no hay una frase específica para hoy,
        # seleccionar una frase activa de forma aleatoria.
        # (Funciona en PostgreSQL, SQLite y MySQL)
        fallback_reflection = (
            db.query(DailyReflection)
            .filter(DailyReflection.active == True)
            .order_by(func.random())
            .first()
        )

        return fallback_reflection

    @staticmethod
    def create_reflection(
        db: Session, reflection_data: DailyReflectionCreate
    ) -> DailyReflection:
        """
        Crea una nueva reflexión en la base de datos (útil para tu panel o seed inicial).
        """
        db_reflection = DailyReflection(
            id=str(uuid.uuid4()),
            phrase=reflection_data.phrase,
            author=reflection_data.author,
            show_date=reflection_data.show_date,
            active=reflection_data.active,
        )
        db.add(db_reflection)
        db.commit()
        db.refresh(db_reflection)
        return db_reflection