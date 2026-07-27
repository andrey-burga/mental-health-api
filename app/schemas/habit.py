from datetime import datetime
from typing import Literal
from pydantic import BaseModel, Field

# Categorías permitidas según tu componente de React Native
CategoryType = Literal['Físico', 'Mental', 'Emocional', 'Social']

# Esquema base con los campos comunes
class HabitBase(BaseModel):
    text: str = Field(..., min_length=1, description="Descripción del micro-hábito")
    category: CategoryType

# Esquema para crear un hábito (lo que envía React Native al hacer POST)
class HabitCreate(HabitBase):
    pass

# Esquema para actualizar un hábito (por ejemplo, cambiar el estado 'completed' o editar el texto)
class HabitUpdate(BaseModel):
    text: str | None = Field(None, min_length=1)
    completed: bool | None = None
    category: CategoryType | None = None

# Esquema de respuesta (lo que FastAPI le devuelve a React Native)
class HabitResponse(HabitBase):
    id: str
    user_id: str
    completed: bool
    created_at: datetime

    class Config:
        from_attributes = True  # Permite mapear directamente desde el modelo SQLAlchemy