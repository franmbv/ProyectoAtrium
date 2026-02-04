const bcrypt = require('bcryptjs'); // Para encriptar contraseñas
const UsuarioModel = require('../models/UsuarioModel');

const AuthController = {

    // --- 1. MOSTRAR FORMULARIOS (GET) ---
    
    mostrarRegistro: (req, res) => {
        // Renderiza la vista src/views/auth/registro.ejs
        res.render('auth/registro', { error: null });
    },

    mostrarLogin: (req, res) => {
        // Renderiza la vista src/views/auth/login.ejs
        res.render('auth/login', { error: null });
    },

    // --- 2. PROCESAR REGISTRO (POST) ---
    registrar: async (req, res) => {
        try {
            // A. Capturar datos del formulario (req.body)
            const { nombre, apellido, cedula, gmail, login, password } = req.body;

            // B. Validar que el usuario no exista (Regla de Negocio)
            const existeUsuario = await UsuarioModel.buscarPorLogin(login);
            if (existeUsuario) {
                return res.render('auth/registro', { error: 'El Login ya está en uso' });
            }

            // C. Encriptar la contraseña (HASHING)
            // '10' es el número de rondas de encriptación (salt)
            const passwordEncriptado = await bcrypt.hash(password, 10);

            // D. Generar Código de Seguridad Aleatorio (Requisito del PDF)
            // Generamos un string simple tipo "MUSEO-8A3F"
            const codigoSeguridad = 'MUSEO-' + Math.random().toString(36).substr(2, 6).toUpperCase();

            // E. Preparar objeto para el Modelo
            const nuevoUsuario = {
                nombre, 
                apellido, 
                cedula, 
                gmail, 
                login, 
                password: passwordEncriptado // ¡Guardamos la encriptada!
            };

            // F. Guardar en Base de Datos
            const idUsuario = await UsuarioModel.crear(nuevoUsuario);

            // G. SIMULACIÓN DE ENVÍO DE CORREO (Requisito PDF)
            console.log("---------------------------------------------------");
            console.log(`📧 SIMULANDO ENVÍO DE CORREO A: ${gmail}`);
            console.log(`🔐 SU CÓDIGO DE SEGURIDAD ES: ${codigoSeguridad}`);
            console.log("---------------------------------------------------");

            // H. Redirigir al Login
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

            // A. Buscar usuario en BD
            const usuario = await UsuarioModel.buscarPorLogin(login);

            // B. Si el usuario no existe...
            if (!usuario) {
                return res.render('auth/login', { error: 'Credenciales inválidas (Usuario no existe)' });
            }

            // C. Comparar contraseña (La que escribió vs La encriptada en BD)
            const passwordCorrecto = await bcrypt.compare(password, usuario.password);

            if (!passwordCorrecto) {
                return res.render('auth/login', { error: 'Credenciales inválidas (Contraseña incorrecta)' });
            }

            // D. CREAR SESIÓN (Aquí "nace" la sesión del usuario)
            // Guardamos datos clave en la memoria del servidor
            req.session.usuario = {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol_id, // 1=Comprador, 2=Admin
                login: usuario.login
            };

            // E. Redireccionar según su Rol
            if (usuario.rol_id === 2) {
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
    }
};

module.exports = AuthController;