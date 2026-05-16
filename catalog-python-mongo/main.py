from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config.database import init_db  

@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield

app = FastAPI(
    title="Atrium - Catálogo",
    lifespan=lifespan
)

@app.get("/")
async def root():
    return {"message": "Hello World - Servidor activo y conectando a Mongo Atlas"}