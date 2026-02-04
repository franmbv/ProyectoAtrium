const bcrypt = require('bcryptjs'); // Para encriptar contraseñas
const UsuarioModel = require('../models/UsuarioModel');

const AuthController = {

    // --- 1. MOSTRAR FORMULARIOS (GET) ---
    
    mostrarRegistro: (req, res) => {
        res.render('auth/registro', { error: null });
    },

    mostrarLogin: (req, res) => {
        res.render('auth/login', { error: null });
    },

    // --- 2. PROCESAR REGISTRO (POST) ---
    registrar: async (req, res) => {
        try {
            const { nombre, apellido, cedula, gmail, login, password } = req.body;

            const existeUsuario = await UsuarioModel.buscarPorLogin(login);
            if (existeUsuario) {
                return res.render('auth/registro', { error: 'El Login ya está en uso' });
            }

            const passwordEncriptado = await bcrypt.hash(password, 10);
            const numeroAleatorio = Math.floor(Math.random() * 1000); 
            const codigoSeguridad = numeroAleatorio.toString().padStart(3, '0');

            const nuevoUsuario = {
                nombre, 
                apellido, 
                cedula, 
                gmail, 
                login, 
                password: passwordEncriptado 
            };

            const idUsuario = await UsuarioModel.crear(nuevoUsuario);

            console.log("---------------------------------------------------");
            console.log(`📧 SIMULANDO ENVÍO DE CORREO A: ${gmail}`);
            console.log(`🔐 SU CÓDIGO DE SEGURIDAD ES: ${codigoSeguridad}`);
            console.log("---------------------------------------------------");

            res.redirect('/auth/login');

        } catch (error) {
            console.error(error);
            res.render('auth/registro', { error: 'Error interno al registrar usuario.' });
        }
    },

    // --- 3. PROCESAR LOGIN (POST) ---
    login: async (req, res) => {
        try {
            const { login, password } = req.body;

            const usuario = await UsuarioModel.buscarPorLogin(login);

            if (!usuario) {
                return res.render('auth/login', { error: 'Credenciales inválidas (Usuario no existe)' });
            }

            const passwordCorrecto = await bcrypt.compare(password, usuario.password);

            if (!passwordCorrecto) {
                return res.render('auth/login', { error: 'Credenciales inválidas (Contraseña incorrecta)' });
            }

            req.session.usuario = {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol_id, 
                login: usuario.login
            };

            if (usuario.rol_id === 1) {
                res.redirect('/admin/dashboard');
            } else {
                res.redirect('/galeria');
            }

        } catch (error) {
            console.error(error);
            res.render('auth/login', { error: 'Error al iniciar sesión' });
        }
    },

    // --- 4. CERRAR SESIÓN ---
    logout: (req, res) => {
        req.session.destroy(() => {
            res.redirect('/auth/login');
        });
    },

    // --- 5. MIDDLEWARE DE VERIFICACIÓN DE SESIÓN ---
    verificarSesion: (req, res, next) => {
        if (req.session && req.session.usuario) {
            return next();
        } else {
            return res.redirect('/auth/login?error=Acceso denegado: Debes iniciar sesión');
        }
    }
};

module.exports = AuthController;