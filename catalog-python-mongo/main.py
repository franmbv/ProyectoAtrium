from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.config.database import init_db  
import uvicorn
from app.routes.artworks import router as router_artworks
from app.routes.categories import router as router_categories

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="Atrium - Catálogo",
    lifespan=lifespan
)

app.include_router(router_artworks)
app.include_router(router_categories)

origins = [
    "http://localhost:3000",   # Ruta local estándar de Express
    "http://127.0.0.1:3000",   # Ruta local por IP de Express
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,           # Autoriza solo las URLs de la lista superior
    allow_credentials=True,          # Permite el envío de cookies o cabeceras de autenticación
    allow_methods=["*"],             # Permite todos los métodos HTTP (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],             # Permite todas las cabeceras (Content-Type, Authorization, etc.)
)


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        workers=1
    )