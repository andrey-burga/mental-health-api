from datetime import datetime
from pydantic import BaseModel, EmailStr

# Campos comunes
class UserBase(BaseModel):
    email: EmailStr  # EmailStr valida automáticamente que sea un correo real
    name: str
    role_id: str

# Lo que recibimos al registrar un usuario
class UserCreate(UserBase):
    password: str

# Lo que nuestra API responde públicamente
class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role_id: str
    created_at: datetime

    class Config:
        # Esto le permite a Pydantic leer modelos de SQLAlchemy directamente
        from_attributes = True