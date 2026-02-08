const InfoCompradorModel = require('../models/InfoCompradorModel');
const ObraModel = require('../models/ObraModel'); 
const UsuarioModel = require('../models/UsuarioModel');

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

        try {
            const membresia = await InfoCompradorModel.buscarPorCodigo(codigoRaw);

            if (!membresia) {
                return res.render('pagos/confirmar-reserva', {
                    message: 'Código de seguridad incorrecto o no encontrado.',
                    success: false,
                    form: formData
                });
            }

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

            const reservado = await ObraModel.reservarById(obra.id);
            
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
            
            if (!datos || datos.length === 0) {
                return res.render('pagos/recuperar-codigo', { 
                    error: 'No tienes preguntas de seguridad asignadas.',
                    preguntas: [] 
                });
            }

            res.render('pagos/recuperar-codigo', { 
                error: null, 
                success: null,
                preguntas: datos 
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
                const respuestaReal = datosCorrectos[i].respuesta.trim().toLowerCase();
                const respuestaInput = respuestasUsuario[i] ? respuestasUsuario[i].trim().toLowerCase() : '';

                if (respuestaReal !== respuestaInput) {
                    todoCorrecto = false;
                    break; 
                }
            }

            if (todoCorrecto) {
                const nuevoCodigo = Math.floor(100 + Math.random() * 900);
                await InfoCompradorModel.actualizarCodigo(usuarioId, nuevoCodigo);

                return res.render('pagos/recuperar-codigo', {
                    error: null,
                    success: `¡Identidad verificada! Tu nuevo código es: ${nuevoCodigo}`,
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