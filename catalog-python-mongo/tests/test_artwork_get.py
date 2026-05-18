from unittest.mock import AsyncMock, patch
from datetime import datetime, timezone
from bson import ObjectId

import pytest
from fastapi.testclient import TestClient
from main import app

@pytest.fixture
def client():
    return TestClient(app)

SAMPLE_ARTWORK = {
    "_id": ObjectId("507f191e810c19729de860ea"),
    "nombre": "La persistencia de la memoria",
    "artista_id": "artist_123",
    "precio_venta": 5000000.0,
    "fecha_creacion": datetime(1931, 1, 1),
    "foto": "https://example.com/dali.jpg",
    "genero": "pintura",
    "tecnica": "oleo",
    "soporte": "lienzo",
    "alto_cm": 24.0,
    "ancho_cm": 33.0,
    "status": "disponible",
    "created_at": datetime.now(timezone.utc),
    "updated_at": None
}

class TestGetArtworkById:

    @patch("app.routes.artworks.get_artwork_by_id_db")
    def test_get_artwork_success(self, mock_get, client):
        # El controlador devuelve el doc con ObjectId, la ruta lo convierte a str
        mock_get.return_value = SAMPLE_ARTWORK
        
        artwork_id = str(SAMPLE_ARTWORK["_id"])
        response = client.get(f"/artworks/{artwork_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["_id"] == artwork_id
        assert data["nombre"] == "La persistencia de la memoria"
        assert data["genero"] == "pintura"

    @patch("app.routes.artworks.get_artwork_by_id_db")
    def test_get_artwork_not_found(self, mock_get, client):
        mock_get.return_value = None
        
        response = client.get("/artworks/507f191e810c19729de860eb")
        
        assert response.status_code == 404
        assert response.json()["detail"] == "Obra no encontrada"

    def test_get_artwork_invalid_id(self, client):
        # No es necesario mockear si el controlador maneja IDs inválidos
        response = client.get("/artworks/invalid-id")
        assert response.status_code == 404
