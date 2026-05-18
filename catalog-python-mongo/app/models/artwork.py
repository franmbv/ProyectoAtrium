from typing import Optional, Union, Annotated
from datetime import date, datetime
from beanie import Document
from pydantic import Field
from app.schemas.artwork import Genre, StatusObra

class Artwork(Document):
    """Modelo de Beanie para la colección de obras.
    
    Hereda de Document, lo que permite usar métodos asíncronos como
    Artwork.find(), Artwork.insert(), etc.
    """
    nombre: str = Field(..., min_length=1, max_length=200)
    artista_id: str
    precio_venta: float = Field(..., gt=0)
    fecha_creacion: date
    foto: str
    descripcion: Optional[str] = Field(None, max_length=2000)
    genero: Genre
    status: StatusObra = Field(default=StatusObra.DISPONIBLE)
    
    # Campos dinámicos según el género
    tecnica: Optional[str] = None
    soporte: Optional[str] = None
    material: Optional[str] = None
    peso_kg: Optional[float] = None
    peso_g: Optional[float] = None
    alto_cm: Optional[float] = None
    ancho_cm: Optional[float] = None
    largo_cm: Optional[float] = None
    profundidad_cm: Optional[float] = None
    papel: Optional[str] = None
    edicion: Optional[int] = None
    tipo_arcilla: Optional[str] = None
    tecnica_coccion: Optional[str] = None
    esmaltado: Optional[bool] = None
    quilates: Optional[float] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    class Settings:
        name = "artworks"  # Vincula este modelo a la colección 'artworks'
        use_enum_values = True
