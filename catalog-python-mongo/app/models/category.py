from typing import Optional, list
from datetime import datetime
from beanie import Document
from pydantic import Field
from app.schemas.category import CategoryField

class Category(Document):
    """Modelo de Beanie para la colección de categorías (plantillas)."""
    
    id_sql: str = Field(..., min_length=1, max_length=50)
    nombre: str = Field(..., min_length=1, max_length=100)
    descripcion: Optional[str] = Field(None, max_length=500)
    plantilla: list[CategoryField] = Field(default_factory=list)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "categories"  # Vincula este modelo a la colección 'categories'
