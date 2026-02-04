const InfoCompradorModel = require('../models/InfoCompradorModel');

const PagoController = {

    // GET: Mostrar el formulario
    mostrarConfirmacion: (req, res) => {
        res.render('confirmar-reserva', { 
            message: null, 
            success: null 
        });
    },

    // POST: Procesar la validación
    validarCodigo: async (req, res) => {
        const codigoRaw = req.body.codigoSeguridad ? String(req.body.codigoSeguridad).trim() : '';

        if (!/^\d{3}$/.test(codigoRaw)) {
            return res.render('confirmar-reserva', {
                message: 'Su código de seguridad es incorrecto, por favor reintente (solo números).',
                success: false
            });
        }

        try {
            const info = await InfoCompradorModel.buscarPorCodigo(codigoRaw);

            if (info) {
                return res.render('confirmar-reserva', {
                    message: 'Su código de seguridad ha sido validado exitosamente.',
                    success: true,
                    info: info 
                });
            } else {
                return res.render('confirmar-reserva', {
                    message: 'Código no encontrado en el sistema.',
                    success: false
                });
            }

        } catch (error) {
            console.error('Error en validarCodigo:', error);
            return res.render('confirmar-reserva', {
                message: 'Error de conexión con la base de datos. Intente más tarde.',
                success: false
            });
        }
    }
};

module.exports = PagoController;