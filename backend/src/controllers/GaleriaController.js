const ObraModel = require('../models/ObraModel');
const ArtistaModel = require('../models/ArtistaModel');
const VentaModel = require('../models/ventaModel');
const UsuarioModel = require('../models/UsuarioModel');

const GaleriaController = {
    
    // Obtener la Galería Principal con filtros
    obtenerGaleria: async (req, res) => {
        try {
            const filtros = {
                genero: req.query.genero || null,
                artista: req.query.artista || null,
                precio: req.query.precio || null,
                busqueda: req.query.busqueda || null 
            };

            const obras = await ObraModel.obtenerFiltradas(filtros);
            const generos = await ObraModel.obtenerGeneros();
            const artistas = await ObraModel.obtenerArtistas();

            res.status(200).json({
                success: true,
                data: { obras, generos, artistas, filtros }
            });

        } catch (error) {
            console.error("Error en Galeria:", error);
            res.status(500).json({ success: false, message: "Error interno del servidor al cargar la galería" });
        }
    },

    // Obtener el Detalle de una Obra
    obtenerObra: async (req, res) => {
        try {
            const idObra = req.params.id;
            const obra = await ObraModel.obtenerPorId(idObra);

            if (!obra) {
                return res.status(404).json({ success: false, message: 'Obra no encontrada' });
            }
            
            const obraLimpia = Object.fromEntries(
                Object.entries(obra).filter(([llave, valor]) => valor !== null)
            );

            res.status(200).json({ success: true, data: { obra: obraLimpia } });

        } catch (error) {
            console.error("Error en Detalle:", error);
            res.status(500).json({ success: false, message: "Error al cargar la obra" });
        }
    },

    // Ver Perfil Público del Artista
    obtenerPerfilArtista: async (req, res) => {
        try {
            const id = req.params.id;
            
            const artista = await ArtistaModel.obtenerPorId(id);
            if (!artista) return res.status(404).json({ success: false, message: 'Artista no encontrado' });

            const obras = await ObraModel.obtenerPorAutor(id);

            res.status(200).json({ success: true, data: { artista, obras } });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar perfil del artista' });
        }
    },

    // Consultar disponibilidad (Ideal para validar antes de que el usuario intente reservar)
    verificarDisponibilidad: async (req, res) => {
        try {
            const id = req.params.id;
            const obra = await ObraModel.obtenerPorId(id);

            if (obra && obra.estatus === 'Disponible') {
                return res.status(200).json({ success: true, data: { disponible: true, estatus: 'Disponible' } });
            } else {
                return res.status(200).json({ 
                    success: true, 
                    data: { 
                        disponible: false, 
                        estatus: obra ? obra.estatus : 'No encontrada' 
                    } 
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al verificar disponibilidad' });
        }
    },

    // Mostrar historial (compras y reservas) del usuario logueado
    obtenerHistorial: async (req, res) => {
        try {
            const userSession = req.session?.usuario;
            if (!userSession || !userSession.id) return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });

            const userId = userSession.id;
            const user = await UsuarioModel.buscarPorId(userId);
            const compras = await VentaModel.obtenerPorComprador(userId);
            const reservadas = await ObraModel.obtenerReservadasPorUsuario(userId);

            const obras = [];

            (compras || []).forEach(c => {
                obras.push({
                    id: c.obraId,
                    nombre: c.nombre_obra,
                    foto: c.foto,
                    precioObra: c.precioObra,
                    estatus: 'Vendida',
                    ventaId: c.ventaId,
                    fecha: c.fechaDeVenta
                });
            });

            (reservadas || []).forEach(r => {
                obras.push({
                    id: r.id,
                    nombre: r.nombre,
                    foto: r.foto,
                    precioObra: r.precioObra,
                    estatus: 'Reservada'
                });
            });

            res.status(200).json({ success: true, data: { obras, user } });

        } catch (error) {
            console.error('Error en historial:', error);
            res.status(500).json({ success: false, message: 'Error al cargar historial' });
        }
    },

    // Ver factura detalle para el comprador
    obtenerFactura: async (req, res) => {
        try {
            const userSession = req.session?.usuario;
            if (!userSession || !userSession.id) return res.status(401).json({ success: false, message: 'Debes iniciar sesión' });

            const factura = await VentaModel.obtenerFacturaPorId(req.params.id);
            if (!factura) return res.status(404).json({ success: false, message: 'Factura no encontrada' });

            // Medida de seguridad: Validar que la factura pertenezca al usuario logueado
            if (parseInt(factura.comprador_id, 10) !== parseInt(userSession.id, 10)) {
                return res.status(403).json({ success: false, message: 'Acceso denegado a esta factura' });
            }

            res.status(200).json({ success: true, data: { factura } });
        } catch (error) {
            console.error('Error en facturaUsuario:', error);
            res.status(500).json({ success: false, message: 'Error al cargar factura' });
        }
    }
};

module.exports = GaleriaController;