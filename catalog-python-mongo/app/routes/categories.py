from fastapi import APIRouter, HTTPException, Query

from app.controllers import category_controller
from app.schemas.category import CategoryCreate, CategoryResponse, CategoryFilter

router = APIRouter(
    prefix="/categories",
    tags=["Categories"]
)


@router.post(
    "/",
    response_model=CategoryResponse,
    status_code=201,
    summary="Crear una nueva categoria",
)
async def create_category(category: CategoryCreate):
    """Crea una nueva categoria de genero artistico en la base de datos.

    Valida que el id_sql no exista previamente para evitar duplicados.
    """
    existente = await category_controller.get_category_by_sql_id_db(category.id_sql)
    if existente:
        raise HTTPException(
            status_code=409,
            detail=f"Ya existe una categoria con id_sql='{category.id_sql}'",
        )

    data = category.model_dump()
    resultado = await category_controller.create_category_db(data)

    if not resultado:
        raise HTTPException(status_code=500, detail="Error al crear la categoria")

    return CategoryResponse.model_validate(resultado)


@router.get(
    "/",
    response_model=list[CategoryResponse],
    summary="Listar todas las categorias",
)
async def list_categories(
    nombre: str | None = Query(None, description="Filtrar categorias por nombre (busqueda parcial)"),
    id_sql: str | None = Query(None, description="Filtrar por identificador SQL exacto"),
):
    """Devuelve la lista de categorias de generos artisticos.

    Permite filtrar por nombre (busqueda parcial) o por id_sql exacto.
    Si no se envian filtros, devuelve todas las categorias.
    """
    if id_sql:
        doc = await category_controller.get_category_by_sql_id_db(id_sql)
        if not doc:
            return []
        return [CategoryResponse.model_validate(doc)]

    if nombre:
        docs = await category_controller.search_categories_db(nombre)
    else:
        docs = await category_controller.get_all_categories_db()

    return [CategoryResponse.model_validate(doc) for doc in docs]


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Obtener categoria por ID",
)
async def get_category(category_id: str):
    """Obtiene una categoria especifica por su ID de MongoDB."""
    doc = await category_controller.get_category_by_id_db(category_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Categoria no encontrada")

    return CategoryResponse.model_validate(doc)
