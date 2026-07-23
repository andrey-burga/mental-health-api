import os
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

# Modificado para evitar que la conexión SSL se cierre inesperadamente
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,   # Verifica que la conexión esté viva antes de enviar la consulta
    pool_recycle=1800,    # Recicla las conexiones cada 30 minutos (evita timeouts del servidor)
    pool_size=5,          # Mantiene un pool de conexiones controlado
    max_overflow=10       # Permite conexiones adicionales temporales si es necesario
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()