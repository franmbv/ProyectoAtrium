from datetime import datetime
from enum import Enum
from typing import Annotated, Any, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field, field_validator


class FieldType(str, Enum):
    """Tipos de datos soportados en la plantilla dinamica de una categoria."""

    STRING = "string"
    NUMBER = "number"
    INTEGER = "integer"
    BOOLEAN = "boolean"
    ENUM = "enum"


class CategoryField(BaseModel):
    """Define un campo individual dentro de la plantilla dinamica de una categoria.

    Cada campo especifica su nombre, tipo, si es obligatorio y restricciones
    adicionales de validacion (min_length, max_length, min_value, max_value,
    opciones para tipo enum).
    """

    name: str = Field(..., min_length=1, max_length=50, description="Nombre del campo")
    field_type: FieldType = Field(..., description="Tipo de dato del campo")
    required: bool = Field(default=True, description="Si el campo es obligatorio")
    description: Optional[str] = Field(None, max_length=200, description="Descripcion del campo")
    min_length: Optional[int] = Field(None, ge=0, description="Longitud minima (para string)")
    max_length: Optional[int] = Field(None, ge=0, description="Longitud maxima (para string)")
    min_value: Optional[float] = Field(None, description="Valor minimo (para number/integer)")
    max_value: Optional[float] = Field(None, description="Valor maximo (para number/integer)")
    enum_options: Optional[list[str]] = Field(None, min_length=1, description="Opciones validas (para tipo enum)")

    @field_validator("enum_options")
    @classmethod
    def validar_enum_options(cls, v: Optional[list[str]], info) -> Optional[list[str]]:
        if v is not None:
            duplicates = set(v)
            if len(duplicates) != len(v):
                raise ValueError("Las opciones del enum no pueden tener duplicados")
            if len(v) < 2:
                raise ValueError("El enum debe tener al menos 2 opciones")
        return v

    @field_validator("max_length")
    @classmethod
    def validar_max_length(cls, v: Optional[int], info) -> Optional[int]:
        if v is not None and info.data.get("min_length") is not None:
            if v < info.data["min_length"]:
                raise ValueError("max_length no puede ser menor que min_length")
        return v

    @field_validator("max_value")
    @classmethod
    def validar_max_value(cls, v: Optional[float], info) -> Optional[float]:
        if v is not None and info.data.get("min_value") is not None:
            if v < info.data["min_value"]:
                raise ValueError("max_value no puede ser menor que min_value")
        return v


class CategoryBase(BaseModel):
    """Campos compartidos para todas las categorias.

    Contiene el identificador de referencia SQL (id_sql), el nombre descriptivo
    de la categoria y la estructura de la plantilla dinamica que define
    los campos especificos que deben tener las obras de esta categoria.
    """

    id_sql: str = Field(
        ...,
        min_length=1,
        max_length=50,
        pattern=r"^[a-z_]+$",
        description="Identificador unico de referencia (formato snake_case)",
    )
    nombre: str = Field(..., min_length=1, max_length=100, description="Nombre de la categoria")
    descripcion: Optional[str] = Field(None, max_length=500, description="Descripcion de la categoria")
    plantilla: list[CategoryField] = Field(
        ...,
        min_length=1,
        description="Estructura de la plantilla dinamica con los campos especificos de la categoria",
    )

    @field_validator("plantilla")
    @classmethod
    def validar_nombres_unicos(cls, v: list[CategoryField]) -> list[CategoryField]:
        nombres = [campo.name for campo in v]
        if len(set(nombres)) != len(nombres):
            raise ValueError("Los nombres de los campos en la plantilla deben ser unicos")
        return v


class CategoryCreate(CategoryBase):
    """Esquema para crear una nueva categoria.

    Hereda todos los campos de CategoryBase incluyendo el id_sql
    y la estructura completa de la plantilla dinamica.
    """

    pass


class CategoryUpdate(BaseModel):
    """Esquema para actualizacion parcial de una categoria.

    Todos los campos son opcionales para permitir actualizaciones parciales.
    El id_sql no se puede modificar despues de la creacion.
    """

    nombre: Optional[str] = Field(None, min_length=1, max_length=100, description="Nuevo nombre de la categoria")
    descripcion: Optional[str] = Field(None, max_length=500, description="Nueva descripcion")
    plantilla: Optional[list[CategoryField]] = Field(
        None,
        min_length=1,
        description="Nueva estructura de la plantilla dinamica",
    )

    @field_validator("plantilla")
    @classmethod
    def validar_nombres_unicos_update(cls, v: Optional[list[CategoryField]]) -> Optional[list[CategoryField]]:
        if v is not None:
            nombres = [campo.name for campo in v]
            if len(set(nombres)) != len(nombres):
                raise ValueError("Los nombres de los campos en la plantilla deben ser unicos")
        return v


class CategoryResponseBase(BaseModel):
    """Campos adicionales que solo existen en la respuesta desde MongoDB."""

    id: str = Field(..., alias="_id", description="ID de MongoDB")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Fecha de creacion del registro")
    updated_at: Optional[datetime] = Field(None, description="Ultima modificacion del registro")

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class CategoryResponse(CategoryBase, CategoryResponseBase):
    """Esquema de respuesta completa para una categoria.

    Combina los campos de CategoryBase (id_sql, nombre, descripcion, plantilla)
    con los campos de respuesta de MongoDB (id, created_at, updated_at).
    """

    model_config = ConfigDict(
        populate_by_name=True,
        from_attributes=True,
    )


class CategoryFilter(BaseModel):
    """Filtros opcionales para la busqueda de categorias."""

    id_sql: Optional[str] = Field(None, description="Filtrar por identificador SQL")
    nombre: Optional[str] = Field(None, description="Filtrar por nombre (busqueda parcial)")
