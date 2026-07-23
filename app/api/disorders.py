from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.disorder import DisorderCreate, DisorderResponse, SymptomCreate, SymptomResponse
from app.services.disorder import DisorderService

router = APIRouter()

# GET /api/disorders - Obtener todos los trastornos con sus síntomas
@router.get("/", response_model=List[DisorderResponse])
def read_disorders(db: Session = Depends(get_db)):
    return DisorderService.get_all(db)

# GET /api/disorders/slug/{slug} - Obtener trastorno por slug
@router.get("/slug/{slug}", response_model=DisorderResponse)
def read_disorder_by_slug(slug: str, db: Session = Depends(get_db)):
    disorder = DisorderService.get_by_slug(db, slug=slug)
    if not disorder:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail="Trastorno no encontrado"
        )
    return disorder

# POST /api/disorders - Crear un nuevo trastorno
@router.post("/", response_model=DisorderResponse, status_code=status.HTTP_201_CREATED)
def create_disorder(disorder: DisorderCreate, db: Session = Depends(get_db)):
    existing = DisorderService.get_by_slug(db, slug=disorder.slug)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Este trastorno ya está registrado"
        )
    return DisorderService.create(db, disorder_data=disorder)

# POST /api/disorders/symptoms - Agregar un síntoma a un trastorno
@router.post("/symptoms", response_model=SymptomResponse, status_code=status.HTTP_201_CREATED)
def add_symptom_to_disorder(symptom: SymptomCreate, db: Session = Depends(get_db)):
    return DisorderService.add_symptom(db, symptom_data=symptom)