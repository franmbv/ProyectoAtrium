const express = require('express');
const router = express.Router();
const GaleriaController = require('../controllers/GaleriaController');
const AuthController = require('../controllers/AuthController');

// ==========================================
// GALERÍA PÚBLICA
// ==========================================
// Listado de obras con filtros y catálogos
router.get('/obras', GaleriaController.obtenerGaleria);

// Ver el detalle (ficha técnica) de una obra específica
router.get('/obras/:id', GaleriaController.obtenerObra);

// Verificar disponibilidad de una obra (Para validaciones rápidas del frontend)
router.get('/obras/:id/disponibilidad', GaleriaController.verificarDisponibilidad);

// Perfil del Artista (Biografía Pública y sus obras)
router.get('/artistas/:id', GaleriaController.obtenerPerfilArtista);

// ==========================================
// ÁREA PRIVADA DEL COMPRADOR
// ==========================================
// Historial de compras y reservas del usuario logueado
router.get('/historial', AuthController.verificarSesion, GaleriaController.obtenerHistorial);

// Ver detalle de una factura propia
router.get('/facturas/:id', AuthController.verificarSesion, GaleriaController.obtenerFactura);

module.exports = router;