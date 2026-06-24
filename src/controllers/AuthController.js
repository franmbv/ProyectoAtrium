const bcrypt = require('bcryptjs'); // Para encriptar contraseñas
const UsuarioModel = require('../models/UsuarioModel');
const InfoCompradorModel = require('../models/InfoCompradorModel'); 
const { sendSecurityCode } = require('../config/mailer'); // <--- AGREGADO
const { enviarAuditoria } = require('../config/auditoria');

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
        const success = req.query.success ? String(req.query.success) : null;
        res.render('auth/login', { error: null, success });
    },

    mostrarOlvidoPassword: (req, res) => {
        if (req.session) {
            delete req.session.passwordResetUserId;
        }

        res.render('auth/olvido-password', {
            error: null,
            preguntas: [],
            login: '',
            mostrarCambio: false
        });
    },

    // --- 2. PROCESAR REGISTRO (POST) ---
    registrar: async (req, res) => {
        let idUsuarioCreado = null;
        try {
            const { nombre, apellido, cedula, gmail, login, password, preguntasIds, respuestas, nroTarjeta, cvv, pais, estado_residencia, ciudad, municipio, calle} = req.body;

            const preguntas = await UsuarioModel.obtenerCatalogoPreguntas();

            const existeUsuario = await UsuarioModel.buscarPorLogin(login);
            if (existeUsuario) {
                return res.render('auth/registro', { error: 'El Usuario ya está en uso', preguntas });
            }

            const existeEmail = await UsuarioModel.buscarPorEmail(gmail);
            if (existeEmail) {
                return res.render('auth/registro', { error: 'El Correo ya está registrado', preguntas });
            }

            const tarjetaLimpia = nroTarjeta ? nroTarjeta.replace(/\s+/g, '') : '';
            const cvvLimpio = cvv ? cvv.trim() : '';
            const regexTarjeta = /^\d{15,19}$/;
            const regexCVV = /^\d{3,4}$/;

            if (!regexTarjeta.test(tarjetaLimpia) || !regexCVV.test(cvvLimpio)) {
                return res.render('auth/registro', { error: 'Datos de tarjeta inválidos. Verifica que los números sean correctos.', preguntas });
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
            const tarjetaSegura = tarjetaLimpia.slice(-4);

            const nuevoUsuario = {
                nombre, 
                apellido, 
                cedula, 
                gmail, 
                login, 
                password: passwordEncriptado 
            };

            const direccionFisica = { pais, estado_residencia, ciudad, municipio, calle };

            const idUsuario = await UsuarioModel.crear(nuevoUsuario, 2);
            await InfoCompradorModel.crear(idUsuario, codigoSeguridad, tarjetaSegura, direccionFisica);
            await UsuarioModel.guardarRespuestas(idUsuario, preguntasIds, respuestasHasheadas);
            
            // --- SYNC NEO4J COMPRADOR ---
            const Neo4jSyncService = require('../services/Neo4jSyncService');
            await Neo4jSyncService.syncComprador({ id: idUsuario, ...nuevoUsuario });

            // --- AUDITORÍA DE MEMBRESÍA EN CASSANDRA ---
            const ahora = new Date();
            await enviarAuditoria('/reportes/membresias', {
                anio: ahora.getFullYear(),
                mes: ahora.getMonth() + 1,
                id_membresia: idUsuario,
                fecha_registro: ahora.toISOString(),
                id_comprador: idUsuario,
                codigo_membresia: codigoSeguridad,
                monto_cobrado: "10.00",
                estado: "ACTIVA"
            });

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
                await enviarAuditoria('/seguridad/logs', {
                    usuario_id: 0,
                    ip_origen: req.ip || '127.0.0.1',
                    login_usuario: login,
                    evento_tipo: 'LOGIN_FALLIDO',
                    detalles: 'Usuario no existe'
                });
                return res.render('auth/login', { error: 'Credenciales inválidas (Usuario no existe)' });
            }

            const passwordCorrecto = await bcrypt.compare(password, usuario.password);

            if (!passwordCorrecto) {
                await enviarAuditoria('/seguridad/logs', {
                    usuario_id: usuario.id,
                    ip_origen: req.ip || '127.0.0.1',
                    login_usuario: login,
                    evento_tipo: 'LOGIN_FALLIDO',
                    detalles: 'Contraseña incorrecta'
                });
                return res.render('auth/login', { error: 'Credenciales inválidas (Contraseña incorrecta)' });
            }

            await enviarAuditoria('/seguridad/logs', {
                usuario_id: usuario.id,
                ip_origen: req.ip || '127.0.0.1',
                login_usuario: login,
                evento_tipo: 'LOGIN_EXITOSO',
                detalles: 'Inicio de sesión exitoso'
            });

            // En AuthController.js, dentro de login (Éxito):
                req.session.flash = { 
                    type: 'success', 
                    message: `👋 ¡Bienvenido, ${usuario.nombre}!` 
                    };


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

    verificarUsuarioRecuperacion: async (req, res) => {
        try {
            const loginInput = req.body.login ? String(req.body.login).trim() : '';

            if (!loginInput) {
                return res.render('auth/olvido-password', {
                    error: 'Debe indicar su usuario para continuar.',
                    preguntas: [],
                    login: '',
                    mostrarCambio: false
                });
            }

            const usuario = await UsuarioModel.buscarPorLogin(loginInput);

            if (!usuario) {
                return res.render('auth/olvido-password', {
                    error: 'No existe una cuenta con ese usuario.',
                    preguntas: [],
                    login: loginInput,
                    mostrarCambio: false
                });
            }

            const preguntas = await UsuarioModel.obtenerPreguntasSeguridad(usuario.id);

            if (!preguntas || preguntas.length === 0) {
                return res.render('auth/olvido-password', {
                    error: 'Esta cuenta no tiene preguntas de seguridad configuradas.',
                    preguntas: [],
                    login: loginInput,
                    mostrarCambio: false
                });
            }

            req.session.passwordResetUserId = usuario.id;

            return res.render('auth/olvido-password', {
                error: null,
                preguntas,
                login: loginInput,
                mostrarCambio: true
            });
        } catch (error) {
            console.error('Error en verificación de usuario para recuperación:', error);
            return res.render('auth/olvido-password', {
                error: 'No se pudo iniciar la recuperación en este momento.',
                preguntas: [],
                login: '',
                mostrarCambio: false
            });
        }
    },

    cambiarPasswordPorRecuperacion: async (req, res) => {
        try {
            const usuarioId = req.session.passwordResetUserId;
            const loginInput = req.body.login ? String(req.body.login).trim() : '';
            const respuestasUsuario = Array.isArray(req.body.respuestas)
                ? req.body.respuestas
                : [req.body.respuestas];
            const nuevaPassword = req.body.nuevaPassword ? String(req.body.nuevaPassword) : '';
            const confirmarPassword = req.body.confirmarPassword ? String(req.body.confirmarPassword) : '';

            if (!usuarioId) {
                return res.redirect('/auth/olvido-password');
            }

            const preguntas = await UsuarioModel.obtenerPreguntasSeguridad(usuarioId);

            if (!preguntas || preguntas.length === 0) {
                return res.redirect('/auth/olvido-password');
            }

            if (!nuevaPassword || nuevaPassword.length < 6) {
                return res.render('auth/olvido-password', {
                    error: 'La nueva contraseña debe tener al menos 6 caracteres.',
                    preguntas,
                    login: loginInput,
                    mostrarCambio: true
                });
            }

            if (nuevaPassword !== confirmarPassword) {
                return res.render('auth/olvido-password', {
                    error: 'La confirmación no coincide con la nueva contraseña.',
                    preguntas,
                    login: loginInput,
                    mostrarCambio: true
                });
            }

            let respuestasCorrectas = true;

            for (let i = 0; i < preguntas.length; i++) {
                const hashGuardado = preguntas[i].respuesta;
                const respuestaInput = respuestasUsuario[i] ? String(respuestasUsuario[i]).trim().toLowerCase() : '';
                const coincide = await bcrypt.compare(respuestaInput, hashGuardado);

                if (!coincide) {
                    respuestasCorrectas = false;
                    break;
                }
            }

            if (!respuestasCorrectas) {
                return res.render('auth/olvido-password', {
                    error: 'Una o más respuestas de seguridad son incorrectas.',
                    preguntas,
                    login: loginInput,
                    mostrarCambio: true
                });
            }

            const hashNuevaPassword = await bcrypt.hash(nuevaPassword, 10);
            await UsuarioModel.actualizarPassword(usuarioId, hashNuevaPassword);

            delete req.session.passwordResetUserId;

            return res.redirect('/auth/login?success=Contrase%C3%B1a%20actualizada.%20Ahora%20puede%20iniciar%20sesi%C3%B3n.');
        } catch (error) {
            console.error('Error al cambiar contraseña por recuperación:', error);

            const usuarioId = req.session.passwordResetUserId;
            const preguntas = usuarioId ? await UsuarioModel.obtenerPreguntasSeguridad(usuarioId) : [];

            return res.render('auth/olvido-password', {
                error: 'No se pudo actualizar la contraseña. Intente nuevamente.',
                preguntas,
                login: req.body.login || '',
                mostrarCambio: true
            });
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