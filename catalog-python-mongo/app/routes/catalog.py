from fastapi import APIRouter

router = APIRouter(prefix="/catalog", #Esto hace que todos los endpoints comienzen con '/catalog'
                    tags=["Categories"])

@router.get("/")
async def root():
    return {"msg": "Bienvenido a Catalog"}
