const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');

// --- RUTAS DE REGISTRO (Visitante -> Comprador) ---

// 1. Mostrar el formulario HTML (GET)
router.get('/registro', AuthController.mostrarRegistro);

// 2. Procesar los datos del formulario (POST)
router.post('/registro', AuthController.registrar);


// --- RUTAS DE LOGIN (Autenticación) ---

// 3. Mostrar el formulario de Login (GET)
router.get('/login', AuthController.mostrarLogin);

// 4. Validar credenciales e iniciar sesión (POST)
router.post('/login', AuthController.login);


// --- RUTA DE SALIDA ---

// 5. Cerrar sesión y destruir la cookie (GET)
router.get('/logout', AuthController.logout);

module.exports = router;