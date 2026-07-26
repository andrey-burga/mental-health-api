from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Testimonial, User
from app.schemas import TestimonialCreate, TestimonialUpdate, TestimonialResponse
from app.services.auth_service import service_get_current_user as get_current_user

router = APIRouter(prefix="", tags=["Testimonials"])


# ---------------------------------------------------------
# 1. OBTENER TODOS LOS TESTIMONIOS (Público)
# ---------------------------------------------------------
@router.get("/", response_model=List[TestimonialResponse])
def get_testimonials(
    skip: int = 0, 
    limit: int = 10, 
    db: Session = Depends(get_db)
):
    """Obtiene la lista de testimonios paginada."""
    testimonials = db.query(Testimonial).offset(skip).limit(limit).all()
    return testimonials


# ---------------------------------------------------------
# 2. OBTENER UN TESTIMONIO POR SLUG O ID (Público)
# ---------------------------------------------------------
@router.get("/{slug_or_id}", response_model=TestimonialResponse)
def get_testimonial(slug_or_id: str, db: Session = Depends(get_db)):
    """Busca un testimonio por su ID o por su Slug único."""
    testimonial = db.query(Testimonial).filter(
        (Testimonial.slug == slug_or_id) | (Testimonial.id == slug_or_id)
    ).first()

    if not testimonial:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Testimonio no encontrado"
        )
    return testimonial


# ---------------------------------------------------------
# 3. CREAR UN TESTIMONIO (Autenticado)
# ---------------------------------------------------------
@router.post("/", response_model=TestimonialResponse, status_code=status.HTTP_201_CREATED)
def create_testimonial(
    testimonial_in: TestimonialCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Crea un nuevo testimonio asociado al usuario autenticado."""
    # Verificar si el slug ya existe
    existing_slug = db.query(Testimonial).filter(Testimonial.slug == testimonial_in.slug).first()
    if existing_slug:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="El slug ya está registrado. Usa uno diferente."
        )

    db_testimonial = Testimonial(
        **testimonial_in.model_dump(),
        author_id=current_user.id
    )
    db.add(db_testimonial)
    db.commit()
    db.refresh(db_testimonial)
    return db_testimonial


# ---------------------------------------------------------
# 4. ACTUALIZAR UN TESTIMONIO (Autenticado - Solo Autor/Admin)
# ---------------------------------------------------------
@router.put("/{testimonial_id}", response_model=TestimonialResponse)
def update_testimonial(
    testimonial_id: str,
    testimonial_in: TestimonialUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Actualiza un testimonio existente."""
    testimonial = db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()

    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonio no encontrado")

    # Control de permisos: Solo el propio autor o un admin puede actualizarlo
    if testimonial.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para modificar este testimonio"
        )

    # Actualizar solo los campos enviados (parcial)
    update_data = testimonial_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(testimonial, field, value)

    db.commit()
    db.refresh(testimonial)
    return testimonial


# ---------------------------------------------------------
# 5. ELIMINAR UN TESTIMONIO (Autenticado - Solo Autor/Admin)
# ---------------------------------------------------------
@router.delete("/{testimonial_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_testimonial(
    testimonial_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Elimina un testimonio de la base de datos."""
    testimonial = db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()

    if not testimonial:
        raise HTTPException(status_code=404, detail="Testimonio no encontrado")

    if testimonial.author_id != current_user.id and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, 
            detail="No tienes permiso para eliminar este testimonio"
        )

    db.delete(testimonial)
    db.commit()
    return None