from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importamos la base de datos para poder crear las tablas
from app.database import engine, Base
# Importamos los modelos para que SQLAlchemy sepa qué tablas crear
import app.models  
# Importamos los routers
from app.api import articles, disorders, auth

# Crear las tablas en Postgres si no existen
# Nota: Esto es ideal para desarrollo rápido. En producción usarías migraciones (Alembic).
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Mental Health API",
    description="API de soporte y divulgación sobre salud mental",
    version="1.0.0"
)

# Configuración de CORS (equivalente a tu cors() en Express)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Modifica en producción con tus dominios reales
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint de diagnóstico (/health)
@app.get("/health", tags=["Diagnostic"])
def health_check():
    return {"status": "ok", "service": "mental-health-api"}

# Montar los routers con sus respectivos prefijos (el app.use(...) de Express)
app.include_router(articles.router, prefix="/api/articles", tags=["Articles"])
app.include_router(disorders.router, prefix="/api/disorders", tags=["Disorders"])
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])