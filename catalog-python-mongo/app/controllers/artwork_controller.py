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
