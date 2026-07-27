from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

# Esquema para responder a la App Móvil
class SessionResponse(BaseModel):
    id: str
    device_name: Optional[str] = Field(None, serialization_alias="device") # Coincide con 'device' en la app
    location: Optional[str] = "Ubicación desconocida"
    ip_address: Optional[str] = Field(None, serialization_alias="ip")
    last_active_at: datetime = Field(..., serialization_alias="lastAccess")
    is_current: bool = False # Campo calculado dinámicamente

    class Config:
        from_attributes = True