const express = require('express');
const router = express.Router();

const PagoController = require('../controllers/PagoController');
const AuthController = require('../controllers/AuthController');

// Rutas
// Ruta para ver pantalla 
router.get('/confirmar-reserva', AuthController.verificarSesion, PagoController.mostrarConfirmacion);

// Ruta para enviar formulario 
router.post('/confirmar-reserva', AuthController.verificarSesion, PagoController.procesarReserva);

// Ruta para MOSTRAR el formulario 
router.get('/recuperar', AuthController.verificarSesion, PagoController.formRecuperarCodigo);

// Ruta para PROCESAR el formulario 
router.post('/recuperar', AuthController.verificarSesion, PagoController.procesarRecuperacion);


module.exports = router;