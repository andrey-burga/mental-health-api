import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr

from app.database import get_db
from app.services.user import UserService
from app.schemas.user import UserCreate, UserResponse
from app.services.email_service import send_reset_email

# 1. Configuración de Router y Seguridad Unificada
# Nota: En producción, extrae esto a variables de entorno (p. ej., usando python-dotenv o Pydantic Settings)
router = APIRouter(prefix="", tags=["authentication"])

SECRET_KEY = "abc123_mi_clave_secreta"
ALGORITHM = "HS256"
RESET_PASSWORD_TOKEN_EXPIRE_MINUTES = 15
ACCESS_TOKEN_EXPIRE_HOURS = 24


# 2. Modelos de Datos (Pydantic Schemas)
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


# 3. Funciones Auxiliares para Generación y Validación de Tokens
def create_access_token(data: dict, expires_delta: timedelta = timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)):

    """Genera el token de sesión tradicional para el usuario."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + expires_delta
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_reset_token(user_id: int) -> str:
    """
    Genera un JWT firmado de corta duración específico para restaurar contraseña.
    Usa el ID del usuario y un 'purpose' para que no pueda usarse como sesión normal.
    """
    expire = datetime.now(timezone.utc) + timedelta(minutes=RESET_PASSWORD_TOKEN_EXPIRE_MINUTES)
    to_encode = {
        "exp": expire,
        "sub": str(user_id),
        "purpose": "password_reset"
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_reset_token(token: str) -> Optional[str]:
    """Verifica la validez, firma, expiración y propósito del token de recuperación."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        
        if payload.get("purpose") != "password_reset":
            return None
            
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        return user_id
    except (jwt.ExpiredSignatureError, jwt.InvalidTokenError):
        return None


# 4. Endpoints de Registro y Login (Uso de Base de Datos Real)

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    """Registra un nuevo usuario verificando previamente si el correo ya existe."""
    existing_user = UserService.get_by_email(db, email=user_in.email)
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )
    return UserService.create_user(db, user_data=user_in)


@router.post("/login")
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    """Autentica al usuario y retorna un token JWT junto con información básica."""
    user = UserService.get_by_email(db, email=login_data.email)
    
    # Aquí asumimos que UserService.verify_password ya se encarga del hashing/verificación (p. ej. usando passlib)
    if not user or not UserService.verify_password(login_data.password, user.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )
    
    # Generamos el token de acceso guardando el ID del usuario y su rol
    token = create_access_token(data={"sub": user.id,"role": user.role_id,"type": "access"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


# 5. Endpoints de Recuperación de Contraseña (Migrados de simulación a DB Real)

@router.post("/forgot-password")
async def forgot_password(
    request: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):

    user = UserService.get_by_email(db, email=request.email)

    if not user:
        return {
            "message": "Si el correo está registrado, se ha enviado un enlace de recuperación."
        }

    reset_token = create_reset_token(user.id)

    reset_link = (
        f"http://localhost:5173/reset-password?token={reset_token}"
    )

    await send_reset_email(
        email=request.email,
        reset_link=reset_link
    )

    return {
        "message": "Si el correo está registrado, se ha enviado un enlace de recuperación."
    }

@router.post("/reset-password")
async def reset_password(request: ResetPasswordRequest, db: Session = Depends(get_db)):
    """
    Valida el token recibido por parámetros e introduce la nueva contraseña
    hasheada dentro del registro del usuario en la base de datos real.
    """
    # 1. Validar el token JWT
    user_id = verify_reset_token(request.token)
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El token de recuperación ha expirado o no es válido."
        )

    # 2. Buscar al usuario en la base de datos usando el ID extraído del token
    user = UserService.get_by_id(db, user_id=user_id) # Asegúrate de tener este método en tu UserService
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    # 3. Actualizar la contraseña usando tu UserService para persistir el cambio
    # Se asume que UserService se encarga internamente de hashear 'request.new_password'
    # mediante un método diseñado para actualizar datos.
    UserService.update_password(db, user=user, new_password=request.new_password)

    return {"message": "Tu contraseña ha sido restablecida con éxito."}














from fastapi.security import OAuth2PasswordRequestForm


@router.post("/token")
def login_swagger(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = UserService.get_by_email(
        db,
        email=form_data.username
    )

    if not user or not UserService.verify_password(
        form_data.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Correo o contraseña incorrectos."
        )

    token = create_access_token(
        data={
            "sub": user.id,
            "role": user.role_id,
            "type": "access"
        }
    )

    return {
        "access_token": token,
        "token_type": "bearer"
    }
