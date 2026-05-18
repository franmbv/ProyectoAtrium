from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.schemas.category import (
    CategoryCreate, CategoryResponse, CategoryUpdate,
    CategoryField, CategoryFilter, FieldType,
)
from main import app


@pytest.fixture
def client():
    return TestClient(app)


# ===================================================================
# TESTS DE SCHEMAS (validación Pydantic pura, sin base de datos)
# ===================================================================

class TestCategoryField:

    def test_valid_string_field(self):
        field = CategoryField(
            name="tecnica",
            field_type=FieldType.STRING,
            required=True,
            min_length=1,
            max_length=100,
        )
        assert field.name == "tecnica"
        assert field.field_type == FieldType.STRING
        assert field.required is True
        assert field.min_length == 1
        assert field.max_length == 100

    def test_valid_number_field(self):
        field = CategoryField(
            name="alto_cm",
            field_type=FieldType.NUMBER,
            required=True,
            min_value=0,
        )
        assert field.field_type == FieldType.NUMBER
        assert field.min_value == 0.0

    def test_valid_enum_field(self):
        field = CategoryField(
            name="status",
            field_type=FieldType.ENUM,
            required=True,
            enum_options=["disponible", "vendida", "reservada"],
        )
        assert field.enum_options == ["disponible", "vendida", "reservada"]

    def test_duplicate_enum_options_raises(self):
        with pytest.raises(ValueError, match="duplicados"):
            CategoryField(
                name="status",
                field_type=FieldType.ENUM,
                enum_options=["a", "a", "b"],
            )

    def test_enum_with_less_than_2_options_raises(self):
        with pytest.raises(ValueError, match="al menos 2"):
            CategoryField(
                name="status",
                field_type=FieldType.ENUM,
                enum_options=["solo_uno"],
            )

    def test_max_length_less_than_min_length_raises(self):
        with pytest.raises(ValueError, match="no puede ser menor"):
            CategoryField(
                name="campo",
                field_type=FieldType.STRING,
                min_length=50,
                max_length=10,
            )

    def test_max_value_less_than_min_value_raises(self):
        with pytest.raises(ValueError, match="no puede ser menor"):
            CategoryField(
                name="cantidad",
                field_type=FieldType.INTEGER,
                min_value=100,
                max_value=10,
            )

    def test_name_max_length(self):
        with pytest.raises(Exception):
            CategoryField(
                name="a" * 51,
                field_type=FieldType.STRING,
            )

    def test_optional_field_defaults(self):
        field = CategoryField(name="x", field_type=FieldType.STRING)
        assert field.required is True
        assert field.description is None
        assert field.min_length is None
        assert field.enum_options is None


class TestCategoryCreate:

    def _valid_plantilla(self):
        return [
            CategoryField(name="tecnica", field_type=FieldType.STRING, required=True),
            CategoryField(name="alto_cm", field_type=FieldType.NUMBER, required=True),
        ]

    def test_valid_category_creation(self):
        cat = CategoryCreate(
            id_sql="pintura",
            nombre="Pintura",
            descripcion="Obras pictoricas",
            plantilla=self._valid_plantilla(),
        )
        assert cat.id_sql == "pintura"
        assert cat.nombre == "Pintura"
        assert len(cat.plantilla) == 2

    def test_invalid_id_sql_uppercase_raises(self):
        with pytest.raises(Exception, match="pattern"):
            CategoryCreate(
                id_sql="Pintura",
                nombre="Pintura",
                plantilla=self._valid_plantilla(),
            )

    def test_invalid_id_sql_with_spaces_raises(self):
        with pytest.raises(Exception, match="pattern"):
            CategoryCreate(
                id_sql="pintura oleo",
                nombre="Pintura",
                plantilla=self._valid_plantilla(),
            )

    def test_invalid_id_sql_with_numbers_raises(self):
        with pytest.raises(Exception, match="pattern"):
            CategoryCreate(
                id_sql="pintura1",
                nombre="Pintura",
                plantilla=self._valid_plantilla(),
            )

    def test_valid_id_sql_with_underscores(self):
        cat = CategoryCreate(
            id_sql="arte_digital",
            nombre="Arte Digital",
            plantilla=[CategoryField(name="formato", field_type=FieldType.STRING)],
        )
        assert cat.id_sql == "arte_digital"

    def test_duplicate_field_names_in_plantilla_raises(self):
        with pytest.raises(ValueError, match="unicos"):
            CategoryCreate(
                id_sql="test",
                nombre="Test",
                plantilla=[
                    CategoryField(name="campo", field_type=FieldType.STRING),
                    CategoryField(name="campo", field_type=FieldType.NUMBER),
                ],
            )

    def test_empty_plantilla_raises(self):
        with pytest.raises(Exception):
            CategoryCreate(
                id_sql="test",
                nombre="Test",
                plantilla=[],
            )

    def test_id_sql_max_length(self):
        with pytest.raises(Exception):
            CategoryCreate(
                id_sql="a" * 51,
                nombre="Test",
                plantilla=self._valid_plantilla(),
            )

    def test_nombre_max_length(self):
        with pytest.raises(Exception):
            CategoryCreate(
                id_sql="test",
                nombre="a" * 101,
                plantilla=self._valid_plantilla(),
            )

    def test_descripcion_max_length(self):
        with pytest.raises(Exception):
            CategoryCreate(
                id_sql="test",
                nombre="Test",
                descripcion="a" * 501,
                plantilla=self._valid_plantilla(),
            )

    def test_model_dump(self):
        cat = CategoryCreate(
            id_sql="pintura",
            nombre="Pintura",
            plantilla=self._valid_plantilla(),
        )
        data = cat.model_dump()
        assert data["id_sql"] == "pintura"
        assert isinstance(data["plantilla"], list)
        assert data["plantilla"][0]["name"] == "tecnica"


