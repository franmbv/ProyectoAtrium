from fastapi import APIRouter, Body, HTTPException, Query, status
from pydantic import TypeAdapter

from app.controllers.artwork_controller import (
    create_artwork_db,
    delete_artwork_db,
    list_artworks_db,
    update_artwork_db,
)
from app.schemas.artwork import ArtworkCreate, ArtworkResponse, Genre, StatusObra

router = APIRouter(prefix="/artworks", tags=["Artworks"])


@router.post("/", response_model=ArtworkResponse, status_code=status.HTTP_201_CREATED)
async def create_artwork(payload: ArtworkCreate = Body(...)):
    """Registra una nueva obra vinculada a un genero (pintura, escultura, etc.).

    Utiliza validacion polimorfica basada en el campo 'genero'.
    """
    data = payload.model_dump()
    result = await create_artwork_db(data)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error al crear la obra",
        )
    result["_id"] = str(result["_id"])
    return TypeAdapter(ArtworkResponse).validate_python(result)


@router.get("/")
async def list_artworks(
    precio_min: float | None = Query(None, ge=0, description="Precio minimo en USD"),
    precio_max: float | None = Query(None, ge=0, description="Precio maximo en USD"),
    status: StatusObra | None = Query(None, description="Estado de la obra (disponible, reservada, vendida)"),
    genero: Genre | None = Query(None, description="Tipo de obra (pintura, escultura, etc.)"),
    artista_id: str | None = Query(None, description="ID del artista"),
):
    """Lista obras con filtros opcionales mediante pipeline de agregación.

    Construye dinamicamente un pipeline de MongoDB:
      - $match — filtra por precio, status, genero y/o artista
      - $sort — ordena por nombre alfabético

    Ejemplo: GET /artworks/?precio_min=1000&precio_max=50000&status=disponible
    """
    pipeline_filters = {
        "precio_min": precio_min,
        "precio_max": precio_max,
        "status": status.value if status else None,
        "genero": genero.value if genero else None,
        "artista_id": artista_id,
    }

    obras = await list_artworks_db(**pipeline_filters)

    return [
        TypeAdapter(ArtworkResponse).validate_python({**doc, "_id": str(doc["_id"])})
        for doc in obras
    ]


@router.put("/{artwork_id}")
async def update_artwork(artwork_id: str, payload: ArtworkCreate = Body(...)):
    data = payload.model_dump()
    result = await update_artwork_db(artwork_id, data)
    if result is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Obra no encontrada",
        )
    result["_id"] = str(result["_id"])
    return TypeAdapter(ArtworkResponse).validate_python(result)


@router.delete("/{artwork_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_artwork(artwork_id: str):
    deleted = await delete_artwork_db(artwork_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Obra no encontrada",
        )
