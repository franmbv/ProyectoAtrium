from fastapi import APIRouter, Body, HTTPException, status
from pydantic import TypeAdapter

from app.controllers.artwork_controller import (
    delete_artwork_db,
    update_artwork_db,
)
from app.schemas.artwork import ArtworkCreate, ArtworkResponse

router = APIRouter(prefix="/artworks", tags=["Artworks"])


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