class TestCategoryUpdate:

    def _valid_plantilla(self):
        return [
            CategoryField(name="material", field_type=FieldType.STRING),
        ]

    def test_valid_partial_update(self):
        update = CategoryUpdate(nombre="Nuevo Nombre")
        assert update.nombre == "Nuevo Nombre"
        assert update.descripcion is None
        assert update.plantilla is None

    def test_valid_full_update(self):
        update = CategoryUpdate(
            nombre="Escultura",
            descripcion="Obras en 3D",
            plantilla=self._valid_plantilla(),
        )
        assert update.nombre == "Escultura"
        assert update.descripcion == "Obras en 3D"
        assert len(update.plantilla) == 1

    def test_duplicate_field_names_in_update_raises(self):
        with pytest.raises(ValueError, match="unicos"):
            CategoryUpdate(
                plantilla=[
                    CategoryField(name="x", field_type=FieldType.STRING),
                    CategoryField(name="x", field_type=FieldType.NUMBER),
                ]
            )

    def test_all_fields_none_by_default(self):
        update = CategoryUpdate()
        assert update.nombre is None
        assert update.descripcion is None
        assert update.plantilla is None


class TestCategoryResponse:

    def _sample_response(self):
        return CategoryResponse(
            _id="507f191e810c19729de860ea",
            id_sql="pintura",
            nombre="Pintura",
            plantilla=[
                CategoryField(name="tecnica", field_type=FieldType.STRING),
            ],
        )

    def test_valid_response(self):
        resp = self._sample_response()
        assert resp.id == "507f191e810c19729de860ea"
        assert resp.id_sql == "pintura"
        assert resp.created_at is not None

    def test_response_serialization(self):
        resp = self._sample_response()
        json_data = resp.model_dump(mode="json", by_alias=True)
        assert json_data["_id"] == "507f191e810c19729de860ea"
        assert json_data["id_sql"] == "pintura"
        assert "plantilla" in json_data

    def test_response_from_dict(self):
        doc = {
            "_id": "507f191e810c19729de860ea",
            "id_sql": "escultura",
            "nombre": "Escultura",
            "descripcion": None,
            "plantilla": [
                {"name": "material", "field_type": "string", "required": True},
            ],
            "created_at": datetime.now(timezone.utc),
            "updated_at": None,
        }
        resp = CategoryResponse.model_validate(doc)
        assert resp.id_sql == "escultura"


class TestCategoryFilter:

    def test_empty_filter(self):
        f = CategoryFilter()
        assert f.id_sql is None
        assert f.nombre is None

    def test_filter_with_values(self):
        f = CategoryFilter(id_sql="pintura", nombre="Pint")
        assert f.id_sql == "pintura"
        assert f.nombre == "Pint"

    def test_filter_model_dump(self):
        f = CategoryFilter(id_sql="test")
        data = f.model_dump()
        assert data["id_sql"] == "test"
        assert data["nombre"] is None


# ===================================================================
# TESTS DE ENDPOINTS (mockeando el controller directamente)
# ===================================================================

SAMPLE_DOC = {
    "_id": "507f191e810c19729de860ea",
    "id_sql": "pintura",
    "nombre": "Pintura",
    "descripcion": "Obras pictoricas",
    "plantilla": [
        {"name": "tecnica", "field_type": "string", "required": True},
        {"name": "alto_cm", "field_type": "number", "required": True, "min_value": 0},
    ],
    "created_at": datetime.now(timezone.utc),
    "updated_at": None,
}

SAMPLE_DOC_2 = {
    "_id": "507f191e810c19729de860eb",
    "id_sql": "escultura",
    "nombre": "Escultura",
    "descripcion": None,
    "plantilla": [
        {"name": "material", "field_type": "string", "required": True},
    ],
    "created_at": datetime.now(timezone.utc),
    "updated_at": None,
}


