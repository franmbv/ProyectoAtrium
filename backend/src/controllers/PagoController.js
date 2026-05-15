const InfoCompradorModel = require('../models/InfoCompradorModel');
const ObraModel = require('../models/ObraModel'); 
const UsuarioModel = require('../models/UsuarioModel');
const { sendSecurityCode } = require('../config/mailer');
const bcrypt = require('bcryptjs');

const PagoController = {

    // Verificar estado antes de mostrar confirmación de reserva
    verificarEstadoReserva: (req, res) => {
        let obraNombre = (req.query && req.query.obraNombre) ? String(req.query.obraNombre).trim() : '';
        const validNameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ0-9().,\- ]+$/;

        if (!validNameRegex.test(obraNombre)) {
            obraNombre = '';
        }

        // Si el usuario ya tiene 3 o más intentos fallidos
        if (req.session.failedAttempts && req.session.failedAttempts >= 3) {
            return res.status(403).json({ 
                success: false,
                message: 'Has excedido el número máximo de intentos. Por favor, recupera tu código.'
            });
        }
        res.status(200).json({ success: true, data: { obraNombre } });
    },

    // Procesar la Reserva
    crearReserva: async (req, res) => {
        const codigoRaw = req.body.codigoSeguridad ? String(req.body.codigoSeguridad).trim() : '';
        const obraNombreRaw = req.body.obraNombre ? String(req.body.obraNombre).trim() : '';

        if (!/^\d{3}$/.test(codigoRaw)) {
            return res.status(400).json({ success: false, message: 'El código debe ser de 3 dígitos numéricos.' });
        }

        const validNameRegex = /^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ0-9().,\- ]+$/;
        if (!validNameRegex.test(obraNombreRaw)) {
            return res.status(400).json({ success: false, message: 'Nombre de obra inválido (solo letras).' });
        }

        if (!req.session.failedAttempts) {
            req.session.failedAttempts = 0;
        }

        if (req.session.failedAttempts >= 3) {
            return res.status(403).json({ success: false, message: 'Has excedido el número máximo de intentos. Por favor, recupera tu código.' });
        }

        try {
            const membresia = await InfoCompradorModel.buscarPorCodigoyUsuario(codigoRaw, req.session.usuario?.id);

            if (!membresia) {
                req.session.failedAttempts += 1;

                if (req.session.failedAttempts >= 3) {
                    return res.status(403).json({ success: false, message: 'Has excedido el número máximo de intentos. Por seguridad, debes recuperar tu código.' });
                } else {
                    return res.status(401).json({ success: false, message: `Código incorrecto. Intentos restantes: ${3 - req.session.failedAttempts}` });
                }
            }

            req.session.failedAttempts = 0;

            if (membresia.estado && membresia.estado.toLowerCase() !== 'activo') {
                return res.status(403).json({ success: false, message: 'Licencia Vencida / Inactiva.' });
            }

            const obra = await ObraModel.findByNombre(obraNombreRaw);

            if (!obra) {
                return res.status(404).json({ success: false, message: 'La obra solicitada no existe o no se encuentra en el catálogo.' });
            }

            if (obra.estatus && obra.estatus.toLowerCase() !== 'disponible') {
                return res.status(409).json({ success: false, message: 'Esta obra ya no se encuentra disponible (ya ha sido vendida o reservada).' });
            }

            const compradorId = req.session.usuario?.id;
            if (!compradorId) {
                return res.status(401).json({ success: false, message: 'Necesitas iniciar sesión para realizar reservas.' });
            }

            const reservado = await ObraModel.reservarById(obra.id, compradorId);
            
            if (reservado) {
                return res.status(201).json({ success: true, message: `¡Felicidades! La obra "${obraNombreRaw}" ha sido reservada con éxito y está a la espera de aprobación.` });
            } else {
                return res.status(409).json({ success: false, message: `La obra "${obraNombreRaw}" fue reservada por alguien más hace un instante.` });
            }

        } catch (error) {
            console.error('Error en procesarReserva:', error);
            res.status(500).json({ success: false, message: 'Error del sistema: ' + error.message });
        }
    },
    
    // Verificar Status del Código
    verificarEstadoCodigo: async (req, res) => {
        const codigoRaw = req.body.codigoSeguridad ? String(req.body.codigoSeguridad).trim() : '';

        if (!/^\d+$/.test(codigoRaw)) {
            return res.status(400).json({ success: false, message: 'Formato inválido' });
        }

        try {
            const membresia = await InfoCompradorModel.buscarPorCodigo(codigoRaw);
            
            if (!membresia) {
                return res.status(404).json({ success: false, message: 'Comprador no encontrado' });
            }

            const estado = membresia.estado || 'Inactivo';
            const isActive = estado.toLowerCase() === 'activo';

            return res.status(200).json({
                success: isActive, // Aquí se aprovecha el flag para indicar si está activo o no
                message: isActive ? 'Código validado' : 'Licencia vencida',
                data: { estado: estado }
            });

        } catch (error) {
            console.error(error);
            return res.status(500).json({ success: false, message: 'Error interno' });
        }
    },

    // Obtener Preguntas
    obtenerPreguntasRecuperacion: async (req, res) => {
        try {
            const usuarioId = req.session.usuario?.id;
            if (!usuarioId) return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });

            const datos = await UsuarioModel.obtenerPreguntasSeguridad(usuarioId);
            
            if (!datos || datos.length === 0) {
                return res.status(404).json({ success: false, message: 'No tienes preguntas de seguridad asignadas.' });
            }

            const preguntasSeguras = datos.map(p => ({
                id_pregunta: p.id_pregunta,
                pregunta: p.pregunta
            }));

            res.status(200).json({ success: true, data: { preguntas: preguntasSeguras } });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar formulario' });
        }
    },

    // Procesar Recuperación
    recuperarCodigo: async (req, res) => {
        try {
            const usuarioId = req.session.usuario?.id;
            const respuestasUsuario = req.body.respuestas; 

            const datosCorrectos = await UsuarioModel.obtenerPreguntasSeguridad(usuarioId);

            if (!datosCorrectos || datosCorrectos.length === 0) {
                return res.status(404).json({ success: false, message: 'No tienes preguntas de seguridad configuradas.' });
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

                // --- ENVÍO DE CORREO ---
                const usuario = await UsuarioModel.buscarPorId(usuarioId);
                if (usuario && usuario.gmail) {
                    try {
                        await sendSecurityCode(usuario.gmail, nuevoCodigo);
                        console.log(`✅ Correo de recuperación enviado a: ${usuario.gmail}`);
                    } catch (mailErr) {
                        console.error('❌ Error al enviar correo de recuperación:', mailErr.message);
                    }
                }

                if (req.session) {
                    req.session.failedAttempts = 0;
                }

                return res.status(200).json({ success: true, message: '¡Identidad verificada! Tu nuevo código ha sido enviado a tu correo.' });
            } else {
                return res.status(401).json({ success: false, message: 'Una o más respuestas son incorrectas.' });
            }

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al procesar recuperación' });
        }
    }
};

module.exports = PagoController;