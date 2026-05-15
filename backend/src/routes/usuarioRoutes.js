const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController');
const AuthController = require('../controllers/AuthController'); 

// Todas las rutas de usuario requieren estar autenticado
router.use(AuthController.verificarSesion);

// ==========================================
// PERFIL DE USUARIO
// ==========================================
// Ver el perfil del usuario logueado
router.get('/perfil', UsuarioController.obtenerPerfil); 

// Actualizar el perfil del usuario logueado (Se usa PUT en REST para actualizaciones)
router.put('/perfil', UsuarioController.actualizarPerfil); 

module.exports = router;