class TestCreateCategoryEndpoint:

    @patch("app.routes.categories.category_controller")
    def test_create_category_success(self, mock_ctrl, client):
        mock_ctrl.get_category_by_sql_id_db = AsyncMock(return_value=None)
        mock_ctrl.create_category_db = AsyncMock(return_value=SAMPLE_DOC)

        payload = {
            "id_sql": "pintura",
            "nombre": "Pintura",
            "descripcion": "Obras pictoricas",
            "plantilla": [
                {"name": "tecnica", "field_type": "string", "required": True},
                {"name": "alto_cm", "field_type": "number", "required": True, "min_value": 0},
            ],
        }

        response = client.post("/categories/", json=payload)

        assert response.status_code == 201
        data = response.json()
        assert data["_id"] == "507f191e810c19729de860ea"
        assert data["id_sql"] == "pintura"
        assert len(data["plantilla"]) == 2

    @patch("app.routes.categories.category_controller")
    def test_create_category_duplicate_id_sql(self, mock_ctrl, client):
        mock_ctrl.get_category_by_sql_id_db = AsyncMock(return_value=SAMPLE_DOC)

        payload = {
            "id_sql": "pintura",
            "nombre": "Pintura",
            "plantilla": [{"name": "x", "field_type": "string", "required": True}],
        }

        response = client.post("/categories/", json=payload)

        assert response.status_code == 409
        assert "id_sql" in response.json()["detail"]

    @patch("app.routes.categories.category_controller")
    def test_create_category_invalid_schema(self, mock_ctrl, client):
        payload = {
            "id_sql": "Pintura Invalida",
            "nombre": "Pintura",
            "plantilla": [{"name": "x", "field_type": "string"}],
        }

        response = client.post("/categories/", json=payload)

        assert response.status_code == 422

    @patch("app.routes.categories.category_controller")
    def test_create_category_missing_required_fields(self, mock_ctrl, client):
        payload = {"nombre": "Pintura"}

        response = client.post("/categories/", json=payload)

        assert response.status_code == 422


class TestListCategoriesEndpoint:

    @patch("app.routes.categories.category_controller")
    def test_list_all_categories(self, mock_ctrl, client):
        mock_ctrl.get_all_categories_db = AsyncMock(return_value=[SAMPLE_DOC, SAMPLE_DOC_2])

        response = client.get("/categories/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 2
        assert data[0]["id_sql"] == "pintura"
        assert data[1]["id_sql"] == "escultura"

    @patch("app.routes.categories.category_controller")
    def test_list_categories_empty(self, mock_ctrl, client):
        mock_ctrl.get_all_categories_db = AsyncMock(return_value=[])

        response = client.get("/categories/")

        assert response.status_code == 200
        assert response.json() == []

    @patch("app.routes.categories.category_controller")
    def test_filter_by_nombre(self, mock_ctrl, client):
        mock_ctrl.search_categories_db = AsyncMock(return_value=[SAMPLE_DOC])

        response = client.get("/categories/?nombre=Pint")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["nombre"] == "Pintura"
        mock_ctrl.search_categories_db.assert_called_once_with("Pint")

    @patch("app.routes.categories.category_controller")
    def test_filter_by_id_sql(self, mock_ctrl, client):
        mock_ctrl.get_category_by_sql_id_db = AsyncMock(return_value=SAMPLE_DOC)

        response = client.get("/categories/?id_sql=pintura")

        assert response.status_code == 200
        data = response.json()
        assert len(data) == 1
        assert data[0]["id_sql"] == "pintura"
        mock_ctrl.get_category_by_sql_id_db.assert_called_once_with("pintura")

    @patch("app.routes.categories.category_controller")
    def test_filter_by_id_sql_not_found(self, mock_ctrl, client):
        mock_ctrl.get_category_by_sql_id_db = AsyncMock(return_value=None)

        response = client.get("/categories/?id_sql=inexistente")

        assert response.status_code == 200
        assert response.json() == []


class TestGetCategoryByIdEndpoint:

    @patch("app.routes.categories.category_controller")
    def test_get_category_by_id_success(self, mock_ctrl, client):
        mock_ctrl.get_category_by_id_db = AsyncMock(return_value=SAMPLE_DOC)

        response = client.get("/categories/507f191e810c19729de860ea")

        assert response.status_code == 200
        data = response.json()
        assert data["_id"] == "507f191e810c19729de860ea"
        assert data["id_sql"] == "pintura"

    @patch("app.routes.categories.category_controller")
    def test_get_category_by_id_not_found(self, mock_ctrl, client):
        mock_ctrl.get_category_by_id_db = AsyncMock(return_value=None)

        response = client.get("/categories/507f191e810c19729de860ea")

        assert response.status_code == 404

    @patch("app.routes.categories.category_controller")
    def test_get_category_invalid_object_id(self, mock_ctrl, client):
        mock_ctrl.get_category_by_id_db = AsyncMock(return_value=None)

        response = client.get("/categories/no-es-valido")

        assert response.status_code == 404
