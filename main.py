from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importamos la base de datos para poder crear las tablas
from app.database import engine, Base
# Importamos los modelos para que SQLAlchemy sepa qué tablas crear
import app.models  
# Importamos los routers
from app.api import articles, disorders, auth,testimonials,diarie,reflections,sessions,habit
 
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
    allow_origins=["*"], # Tu puerto de React / Vite
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoint de diagnóstico (/health)
@app.get("/health", tags=["Diagnostic"])
def health_check():
    return {"status": "ok", "service": "mental-health-api"}


app.include_router(articles.router, prefix="/api/articles", tags=["Articles"])

app.include_router(disorders.router, prefix="/api/disorders", tags=["Disorders"])

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])

app.include_router(testimonials.router, prefix="/api/testimonials", tags=["Testimonials"])

app.include_router(diarie.router, prefix="/api/diaries", tags=["Diarie"])

app.include_router(reflections.router, prefix="/api/reflections", tags=["Daily Reflections"])

app.include_router(sessions.router, prefix="/api/sessions", tags=["Sessions"])

app.include_router(habit.router, prefix="/api/habits", tags=["Habits"])



 