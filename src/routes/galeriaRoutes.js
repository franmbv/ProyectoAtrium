const express = require('express');
const router = express.Router();
const GaleriaController = require('../controllers/GaleriaController');
const AuthController = require('../controllers/AuthController');

// Ruta principal: Listado de obras con filtros
router.get('/', GaleriaController.mostrarGaleria);

// Ruta detalle: Ver una obra específica por su ID
router.get('/detalle/:id', GaleriaController.verFichaTecnica);

// Ruta Perfil del Artista (Biografía Pública)
router.get('/artista/:id', GaleriaController.verPerfilArtista);

// Ruta API: Verificar disponibilidad
router.get('/api/verificar/:id', GaleriaController.verificarDisponibilidadAPI);

// Historial de compras y reservas del usuario (requiere sesión)
router.get('/historial', AuthController.verificarSesion, GaleriaController.historial);
// Ruta para que el usuario vea su factura
router.get('/factura/:id', AuthController.verificarSesion, GaleriaController.facturaUsuario);

module.exports = router;