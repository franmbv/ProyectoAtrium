const express = require('express');
const router = express.Router();

const PagoController = require('../controllers/PagoController');
const AuthController = require('../controllers/AuthController');

// Middlewares Globales
router.use(AuthController.verificarSesion);
router.use(AuthController.verificarComprador);

// ==========================================
// RESERVAS
// ==========================================
// Verificar estado antes de mostrar confirmación (intentos fallidos, nombre válido)
router.get('/reservas/estado', PagoController.verificarEstadoReserva); 

// Procesar la Reserva 
router.post('/reservas', PagoController.crearReserva); 


// ==========================================
// CÓDIGO DE SEGURIDAD / MEMBRESÍA
// ==========================================
// Verificar el status del código de un usuario
router.post('/codigo-seguridad/verificar', PagoController.verificarEstadoCodigo); 

// Obtener las preguntas de seguridad del usuario logueado para recuperar su código
router.get('/codigo-seguridad/preguntas', PagoController.obtenerPreguntasRecuperacion); 

// Procesar las respuestas y enviar el nuevo código por correo
router.post('/codigo-seguridad/recuperar', PagoController.recuperarCodigo); 

module.exports = router;