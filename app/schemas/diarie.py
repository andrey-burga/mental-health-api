from datetime import datetime
from pydantic import BaseModel, Field

# Esquema base con los campos comunes
class DiarieBase(BaseModel):
    mood: str = Field(..., description="Emoji o estado de ánimo del usuario")
    text: str = Field(..., description="Contenido de la entrada del diario")
    tag: str = Field(..., description="Etiqueta o categoría de la entrada")

# Esquema para crear una nueva entrada (lo que envía el cliente)
class DiarieCreate(DiarieBase):
    pass

# Esquema completo para la respuesta (lo que devuelve la API, incluye IDs y fechas)
class DiarieResponse(DiarieBase):
    id: str
    user_id: str
    created_at: datetime

    class Config:
        from_attributes = True  # Permite mapear modelos de SQLAlchemy a Pydantic (en Pydantic v2)