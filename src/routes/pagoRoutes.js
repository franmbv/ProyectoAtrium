const express = require('express');
const router = express.Router();

const PagoController = require('../controllers/PagoController');
const AuthController = require('../controllers/AuthController');


router.use(AuthController.verificarSesion);
router.use(AuthController.verificarComprador);

// Rutas
// Rutas para Confirmar Reserva 
router.get('/confirmar-reserva', PagoController.mostrarConfirmacion);
router.post('/confirmar-reserva', PagoController.procesarReserva);

// Rutas para Recuperar Código de Seguridad
router.get('/recuperar', PagoController.formRecuperarCodigo);
router.post('/recuperar', PagoController.procesarRecuperacion);

module.exports = router;