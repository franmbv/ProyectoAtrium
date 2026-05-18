from datetime import datetime
from typing import Any

from bson import ObjectId, errors

from app.config.database import db

COLLECTION = "categories"


def _prepare_for_mongo(data: dict[str, Any]) -> dict[str, Any]:
    for key, value in list(data.items()):
        if isinstance(value, list):
            data[key] = [
                item.model_dump() if hasattr(item, "model_dump") else item
                for item in value
            ]
    return data


async def create_category_db(data: dict[str, Any]) -> dict[str, Any] | None:
    data = _prepare_for_mongo(data)
    data["created_at"] = datetime.utcnow()
    data["updated_at"] = None

    result = await db[COLLECTION].insert_one(data)

    doc = await db[COLLECTION].find_one({"_id": result.inserted_id})
    return doc


async def get_all_categories_db() -> list[dict[str, Any]]:
    cursor = db[COLLECTION].find().sort("nombre", 1)
    return await cursor.to_list(length=None)


async def get_category_by_id_db(category_id: str) -> dict[str, Any] | None:
    try:
        obj_id = ObjectId(category_id)
    except errors.InvalidId:
        return None

    return await db[COLLECTION].find_one({"_id": obj_id})


async def get_category_by_sql_id_db(id_sql: str) -> dict[str, Any] | None:
    return await db[COLLECTION].find_one({"id_sql": id_sql})


async def search_categories_db(nombre: str | None = None) -> list[dict[str, Any]]:
    query: dict[str, Any] = {}
    if nombre:
        query["nombre"] = {"$regex": nombre, "$options": "i"}

    cursor = db[COLLECTION].find(query).sort("nombre", 1)
    return await cursor.to_list(length=None)
