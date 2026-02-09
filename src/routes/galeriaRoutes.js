const express = require('express');
const router = express.Router();
const GaleriaController = require('../controllers/GaleriaController');

// Ruta principal: Listado de obras con filtros
router.get('/', GaleriaController.mostrarGaleria);

// Ruta detalle: Ver una obra específica por su ID
router.get('/detalle/:id', GaleriaController.verFichaTecnica);

// Ruta Perfil del Artista (Biografía Pública)
router.get('/artista/:id', GaleriaController.verPerfilArtista);

// Ruta API: Verificar disponibilidad
router.get('/api/verificar/:id', GaleriaController.verificarDisponibilidadAPI);

module.exports = router;