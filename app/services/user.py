from sqlalchemy.orm import Session
from passlib.context import CryptContext
from app.models.user import User
from app.schemas.user import UserCreate

# Configuración del hashing de contraseñas
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class UserService:
    @staticmethod
    def get_password_hash(password: str) -> str:
        return pwd_context.hash(password)

    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    @staticmethod
    def get_by_email(db: Session, email: str):
        return db.query(User).filter(User.email == email).first()

    # --- NUEVO: Buscar usuario por ID ---
    @staticmethod
    def get_by_id(db: Session, user_id: int):
        """Busca un usuario por su clave primaria (ID)."""
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def create_user(db: Session, user_data: UserCreate):
        print(user_data.password)
        print(type(user_data.password))
        print(len(user_data.password))
        
        # 1. Encriptamos la contraseña antes de guardarla
        hashed_password = UserService.get_password_hash(user_data.password)
        
        # 2. Creamos el objeto del modelo
        db_user = User(
            email=user_data.email,
            name=user_data.name,
            password=hashed_password,
            role_id=user_data.role_id
        )
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    # --- NUEVO: Actualizar la contraseña ---
    @staticmethod
    def update_password(db: Session, user: User, new_password: str) -> User:
        """
        Hashea la nueva contraseña proporcionada y actualiza
        el registro del usuario en la base de datos.
        """
        user.password = UserService.get_password_hash(new_password)
        db.commit()
        db.refresh(user)
        return user