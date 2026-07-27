from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, Header, Request, status
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.sessions import Session as UserSession
from app.services.sessions import SessionService

# Asumimos que tienes una función/dependencia para obtener el usuario autenticado
# Ejemplo: desde app.dependencies import get_current_user
from app.services.auth_service import service_get_current_user as get_current_user

router = APIRouter(prefix="")


# ------------------------------------------------------------------
# Schemas Pydantic para la Respuesta (Coinciden con React Native)
# ------------------------------------------------------------------
class SessionResponse(BaseModel):
    id: str
    device: str = Field(..., validation_alias="device_name")
    location: str
    ip: str = Field(..., validation_alias="ip_address")
    lastAccess: str  # Formato legible para el cliente
    current: bool = False

    class Config:
        from_attributes = True


# ------------------------------------------------------------------
# Endpoints
# ------------------------------------------------------------------

@router.get("", response_model=List[SessionResponse])
def get_user_sessions(
    request: Request,
    authorization: str = Header(..., description="Bearer <token>"),
    current_user = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Obtiene la lista de sesiones activas del usuario autenticado.
    Calcula dinámicamente cuál es la sesión desde la que se hace la petición.
    """
    # 1. Extraemos el token puro enviándolo en el Header Authorization
    raw_token = authorization.replace("Bearer ", "").strip()
    current_token_hash = SessionService.hash_token(raw_token)

    # 2. Consultamos solo las sesiones que NO han expirado
    now_utc = datetime.now(timezone.utc)
    sessions = db.query(UserSession).filter(
        UserSession.user_id == str(current_user.id),
        UserSession.expires_at > now_utc
    ).order_by(UserSession.last_active_at.desc()).all()

    # 3. Formateamos la respuesta para la App Móvil
    response = []
    for sess in sessions:
        # Evaluamos si es la sesión actual comparando los hashes
        is_current_session = (sess.refresh_token_hash == current_token_hash)
        
        # Opcional: Formatear la fecha a un texto tipo "Hace 2 horas" o "Ahora mismo"
        last_access_str = "Ahora mismo" if is_current_session else sess.last_active_at.strftime("%Y-%m-%d %H:%M")

        sess_dto = SessionResponse(
            id=sess.id,
            device_name=sess.device_name or "Dispositivo desconocido",
            location=sess.location or "Ubicación desconocida",
            ip_address=sess.ip_address or "IP no registrada",
            lastAccess=last_access_str,
            current=is_current_session
        )
        response.append(sess_dto)

    return response


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def revoke_session(
    session_id: str,
    current_user = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """Cierra/Elimina una sesión específica del usuario."""
    session_to_delete = db.query(UserSession).filter(
        UserSession.id == session_id,
        UserSession.user_id == str(current_user.id)
    ).first()

    if not session_to_delete:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La sesión no existe o no te pertenece."
        )

    db.delete(session_to_delete)
    db.commit()
    return None


@router.delete("", status_code=status.HTTP_204_NO_CONTENT)
def revoke_all_other_sessions(
    authorization: str = Header(..., description="Bearer <token>"),
    current_user = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """Cierra todas las sesiones activas del usuario MENOS la actual."""
    raw_token = authorization.replace("Bearer ", "").strip()
    current_token_hash = SessionService.hash_token(raw_token)

    # Eliminamos todas las sesiones del usuario cuyo hash no coincida con la actual
    db.query(UserSession).filter(
        UserSession.user_id == str(current_user.id),
        UserSession.refresh_token_hash != current_token_hash
    ).delete(synchronize_session=False)

    db.commit()
    return None