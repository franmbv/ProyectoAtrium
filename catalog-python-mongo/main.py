from fastapi import FastAPI
from contextlib import asynccontextmanager
from app.config.database import init_db  
import uvicorn

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

if __name__ == "main":
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=3000,
        reload=True,
        workers=1
    )