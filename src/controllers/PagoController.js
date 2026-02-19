const InfoCompradorModel = require('../models/InfoCompradorModel');
const ObraModel = require('../models/ObraModel'); 
const UsuarioModel = require('../models/UsuarioModel');
const { sendSecurityCode } = require('../config/mailer');
const bcrypt = require('bcryptjs');

const PagoController = {

    // GET: Mostrar el formulario
    mostrarConfirmacion: (req, res) => {
        // Lógica de limpieza del query param
        let obraNombre = (req.query && req.query.obraNombre) ? String(req.query.obraNombre).trim() : '';

        const validNameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ0-9().,\- ]+$/;

        if (!validNameRegex.test(obraNombre)) {
            console.log(`⚠️ Nombre de obra saneado/rechazado: "${obraNombre}"`);
            obraNombre = '';
        }

        // Si el usuario ya tiene 3 o más intentos fallidos, redirigir al formulario de recuperación
        if (req.session.failedAttempts && req.session.failedAttempts >= 3) {
            req.session.messageInfo = 'Has excedido el número máximo de intentos. Por favor, recupera tu código.';
            return res.redirect('/pagos/recuperar');
        }
        res.render('pagos/confirmar-reserva', { 
            message: null, 
            success: null, 
            form: { obraNombre }, 
            info: null 
        });
    },

    // POST: Procesar la Reserva
    procesarReserva: async (req, res) => {
        const codigoRaw = req.body.codigoSeguridad ? String(req.body.codigoSeguridad).trim() : '';
        const obraNombreRaw = req.body.obraNombre ? String(req.body.obraNombre).trim() : '';

        const formData = { codigoSeguridad: codigoRaw, obraNombre: obraNombreRaw };

        if (!/^\d{3}$/.test(codigoRaw)) {
            return res.render('pagos/confirmar-reserva', {
                message: 'El código debe ser de 3 dígitos numéricos.',
                success: false,
                form: formData
            });
        }

        const validNameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ0-9().,\- ]+$/;

        if (!validNameRegex.test(obraNombreRaw)) {
            return res.render('pagos/confirmar-reserva', {
                message: 'Nombre de obra inválido (solo letras).',
                success: false,
                form: formData
            });
        }

        // Inicializar contador de intentos fallidos si no existe
        if (!req.session.failedAttempts) {
            req.session.failedAttempts = 0;
        }

        // Si está en estado de bloqueo (>=3), forzar ir al flujo de recuperación
        if (req.session.failedAttempts >= 3) {
            req.session.messageInfo = 'Has excedido el número máximo de intentos. Por favor, recupera tu código.';
            return res.redirect('/pagos/recuperar');
        }
        try {
            const membresia = await InfoCompradorModel.buscarPorCodigoyUsuario(codigoRaw, req.session.usuario?.id);

            if (!membresia) {
                req.session.failedAttempts += 1;

                if (req.session.failedAttempts >= 3) {
                    // No generar ni enviar código automáticamente: forzar al usuario a pasar por el formulario de recuperación
                    req.session.messageInfo = 'Has excedido el número máximo de intentos. Por seguridad, debes recuperar tu código.';
                    return res.redirect('/pagos/recuperar');
                } else {
                    return res.render('pagos/confirmar-reserva', {
                        message: `Código de seguridad incorrecto o no encontrado. Intentos restantes: ${3 - req.session.failedAttempts}`,
                        success: false,
                        form: formData
                    });
                }
            }

            // Resetear intentos en caso de éxito
            req.session.failedAttempts = 0;

            if (membresia.estado && membresia.estado.toLowerCase() !== 'activo') {
                return res.render('pagos/confirmar-reserva', {
                    message: 'Licencia Vencida / Inactiva.',
                    success: false,
                    form: formData
                });
            }

            const obra = await ObraModel.findByNombre(obraNombreRaw);

            if (!obra) {
                req.session.message = { 
                    type: 'error', 
                    text: `La obra "${obraNombreRaw}" no existe en el catálogo.` 
                };
                return res.redirect('/galeria');
            }

            if (obra.estatus && obra.estatus.toLowerCase() !== 'disponible') {
                req.session.message = { 
                    type: 'error', 
                    text: `Lo sentimos, la obra "${obraNombreRaw}" ya ha sido vendida o reservada.` 
                };
                return res.redirect('/galeria');
            }

            const compradorId = req.session.usuario?.id;
            if (!compradorId) {
                return res.redirect('/auth/login');
            }

            const reservado = await ObraModel.reservarById(obra.id, compradorId);
            
            if (reservado) {
               req.session.message = {
                    type: 'success',
                    text: `¡Felicidades! La obra "${obraNombreRaw}" ha sido reservada con éxito y está a la espera de la aprobación de un administrador.`
                };
                return res.redirect('/galeria');
            } else {
                req.session.message = { 
                    type: 'error', 
                    text: `La obra "${obraNombreRaw}" fue reservada por otra persona hace un instante.` 
                };
                return res.redirect('/galeria');
            }

        } catch (error) {
            console.error('Error en procesarReserva:', error);
            res.render('pagos/confirmar-reserva', {
                message: 'Error del sistema: ' + error.message,
                success: false,
                form: formData
            });
        }
    },

    // API JSON: Verificar Status 
    verificarStatusAPI: async (req, res) => {
        const codigoRaw = req.body.codigoSeguridad ? String(req.body.codigoSeguridad).trim() : '';

        if (!/^\d+$/.test(codigoRaw)) {
            return res.status(400).json({ message: 'Formato inválido' });
        }

        try {
            const membresia = await InfoCompradorModel.buscarPorCodigo(codigoRaw);
            
            if (!membresia) {
                return res.status(404).json({ message: 'Comprador no encontrado' });
            }

            const estado = membresia.estado || 'Inactivo';
            const isActive = estado.toLowerCase() === 'activo';

            return res.json({
                success: isActive,
                message: isActive ? 'Código validado' : 'Licencia vencida',
                estado: estado
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ message: 'Error interno' });
        }
    },

    formRecuperarCodigo: async (req, res) => {
        try {
            const usuarioId = req.session.usuario?.id;
            if (!usuarioId) return res.redirect('/auth/login');

            const datos = await UsuarioModel.obtenerPreguntasSeguridad(usuarioId);
            
            // Si no hay preguntas, informar
            if (!datos || datos.length === 0) {
                const msg = req.session.messageInfo || null;
                delete req.session.messageInfo;
                return res.render('pagos/recuperar-codigo', { 
                    error: 'No tienes preguntas de seguridad asignadas.',
                    success: null,
                    preguntas: [],
                    message: msg
                });
            }

            // Pasar cualquier mensaje que haya quedado en sesión (ej. bloqueo por intentos)
            const msg = req.session.messageInfo || null;
            delete req.session.messageInfo;

            res.render('pagos/recuperar-codigo', { 
                error: null, 
                success: null,
                preguntas: datos,
                message: msg
            });

        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar formulario');
        }
    },

    procesarRecuperacion: async (req, res) => {
        try {
            const usuarioId = req.session.usuario?.id;
            const respuestasUsuario = req.body.respuestas; 

            const datosCorrectos = await UsuarioModel.obtenerPreguntasSeguridad(usuarioId);

            if (!datosCorrectos || datosCorrectos.length === 0) {
                return res.redirect('/pagos/recuperar');
            }

            let todoCorrecto = true;
            
            for (let i = 0; i < datosCorrectos.length; i++) {
                const hashGuardado = datosCorrectos[i].respuesta;
                const respuestaInput = respuestasUsuario[i] ? respuestasUsuario[i].trim().toLowerCase() : '';
                const coincide = await bcrypt.compare(respuestaInput, hashGuardado);

                if (!coincide) {
                    todoCorrecto = false;
                    break; 
                }
            }

            if (todoCorrecto) {
                const nuevoCodigo = Math.floor(100 + Math.random() * 900).toString().padStart(3, '0');
                await InfoCompradorModel.actualizarCodigo(usuarioId, nuevoCodigo);

                // --- ENVÍO DE CORREO REAL AL RECUPERAR ---
                const usuario = await UsuarioModel.buscarPorId(usuarioId);
                if (usuario && usuario.gmail) {
                    try {
                        await sendSecurityCode(usuario.gmail, nuevoCodigo);
                        console.log(`✅ Correo de recuperación enviado a: ${usuario.gmail}`);
                    } catch (mailErr) {
                        console.error('❌ Error al enviar correo de recuperación:', mailErr.message);
                    }
                }

                // Resetear contador de intentos tras recuperación exitosa
                if (req.session) {
                    req.session.failedAttempts = 0;
                }

                return res.render('pagos/recuperar-codigo', {
                    error: null,
                    success: `¡Identidad verificada! Tu nuevo código ha sido enviado a tu correo.`,
                    preguntas: []
                });
            } else {
                return res.render('pagos/recuperar-codigo', {
                    error: 'Una o más respuestas son incorrectas.',
                    success: null,
                    preguntas: datosCorrectos
                });
            }

        } catch (error) {
            console.error(error);
            res.status(500).send('Error al procesar');
        }
    }
};

module.exports = PagoController;