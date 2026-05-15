const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// ==========================================
// RUTAS DE REGISTRO
// ==========================================
// 1. Obtener catálogo de preguntas de seguridad (para llenar el select en el Frontend)
router.get('/registro/preguntas', AuthController.obtenerPreguntasRegistro);

// 2. Procesar los datos de registro (El frontend envía los datos del nuevo usuario)
router.post('/registro', AuthController.registrar);


// ==========================================
// RUTAS DE LOGIN Y SESIÓN
// ==========================================
// 3. Validar credenciales e iniciar sesión 
router.post('/login', AuthController.login);

// 4. Verificar sesión activa (Para que el frontend sepa si el usuario está logueado al recargar la página)
router.get('/check-session', AuthController.checkSession);

// 5. Cerrar sesión y destruir la cookie
router.post('/logout', AuthController.logout);


// ==========================================
// RECUPERACIÓN DE CONTRASEÑA
// ==========================================
// 6. Validar el usuario y devolver sus preguntas de seguridad configuradas
router.post('/olvido-password/verificar-usuario', AuthController.verificarUsuarioRecuperacion);

// 7. Validar las respuestas secretas y cambiar la contraseña
router.post('/olvido-password/cambiar', AuthController.cambiarPasswordPorRecuperacion);

module.exports = router;