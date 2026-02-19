const express = require('express');
const router = express.Router();
const UsuarioController = require('../controllers/UsuarioController');
const AuthController = require('../controllers/AuthController'); 

router.get('/perfil', AuthController.verificarSesion, UsuarioController.verPerfil);
router.post('/perfil', AuthController.verificarSesion, UsuarioController.actualizar);

module.exports = router;