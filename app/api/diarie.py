from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db  # Ajusta según tu importación de sesión de BD
from app.schemas.diarie import DiarieCreate, DiarieResponse
from app.services.diarie import DiarieService
# Asumiendo que tienes un sistema de autenticación que te devuelve el usuario actual:
from app.services.auth_service import service_get_current_user as get_current_user
from app.models.user import User

router = APIRouter(prefix="")

@router.post("/", response_model=DiarieResponse, status_code=status.HTTP_201_CREATED)
def create_diarie_entry(
    entry_in: DiarieCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user) # Descomenta cuando integres auth
):
    # Simulado mientras integras auth: usa un ID de usuario de prueba o current_user.id
    current_user_id = current_user.id # Cambiar por current_user.id
    
    return DiarieService.create_entry(db=db, entry_in=entry_in, user_id=current_user_id)

@router.get("/", response_model=List[DiarieResponse])
def get_user_diarie_entries(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user_id = current_user.id # Cambiar por current_user.id
    return DiarieService.get_entries_by_user(db=db, user_id=current_user_id)

@router.delete("/{entry_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_diarie_entry(
    entry_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    current_user_id = current_user.id # Cambiar por current_user.id
    success = DiarieService.delete_entry(db=db, entry_id=entry_id, user_id=current_user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Entrada del diario no encontrada o no pertenece al usuario"
        )
    return None