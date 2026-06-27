const InfoCompradorModel = require('../models/InfoCompradorModel');
const ObraModel = require('../models/ObraModel'); 
const UsuarioModel = require('../models/UsuarioModel');
const { sendSecurityCode } = require('../config/mailer');
const bcrypt = require('bcryptjs');
const { enviarAuditoria } = require('../config/auditoria');
const MongoSyncService = require('../services/MongoSyncService');
const db = require('../config/db'); 


const PagoController = {

    // GET: Mostrar el formulario
     mostrarConfirmacion: (req, res) => {
        // Capturamos AMBOS parámetros
        let obraNombre = (req.query && req.query.obraNombre) ? String(req.query.obraNombre).trim() : '';
        let obraId = (req.query && req.query.obraId) ? String(req.query.obraId).trim() : '';

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
            form: { obraNombre, obraId }, // Enviamos el ID a la vista
            info: null 
        });
    },

   
     // POST: Procesar la Reserva
     procesarReserva: async (req, res) => {
        const codigoRaw = req.body.codigoSeguridad ? String(req.body.codigoSeguridad).trim() : '';
        const obra_id = req.body.obra_id; // Este valor viene del hidden input en tu EJS

        const formData = { 
            codigoSeguridad: codigoRaw, 
            obraNombre: req.body.obraNombre,
            obraId: obra_id 
        };

        // 1. Validación de seguridad contra inputs vacíos
        if (!obra_id) {
            console.error("❌ [DEBUG COMPRA] ID de obra recibido vacío.");
            return res.status(400).send("Error: ID de obra no recibido.");
        }

        if (!/^\d{3}$/.test(codigoRaw)) {
            return res.render('pagos/confirmar-reserva', {
                message: 'El código debe ser de 3 dígitos.',
                success: false,
                form: formData
            });
        }

        try {
            console.log(`\n🔍 [DEBUG COMPRA] ID comprador: ${req.session.usuario?.id} | ID Obra: ${obra_id}`);

            const membresia = await InfoCompradorModel.buscarPorCodigoyUsuario(codigoRaw, req.session.usuario?.id);

            if (!membresia) {
                req.session.failedAttempts = (req.session.failedAttempts || 0) + 1;
                return res.render('pagos/confirmar-reserva', {
                    message: `Código incorrecto.`,
                    success: false,
                    form: formData
                });
            }

            req.session.failedAttempts = 0;

            // 2. BUSCAR POR ID (Infalible)
            const obra = await ObraModel.obtenerPorId(obra_id);

            if (!obra || obra.estatus.toLowerCase() !== 'disponible') {
                console.log(`❌ [DEBUG COMPRA] Obra no disponible o inexistente: ${obra_id}`);
                return res.redirect('/galeria');
            }

            const compradorId = req.session.usuario?.id;
            const reservado = await ObraModel.reservarById(obra.id, compradorId);
            
            if (reservado) {
                console.log(`🟢 [DEBUG COMPRA] Obra ${obra.id} reservada en SQL.`);
                
                // --- SINCRONIZACIÓN A MONGODB ---
                try {
                    const obraActualizada = await ObraModel.obtenerPorId(obra.id);
                    await MongoSyncService.syncObra(obraActualizada, true);
                    console.log("✅ [DEBUG COMPRA] MongoDB actualizado exitosamente.");
                } catch (syncErr) {
                    console.error("❌ [DEBUG COMPRA] Error sincronizando MongoDB:", syncErr.message);
                }
                
                // --- AUDITORÍA Y NOTIFICACIÓN ---
                await enviarAuditoria('/obras/historico', {
                    id_obra: obra.id,
                    estatus_anterior: 'Disponible',
                    estatus_nuevo: 'Reservada',
                    usuario_id: compradorId,
                    fecha_evento: new Date().toISOString()
                });

                const usuarioDB = await UsuarioModel.buscarPorId(compradorId);
                if (usuarioDB && usuarioDB.gmail) {
                    sendSecurityCode(usuarioDB.gmail, codigoRaw).catch(console.error);
                }

                req.session.message = { type: 'success', text: `La obra "${obra.nombre}" ha sido reservada con éxito.` };
                return res.redirect('/galeria');
            } else {
                return res.redirect('/galeria');
            }

        } catch (error) {
            console.error('❌ [DEBUG COMPRA] Error:', error);
            res.status(500).send('Error interno del servidor.');
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

                    // --- AUDITORÍA DE CÓDIGO DE MEMBRESÍA EN CASSANDRA ---
                    await enviarAuditoria('/membresias/codigos', {
                        id_comprador: usuarioId,
                        codigo_seguridad: nuevoCodigo,
                        correo_envio: usuario.gmail,
                        fecha_registro: new Date().toISOString(),
                        estado: "EMITIDO"
                    });
                }

                // Resetear contador de intentos tras recuperación exitosa
                if (req.session) {
                    req.session.failedAttempts = 0;
                }

                return res.render('pagos/recuperar-codigo', {
                    error: null,
                    success: `¡Identidad verificada! Tu nuevo código ha sido enviado a tu correo.`,
                    preguntas: [],
                    message: null
                });
            } else {
                return res.render('pagos/recuperar-codigo', {
                    error: 'Una o más respuestas son incorrectas.',
                    success: null,
                    preguntas: datosCorrectos,
                    message: null
                });
            }

        } catch (error) {
            console.error(error);
            res.status(500).send('Error al procesar');
        }
    }
};

module.exports = PagoController;