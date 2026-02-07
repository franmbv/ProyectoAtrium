const express = require('express');
const router = express.Router();

const PagoController = require('../controllers/PagoController');
const AuthController = require('../controllers/AuthController');

// Rutas
// GET: Ver pantalla 
router.get('/confirmar-reserva', AuthController.verificarSesion, PagoController.mostrarConfirmacion);

// POST: Enviar formulario 
router.post('/confirmar-reserva', AuthController.verificarSesion, PagoController.procesarReserva);


module.exports = router;