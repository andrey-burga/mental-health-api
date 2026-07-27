from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db  # Ajusta la ruta a tu función de base de datos
from app.models.user import User  # Ajusta la ruta a tu modelo de usuario
from app.schemas.habit import HabitCreate, HabitResponse, HabitUpdate
from app.services.habit_service import (
    create_habit,
    delete_habit,
    get_habits_by_user,
    update_habit,
)
# Importa tu dependencia de autenticación actual (ej: get_current_active_user)
from app.services.auth_service import service_get_current_user as get_current_user

router = APIRouter(prefix="")

@router.get("/", response_model=List[HabitResponse])
def list_habits(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # Cambia esto por tu función real de auth
):
    """Obtiene todos los hábitos del usuario autenticado."""
    return get_habits_by_user(db=db, user_id=current_user.id)

@router.post("/", response_model=HabitResponse, status_code=status.HTTP_201_CREATED)
def add_habit(
    habit_in: HabitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea un nuevo hábito para el usuario autenticado."""
    return create_habit(db=db, habit_in=habit_in, user_id=current_user.id)

@router.patch("/{habit_id}", response_model=HabitResponse)
def modify_habit(
    habit_id: str,
    habit_in: HabitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza parcialmente un hábito (ej: marcar como completado, cambiar texto o categoría)."""
    updated_habit = update_habit(db=db, habit_id=habit_id, user_id=current_user.id, habit_in=habit_in)
    if not updated_habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hábito no encontrado o no autorizado"
        )
    return updated_habit

@router.delete("/{habit_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_habit(
    habit_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina un hábito del usuario autenticado."""
    deleted_habit = delete_habit(db=db, habit_id=habit_id, user_id=current_user.id)
    if not deleted_habit:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Hábito no encontrado o no autorizado"
        )
    return None