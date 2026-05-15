const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/UsuarioModel');
const InfoCompradorModel = require('../models/InfoCompradorModel');
const { sendSecurityCode } = require('../config/mailer');

const AuthController = {

    // --- 1. SOLICITAR DATOS PARA FORMULARIOS (GET) ---
    // (Opcional) Si tu frontend necesita cargar las preguntas dinámicamente antes del registro
    obtenerPreguntasRegistro: async(req, res) => {
        try {
            const preguntas = await UsuarioModel.obtenerCatalogoPreguntas();
            res.status(200).json({ success: true, data: preguntas });
        } catch (error) {
            console.error('Error al cargar la vista de registro:', error);
            res.status(500).json({ success: false, message: 'Error al obtener datos de registro' });
        }
    },

    // --- 2. PROCESAR REGISTRO (POST) ---
    registrar: async (req, res) => {
        try {
            const { nombre, apellido, cedula, gmail, login, password, preguntasIds, respuestas, nroTarjeta, cvv, pais, estado_residencia, ciudad, municipio, calle} = req.body;

            const existeUsuario = await UsuarioModel.buscarPorLogin(login);
            if (existeUsuario) {
                return res.status(409).json({ success: false, message: 'El Usuario ya está en uso' });
            }

            const existeEmail = await UsuarioModel.buscarPorEmail(gmail);
            if (existeEmail) {
                return res.status(409).json({ success: false, message: 'El Correo ya está registrado' });
            }

            const tarjetaLimpia = nroTarjeta ? nroTarjeta.replace(/\s+/g, '') : '';
            const cvvLimpio = cvv ? cvv.trim() : '';
            const regexTarjeta = /^\d{15,19}$/;
            const regexCVV = /^\d{3,4}$/;

            if (!regexTarjeta.test(tarjetaLimpia) || !regexCVV.test(cvvLimpio)) {
                return res.status(400).json({ success: false, message: 'Datos de tarjeta inválidos. Verifica que los números sean correctos.' });
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

            const nuevoUsuario = { nombre, apellido, cedula, gmail, login, password: passwordEncriptado };
            const direccionFisica = { pais, estado_residencia, ciudad, municipio, calle };

            const idUsuario = await UsuarioModel.crear(nuevoUsuario, 2);
            await InfoCompradorModel.crear(idUsuario, codigoSeguridad, tarjetaSegura, direccionFisica);
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

            res.status(201).json({ success: true, message: 'Registro exitoso. Revisa tu correo para el código de seguridad.' });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error interno al procesar el registro. Intenta más tarde.' });
        }
    },

    // --- 3. PROCESAR LOGIN (POST) ---
    login: async (req, res) => {
        try {
            const { login, password } = req.body;

            const usuario = await UsuarioModel.buscarPorLogin(login);

            if (!usuario) {
                return res.status(401).json({ success: false, message: 'Credenciales inválidas (Usuario no existe)' });
            }

            const passwordCorrecto = await bcrypt.compare(password, usuario.password);

            if (!passwordCorrecto) {
                return res.status(401).json({ success: false, message: 'Credenciales inválidas (Contraseña incorrecta)' });
            }

            // Mantenemos express-session por ahora, aunque en REST se suele usar JWT.
            req.session.usuario = {
                id: usuario.id,
                nombre: usuario.nombre,
                rol: usuario.rol_id, 
                login: usuario.login
            };

            res.status(200).json({
                success: true,
                message: `¡Bienvenido, ${usuario.nombre}!`,
                data: {
                    usuario: {
                        id: usuario.id,
                        nombre: usuario.nombre,
                        rol: usuario.rol_id,
                        login: usuario.login
                    }
                }
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al iniciar sesión' });
        }
    },

    verificarUsuarioRecuperacion: async (req, res) => {
        try {
            const loginInput = req.body.login ? String(req.body.login).trim() : '';

            if (!loginInput) {
                return res.status(400).json({ success: false, message: 'Debe indicar su usuario para continuar.' });
            }

            const usuario = await UsuarioModel.buscarPorLogin(loginInput);

            if (!usuario) {
                return res.status(404).json({ success: false, message: 'No existe una cuenta con ese usuario.' });
            }

            const preguntas = await UsuarioModel.obtenerPreguntasSeguridad(usuario.id);

            if (!preguntas || preguntas.length === 0) {
                return res.status(404).json({ success: false, message: 'Esta cuenta no tiene preguntas de seguridad configuradas.' });
            }

            req.session.passwordResetUserId = usuario.id;

            const preguntasSeguras = preguntas.map(p => ({
                id_pregunta: p.id_pregunta,
                pregunta: p.pregunta
            }));

            return res.status(200).json({
                success: true,
                data: {
                    login: loginInput,
                    preguntas: preguntasSeguras
                }
            });
        } catch (error) {
            console.error('Error en verificación de usuario para recuperación:', error);
            return res.status(500).json({ success: false, message: 'No se pudo iniciar la recuperación en este momento.' });
        }
    },

    cambiarPasswordPorRecuperacion: async (req, res) => {
        try {
            const usuarioId = req.session.passwordResetUserId;
            const respuestasUsuario = Array.isArray(req.body.respuestas)
                ? req.body.respuestas
                : [req.body.respuestas];
            const nuevaPassword = req.body.nuevaPassword ? String(req.body.nuevaPassword) : '';
            const confirmarPassword = req.body.confirmarPassword ? String(req.body.confirmarPassword) : '';

            if (!usuarioId) {
                return res.status(401).json({ success: false, message: 'Sesión de recuperación inválida o expirada.' });
            }

            const preguntas = await UsuarioModel.obtenerPreguntasSeguridad(usuarioId);

            if (!preguntas || preguntas.length === 0) {
                return res.status(404).json({ success: false, message: 'No se encontraron preguntas de seguridad.' });
            }

            if (!nuevaPassword || nuevaPassword.length < 6) {
                return res.status(400).json({ success: false, message: 'La nueva contraseña debe tener al menos 6 caracteres.' });
            }

            if (nuevaPassword !== confirmarPassword) {
                return res.status(400).json({ success: false, message: 'La confirmación no coincide con la nueva contraseña.' });
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
                return res.status(401).json({ success: false, message: 'Una o más respuestas de seguridad son incorrectas.' });
            }

            const hashNuevaPassword = await bcrypt.hash(nuevaPassword, 10);
            await UsuarioModel.actualizarPassword(usuarioId, hashNuevaPassword);

            delete req.session.passwordResetUserId;

            return res.status(200).json({ success: true, message: 'Contraseña actualizada correctamente.' });
        } catch (error) {
            console.error('Error al cambiar contraseña por recuperación:', error);
            return res.status(500).json({ success: false, message: 'No se pudo actualizar la contraseña. Intente nuevamente.' });
        }
    },

    // --- 4. CERRAR SESIÓN ---
    logout: (req, res) => {
        req.session.destroy(() => {
            res.status(200).json({ success: true, message: 'Sesión cerrada correctamente' });
        });
    },

    // --- 5. MIDDLEWARES DE SEGURIDAD ---
    verificarSesion: (req, res, next) => {
        if (req.session && req.session.usuario) {
            return next();
        } else {
            return res.status(401).json({ success: false, message: 'Acceso denegado: Debes iniciar sesión' });
        }
    },

    verificarComprador: (req, res, next) => {
        const rol = req.session.usuario?.rol;
        if (rol !== 2) {
            return res.status(403).json({ success: false, message: 'Acceso denegado: Se requiere cuenta de comprador.' });
        }
        next();
    },

    // --- 6. UTILIDAD PARA FRONTEND ---
    checkSession: (req, res) => {
        if (req.session && req.session.usuario) {
            res.status(200).json({ success: true, loggedIn: true, data: { usuario: req.session.usuario } });
        } else {
            res.status(200).json({ success: true, loggedIn: false });
        }
    }
};

module.exports = AuthController;