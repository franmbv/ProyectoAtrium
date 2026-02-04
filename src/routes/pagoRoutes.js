const express = require('express');
const router = express.Router();

const PagoController = require('../controllers/PagoController');
const AuthController = require('../controllers/AuthController');

// Rutas
// GET: Ver pantalla (Protegida por tu sesión)
router.get('/confirmar-reserva', AuthController.verificarSesion, PagoController.mostrarConfirmacion);

// POST: Enviar formulario (Protegida por tu sesión)
router.post('/confirmar-reserva', AuthController.verificarSesion, PagoController.validarCodigo);

module.exports = router;