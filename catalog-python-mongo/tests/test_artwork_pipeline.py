from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.controllers.artwork_controller import (
    _build_match_stage,
    list_artworks_db,
)


class TestBuildMatchStage:

    def test_no_filters_returns_empty_match(self):
        match = _build_match_stage()
        assert match == {}

    def test_precio_min_only(self):
        match = _build_match_stage(precio_min=1000)
        assert match == {"precio_venta": {"$gte": 1000}}

    def test_precio_max_only(self):
        match = _build_match_stage(precio_max=50000)
        assert match == {"precio_venta": {"$lte": 50000}}

    def test_precio_range(self):
        match = _build_match_stage(precio_min=1000, precio_max=50000)
        assert match == {"precio_venta": {"$gte": 1000, "$lte": 50000}}

    def test_status_filter(self):
        match = _build_match_stage(status="disponible")
        assert match == {"status": "disponible"}

    def test_genero_filter(self):
        match = _build_match_stage(genero="pintura")
        assert match == {"genero": "pintura"}

    def test_artista_id_filter(self):
        match = _build_match_stage(artista_id="abc123")
        assert match == {"artista_id": "abc123"}

    def test_all_filters_combined(self):
        match = _build_match_stage(
            precio_min=1000,
            precio_max=50000,
            status="disponible",
            genero="escultura",
            artista_id="abc123",
        )
        assert match == {
            "genero": "escultura",
            "artista_id": "abc123",
            "status": "disponible",
            "precio_venta": {"$gte": 1000, "$lte": 50000},
        }

    def test_precio_zero_is_included(self):
        match = _build_match_stage(precio_min=0)
        assert match == {"precio_venta": {"$gte": 0}}


class TestListArtworksDb:

    @pytest.mark.asyncio
    async def test_pipeline_called_with_correct_stages(self):
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=[])

        with patch("app.controllers.artwork_controller.db") as mock_db:
            mock_collection = MagicMock()
            mock_collection.aggregate = MagicMock(return_value=mock_cursor)
            mock_db.__getitem__ = MagicMock(return_value=mock_collection)

            await list_artworks_db(precio_min=500, precio_max=10000, status="disponible")

            mock_collection.aggregate.assert_called_once()
            pipeline = mock_collection.aggregate.call_args[0][0]

            assert len(pipeline) == 2
            assert "$match" in pipeline[0]
            assert "$sort" in pipeline[1]

            match = pipeline[0]["$match"]
            assert match["precio_venta"]["$gte"] == 500
            assert match["precio_venta"]["$lte"] == 10000
            assert match["status"] == "disponible"

    @pytest.mark.asyncio
    async def test_returns_documents_from_cursor(self):
        docs = [
            {"_id": "obj1", "nombre": "Obra A", "precio_venta": 5000},
            {"_id": "obj2", "nombre": "Obra B", "precio_venta": 8000},
        ]
        mock_cursor = MagicMock()
        mock_cursor.to_list = AsyncMock(return_value=docs)

        with patch("app.controllers.artwork_controller.db") as mock_db:
            mock_collection = MagicMock()
            mock_collection.aggregate = MagicMock(return_value=mock_cursor)
            mock_db.__getitem__ = MagicMock(return_value=mock_collection)

            result = await list_artworks_db()

            assert result == docs
            assert len(result) == 2
