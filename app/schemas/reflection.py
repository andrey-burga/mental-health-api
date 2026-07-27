# app/schemas/reflection.py
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


# Base comun para reutilizar campos
class DailyReflectionBase(BaseModel):
    phrase: str
    author: Optional[str] = "Anónimo"
    show_date: Optional[date] = None
    active: bool = True


# Schema para CREAR una nueva frase (para tu admin/backend)
class DailyReflectionCreate(DailyReflectionBase):
    pass


# Schema para la RESPUESTA que enviamos a la App Móvil
class DailyReflectionResponse(BaseModel):
    id: str
    phrase: str
    author: Optional[str] = "Anónimo"
    show_date: Optional[date] = None

    # Configuración para que Pydantic entienda los objetos ORM de SQLAlchemy
    model_config = ConfigDict(from_attributes=True)