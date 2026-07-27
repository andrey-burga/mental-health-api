from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db  # Importas la función que provee la sesión de DB
from app.schemas.reflection import DailyReflectionResponse, DailyReflectionCreate
from app.services.reflection_service import ReflectionService

router = APIRouter(
    prefix=""
)


@router.get(
    "/today",
    response_model=DailyReflectionResponse,
    status_code=status.HTTP_200_OK,
    summary="Obtener la reflexión diaria",
    description="Devuelve la frase asignada para el día de hoy. Si no hay una específica, retorna una activa de respaldo."
)
def get_today_reflection(db: Session = Depends(get_db)):
    reflection = ReflectionService.get_today_reflection(db)
    
    if not reflection:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No hay reflexiones disponibles en el sistema."
        )
        
    return reflection


@router.post(
    "/",
    response_model=DailyReflectionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Crear una nueva reflexión",
    description="Permite registrar frases en la base de datos para el consumo de la app."
)
def create_reflection(
    reflection_data: DailyReflectionCreate,
    db: Session = Depends(get_db)
):
    return ReflectionService.create_reflection(db, reflection_data)