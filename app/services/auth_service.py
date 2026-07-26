from app.database import get_db
from app.core.config import (ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY)

from fastapi import Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from app.services.user import UserService

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="api/auth/token"
)


def service_get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])

        user_id = payload.get("sub")
        token_type = payload.get("type")

        if token_type != "access" or user_id is None:
            print("PAYLOAD:", payload)
            raise HTTPException(
                status_code=401,
                detail=f"Token inválido. Payload: {payload}"
            )


    except JWTError:
        raise HTTPException(
            status_code=401,
            detail="Token inválido"
        )

    user = UserService.get_by_id(db, user_id)

    if not user:
        raise HTTPException(
            status_code=401,
            detail="Usuario no encontrado"
        )

    return user
