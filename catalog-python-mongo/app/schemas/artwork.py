from datetime import date, datetime
from enum import Enum
from typing import Annotated, Optional, Union, Literal

from pydantic import BaseModel, Field, field_validator, ConfigDict


class Genre(str, Enum):
    PINTURA = "pintura"
    ESCULTURA = "escultura"
    FOTOGRAFIA = "fotografia"
    CERAMICA = "ceramica"
    ORFEBRERIA = "orfebreria"


class StatusObra(str, Enum):
    DISPONIBLE = "disponible"
    RESERVADA = "reservada"
    VENDIDA = "vendida"


class ArtworkBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=200, description="Nombre de la obra")
    artista_id: str = Field(..., description="ID del artista creador")
    precio_venta: float = Field(..., gt=0, description="Precio de venta en USD")
    fecha_creacion: date = Field(..., description="Fecha de creación de la obra")
    foto: str = Field(..., description="URL de la fotografía de la obra")
    descripcion: Optional[str] = Field(None, max_length=2000, description="Descripción adicional")

    @field_validator("precio_venta")
    @classmethod
    def redondear_precio(cls, v: float) -> float:
        return round(v, 2)

    @field_validator("fecha_creacion")
    @classmethod
    def no_futura(cls, v: date) -> date:
        if v > date.today():
            raise ValueError("La fecha de creación no puede ser futura")
        return v


class PinturaCreate(ArtworkBase):
    genero: Literal[Genre.PINTURA] = Genre.PINTURA
    tecnica: str = Field(..., min_length=1, max_length=100, description="Técnica (óleo, acrílico, acuarela, témpera, etc.)")
    soporte: str = Field(..., min_length=1, max_length=100, description="Soporte (lienzo, madera, papel, cartón, etc.)")
    alto_cm: float = Field(..., gt=0, description="Altura en centímetros")
    ancho_cm: float = Field(..., gt=0, description="Anchura en centímetros")


class EsculturaCreate(ArtworkBase):
    genero: Literal[Genre.ESCULTURA] = Genre.ESCULTURA
    material: str = Field(..., min_length=1, max_length=100, description="Material (bronce, mármol, madera, hierro, etc.)")
    peso_kg: float = Field(..., gt=0, description="Peso en kilogramos")
    largo_cm: float = Field(..., gt=0, description="Largo en centímetros")
    ancho_cm: float = Field(..., gt=0, description="Ancho en centímetros")
    profundidad_cm: float = Field(..., gt=0, description="Profundidad en centímetros")


class FotografiaCreate(ArtworkBase):
    genero: Literal[Genre.FOTOGRAFIA] = Genre.FOTOGRAFIA
    tecnica: str = Field(..., min_length=1, max_length=100, description="Técnica (digital, analógica)")
    papel: Optional[str] = Field(None, max_length=100, description="Tipo de papel o soporte fotográfico")
    alto_cm: float = Field(..., gt=0, description="Altura en centímetros")
    ancho_cm: float = Field(..., gt=0, description="Anchura en centímetros")
    edicion: Optional[int] = Field(None, ge=1, description="Número de edición / tirada")


class CeramicaCreate(ArtworkBase):
    genero: Literal[Genre.CERAMICA] = Genre.CERAMICA
    tipo_arcilla: str = Field(..., min_length=1, max_length=100, description="Tipo de arcilla (porcelana, gres, loza, etc.)")
    tecnica_coccion: str = Field(..., min_length=1, max_length=100, description="Técnica de cocción (bizcocho, esmaltado, raku, etc.)")
    peso_kg: float = Field(..., gt=0, description="Peso en kilogramos")
    alto_cm: float = Field(..., gt=0, description="Altura en centímetros")
    ancho_cm: float = Field(..., gt=0, description="Anchura en centímetros")
    profundidad_cm: float = Field(..., gt=0, description="Profundidad en centímetros")
    esmaltado: Optional[bool] = Field(None, description="Indica si la pieza tiene esmaltado")


class OrfebreriaCreate(ArtworkBase):
    genero: Literal[Genre.ORFEBRERIA] = Genre.ORFEBRERIA
    material: str = Field(..., min_length=1, max_length=100, description="Material (oro, plata, bronce, cobre, etc.)")
    tecnica: str = Field(..., min_length=1, max_length=100, description="Técnica de orfebrería (filigrana, repujado, fundición, etc.)")
    peso_g: float = Field(..., gt=0, description="Peso en gramos")
    alto_cm: float = Field(..., gt=0, description="Altura en centímetros")
    ancho_cm: float = Field(..., gt=0, description="Anchura en centímetros")
    profundidad_cm: float = Field(..., gt=0, description="Profundidad en centímetros")
    quilates: Optional[float] = Field(None, ge=0, le=24, description="Quilates del material (0–24)")


ArtworkCreate = Annotated[
    Union[
        PinturaCreate,
        EsculturaCreate,
        FotografiaCreate,
        CeramicaCreate,
        OrfebreriaCreate,
    ],
    Field(discriminator="genero")
]


class ArtworkResponseBase(BaseModel):
    id: str = Field(..., alias="_id")
    status: StatusObra = Field(default=StatusObra.DISPONIBLE)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
        json_encoders={datetime: lambda dt: dt.isoformat()},
    )


class PinturaResponse(PinturaCreate, ArtworkResponseBase):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class EsculturaResponse(EsculturaCreate, ArtworkResponseBase):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class FotografiaResponse(FotografiaCreate, ArtworkResponseBase):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class CeramicaResponse(CeramicaCreate, ArtworkResponseBase):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class OrfebreriaResponse(OrfebreriaCreate, ArtworkResponseBase):
    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


ArtworkResponse = Annotated[
    Union[
        PinturaResponse,
        EsculturaResponse,
        FotografiaResponse,
        CeramicaResponse,
        OrfebreriaResponse,
    ],
    Field(discriminator="genero")
]


class ArtworkFilter(BaseModel):
    genero: Optional[Genre] = None
    artista_id: Optional[str] = None
    precio_min: Optional[float] = Field(None, ge=0, description="Precio mínimo")
    precio_max: Optional[float] = Field(None, ge=0, description="Precio máximo")
    status: Optional[StatusObra] = None
