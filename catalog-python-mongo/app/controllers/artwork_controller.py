from datetime import date, datetime
from typing import Any

from bson import ObjectId, errors

from app.config.database import db

COLLECTION = "artworks"


def _prepare_for_mongo(data: dict[str, Any]) -> dict[str, Any]:
    for key, value in data.items():
        if isinstance(value, date) and not isinstance(value, datetime):
            data[key] = datetime.combine(value, datetime.min.time())
    return data


def _build_match_stage(
    precio_min: float | None = None,
    precio_max: float | None = None,
    status: str | None = None,
    genero: str | None = None,
    artista_id: str | None = None,
) -> dict[str, Any]:
    """Construye la etapa $match del pipeline de agregación.

    Solo incluye los campos que reciben valor (None = no filtrar).
    Para precios usa operadores $gte / $lte.
    """
    match: dict[str, Any] = {}

    if genero:
        match["genero"] = genero

    if artista_id:
        match["artista_id"] = artista_id

    if status:
        match["status"] = status

    if precio_min is not None or precio_max is not None:
        price_query: dict[str, float] = {}
        if precio_min is not None:
            price_query["$gte"] = precio_min
        if precio_max is not None:
            price_query["$lte"] = precio_max
        match["precio_venta"] = price_query

    return match


async def list_artworks_db(
    precio_min: float | None = None,
    precio_max: float | None = None,
    status: str | None = None,
    genero: str | None = None,
    artista_id: str | None = None,
) -> list[dict[str, Any]]:
    """Consulta obras mediante un pipeline de agregación con $match dinámico.

    El pipeline se construye paso a paso:
      1. $match — filtra por los criterios recibidos (precio, status, genero, artista).
      2. $sort — ordena por nombre alfabético.
    """
    match_stage = _build_match_stage(
        precio_min=precio_min,
        precio_max=precio_max,
        status=status,
        genero=genero,
        artista_id=artista_id,
    )

    pipeline: list[dict[str, Any]] = [
        {"$match": match_stage},
        {"$sort": {"nombre": 1}},
    ]

    cursor = db[COLLECTION].aggregate(pipeline)
    return await cursor.to_list(length=None)


async def update_artwork_db(artwork_id: str, data: dict[str, Any]) -> dict[str, Any] | None:
    try:
        obj_id = ObjectId(artwork_id)
    except errors.InvalidId:
        return None

    data.pop("_id", None)
    _prepare_for_mongo(data)
    data["updated_at"] = datetime.utcnow()

    result = await db[COLLECTION].find_one_and_update(
        {"_id": obj_id},
        {"$set": data},
        return_document=True,
    )
    return result


async def delete_artwork_db(artwork_id: str) -> bool:
    try:
        obj_id = ObjectId(artwork_id)
    except errors.InvalidId:
        return False

    result = await db[COLLECTION].delete_one({"_id": obj_id})
    return result.deleted_count > 0
