import os
from pathlib import Path
from sqlalchemy import create_engine 
from dotenv import load_dotenv
from app.core.settings import settings  # Importa la instancia desde settings.py

load_dotenv()

# --- AQUÍ ESTABA EL DETALLE: Asignar las variables explícitamente ---
SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM  # Usa el del .env a través de settings
ACCESS_TOKEN_EXPIRE_MINUTES = settings.ACCESS_TOKEN_EXPIRE_MINUTES

# Configuración del motor de la base de datos
engine = create_engine(settings.DATABASE_URL)