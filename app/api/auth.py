import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session as DBSession
from pydantic import BaseModel, EmailStr
from fastapi.security import OAuth2PasswordRequestForm

from app.database import get_db
from app.services.user import UserService
from app.schemas.user import UserCreate, UserResponse
from app.services.email_service import send_reset_email
from app.services.sessions import SessionService  # <--- Importamos nuestro servicio
from app.models.sessions import Session as UserSession  # <--- Tu modelo SQLAlchemy

router = APIRouter(prefix="", tags=["authentication"])

SECRET_KEY = "abc123_mi_clave_secreta"
ALGORITHM = "HS256"
RESET_PASSWORD_TOKEN_EXPIRE_MINUTES = 15
ACCESS_TOKEN_EXPIRE_HOURS = 24


# Schemas Pydantic
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# Helpers
def create_access_token(data: dict, expires_delta: timedelta = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_reset_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_PASSWORD_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "exp": expire,
        "sub": str(user_id),
        "purpose": "password_reset"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_reset_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("purpose") != "password_reset":
            return None
        return payload.get("sub")
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# --- Endpoints ---

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: DBSession = Depends(get_db)):
    existing_user = UserService.get_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )
    return UserService.create_user(db, user_data=user_in)


@router.post("/login")
def login(
    request: Request,  # <--- Agregamos Request para leer headers/IP
    login_data: LoginRequest, 
    db: DBSession = Depends(get_db)
):
    """Autentica al usuario, genera el JWT y registra la sesión activa en la BD."""
    user = UserService.get_by_email(db, email=login_data.email)
    
    if not user or not UserService.verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )
    
    # 1. Generamos el token de acceso
    token = create_access_token(data={"sub": str(user.id), "role": user.role_id, "type": "access"})
    
    # 2. Extraemos metadata del dispositivo con nuestro servicio
    session_data = SessionService.create_session_data(
        request=request, 
        refresh_token=token, 
        expires_days=30
    )

    # 3. Guardamos el registro de la sesión en la base de datos
    db_session = UserSession(
        user_id=str(user.id),
        **session_data
    )
    db.add(db_session)
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


@router.post("/forgot-password")
async def forgot_password(request: ForgotPasswordRequest, db: DBSession = Depends(get_db)):
    user = UserService.get_by_email(db, email=request.email)

    if not user:
        return {"message": "Si el correo está registrado, se ha enviado un enlace de recuperación."}

    reset_token = create_reset_token(user.id)
    reset_link = f"http://localhost:5173/reset-password?token={reset_token}"

    await send_reset_email(email=request.email, reset_link=reset_link)

    return {"message": "Si el correo está registrado, se ha enviado un enlace de recuperación."}


@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: DBSession = Depends(get_db)):
    user_id = verify_reset_token(request.token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de recuperación ha expirado o no es válido."
        )

    user = UserService.get_by_id(db, user_id=user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    UserService.update_password(db, user=user, new_password=request.new_password)
    return {"message": "Tu contraseña ha sido restablecida con éxito."}


@router.post("/token")
def login_swagger(
    request: Request,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: DBSession = Depends(get_db)
):
    """Soporte para probar desde la interfaz interactiva Swagger (/docs)."""
    user = UserService.get_by_email(db, email=form_data.username)

    if not user or not UserService.verify_password(form_data.password, user.password):
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos."
        )

    token = create_access_token(data={"sub": str(user.id), "role": user.role_id, "type": "access"})

    # Opcional: También registrar la sesión desde Swagger
    session_data = SessionService.create_session_data(request=request, refresh_token=token)
    db_session = UserSession(user_id=str(user.id), **session_data)
    db.add(db_session)
    db.commit()

    return {
        "access_token": token,
        "token_type": "bearer"
    }