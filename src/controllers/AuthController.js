const bcrypt = require('bcryptjs'); // Para encriptar contraseñas
const UsuarioModel = require('../models/UsuarioModel');
const InfoCompradorModel = require('../models/InfoCompradorModel'); 
const { sendSecurityCode } = require('../config/mailer'); // <--- AGREGADO

const AuthController = {

    // --- 1. MOSTRAR FORMULARIOS (GET) ---
    
    mostrarRegistro: async(req, res) => {
        try {
            const preguntas = await UsuarioModel.obtenerCatalogoPreguntas();
            res.render('auth/registro', { error: null, preguntas });
        } catch (error) {
            console.error('Error al cargar la vista de registro:', error);
            res.redirect('/auth/login');
        }
    },

    mostrarLogin: (req, res) => {
        res.render('auth/login', { error: null });
    },

    // --- 2. PROCESAR REGISTRO (POST) ---
    registrar: async (req, res) => {
        try {
            const { nombre, apellido, cedula, gmail, login, password, preguntasIds, respuestas, nroTarjeta, cvv} = req.body;

            const preguntas = await UsuarioModel.obtenerCatalogoPreguntas();

            const existeUsuario = await UsuarioModel.buscarPorLogin(login);
            if (existeUsuario) {
                return res.render('auth/registro', { error: 'El Usuario ya está en uso', preguntas });
            }

            const existeEmail = await UsuarioModel.buscarPorEmail(gmail);
            if (existeEmail) {
                return res.render('auth/registro', { error: 'El Correo ya está registrado', preguntas });
            }

            if (nroTarjeta.length < 15 || cvv.length < 3) {
                return res.render('auth/registro', { error: 'Datos de tarjeta inválidos', preguntas });
            }

            const passwordEncriptado = await bcrypt.hash(password, 10);

            const respuestasHasheadas = [];
            for (let i = 0; i < respuestas.length; i++) {
                const respuestaLimpia = respuestas[i].trim().toLowerCase();
                const hashRespuesta = await bcrypt.hash(respuestaLimpia, 10);
                respuestasHasheadas.push(hashRespuesta);
            }

            const numeroAleatorio = Math.floor(Math.random() * 1000); 
            const codigoSeguridad = numeroAleatorio.toString().padStart(3, '0');
            const tarjetaSegura = nroTarjeta.slice(-4);

            const nuevoUsuario = {
                nombre, 
                apellido, 
                cedula, 
                gmail, 
                login, 
                password: passwordEncriptado 
            };

            const idUsuario = await UsuarioModel.crear(nuevoUsuario, 2);
            await InfoCompradorModel.crear(idUsuario, codigoSeguridad, tarjetaSegura);
            await UsuarioModel.guardarRespuestas(idUsuario, preguntasIds, respuestasHasheadas);
            
            // --- ENVÍO DE CORREO REAL ---
            try {
                await sendSecurityCode(gmail, codigoSeguridad);
            } catch (mailError) {
                console.error("Error al enviar correo real:", mailError.message);
            }

            console.log("---------------------------------------------------");
            console.log(`📧 SIMULANDO ENVÍO DE CORREO A: ${gmail}`);
            console.log(`🔐 SU CÓDIGO DE SEGURIDAD ES: ${codigoSeguridad}`);
            console.log("---------------------------------------------------");

            res.redirect('/auth/login?success=Registro exitoso.');

        } catch (error) {
            console.error(error);
            const preguntas = await UsuarioModel.obtenerCatalogoPreguntas();
            res.render('auth/registro', { error: 'Error interno al procesar el registro. Intenta más tarde.', preguntas });
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

            if (usuario.rol_id === 1 || usuario.rol_id === 3) {
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
    },

    // --- 6. VERIFICAR SESIÓN PARA FRONTEND ---
    checkSession: (req, res) => {
        if (req.session && req.session.usuario) {
            res.json({ loggedIn: true });
        } else {
            res.json({ loggedIn: false });
        }
    },

    // --- 7. MIDDLEWARE PARA RESTRINGIR ACCESO A COMPRADORES ---
    verificarComprador: (req, res, next) => {
        const rol = req.session.usuario?.rol;
        
        if (rol === 1 || rol === 3) {
            return res.redirect('/galeria?error=Acceso denegado: Las cuentas administrativas no pueden realizar reservas ni compras.');
        }
                return next();
    }
};

module.exports = AuthController;