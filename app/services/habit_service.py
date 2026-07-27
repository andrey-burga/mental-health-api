from sqlalchemy.orm import Session
from app.models.habit import Habit  # Ajusta la ruta según tu estructura de carpetas
from app.schemas.habit import HabitCreate, HabitUpdate

def get_habits_by_user(db: Session, user_id: str):
    """Obtiene todos los hábitos de un usuario específico."""
    return db.query(Habit).filter(Habit.user_id == user_id).all()

def create_habit(db: Session, habit_in: HabitCreate, user_id: str):
    """Crea un nuevo hábito para el usuario."""
    db_habit = Habit(
        text=habit_in.text,
        category=habit_in.category,
        user_id=user_id,
        completed=False
    )
    db.add(db_habit)
    db.commit()
    db.refresh(db_habit)
    return db_habit

def update_habit(db: Session, habit_id: str, user_id: str, habit_in: HabitUpdate):
    """Actualiza un hábito existente (texto, categoría o estado completado)."""
    db_habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    if not db_habit:
        return None

    update_data = habit_in.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_habit, key, value)

    db.commit()
    db.refresh(db_habit)
    return db_habit

def delete_habit(db: Session, habit_id: str, user_id: str):
    """Elimina un hábito del usuario."""
    db_habit = db.query(Habit).filter(Habit.id == habit_id, Habit.user_id == user_id).first()
    if not db_habit:
        return None

    db.delete(db_habit)
    db.commit()
    return db_habit