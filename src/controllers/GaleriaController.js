const ObraModel = require('../models/ObraModel');
const ArtistaModel = require('../models/ArtistaModel'); // Importar el modelo
const VentaModel = require('../models/ventaModel');
const UsuarioModel = require('../models/UsuarioModel');

const GaleriaController = {
    
    // Mostrar la Galería Principal
    mostrarGaleria: async (req, res) => {
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

            const message = req.session.message;
            if (req.session.message) delete req.session.message;

            res.render('galeria/index', {
                obras,
                generos,
                artistas,
                filtros, 
                message
            });

        } catch (error) {
            console.error("Error en Galeria:", error);
            res.status(500).send("Error interno del servidor");
        }
    },

    // Mostrar el Detalle de una Obra
    verFichaTecnica: async (req, res) => {
        try {
            const idObra = req.params.id;
            const obra = await ObraModel.obtenerPorId(idObra);

            if (!obra) {
                return res.redirect('/galeria');
            }

            res.render('galeria/detalle', { obra });

        } catch (error) {
            console.error("Error en Detalle:", error);
            res.status(500).send("Error al cargar la obra");
        }
    },

    // NUEVO: Ver Perfil Público del Artista
    verPerfilArtista: async (req, res) => {
        try {
            const id = req.params.id;
            
            // 1. Datos del artista
            const artista = await ArtistaModel.obtenerPorId(id);
            if (!artista) return res.redirect('/galeria');

            // 2. Sus obras
            const obras = await ObraModel.obtenerPorAutor(id);

            res.render('artista/perfil', { artista, obras });

        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar perfil del artista');
        }
    },

    // API para consultar disponibilidad
    verificarDisponibilidadAPI: async (req, res) => {
        try {
            const id = req.params.id;
            const obra = await ObraModel.obtenerPorId(id);

            if (obra && obra.estatus === 'Disponible') {
                return res.json({ disponible: true });
            } else {
                return res.json({ 
                    disponible: false, 
                    estatus: obra ? obra.estatus : 'No encontrada' 
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ error: 'Error del servidor' });
        }
    }
,

    // Mostrar historial (compras y reservas) del usuario logueado
    historial: async (req, res) => {
        try {
            const userSession = req.session?.usuario;
            if (!userSession || !userSession.id) return res.redirect('/auth/login?error=Debes iniciar sesión');

            const userId = userSession.id;

            // Usuario completo
            const user = await UsuarioModel.buscarPorId(userId);

            // Compras (ventas/facturas)
            const compras = await VentaModel.obtenerPorComprador(userId);

            // Reservas hechas por el usuario
            const reservadas = await ObraModel.obtenerReservadasPorUsuario(userId);

            // Normalizar datos para la vista: unir ambos conjuntos en un solo arreglo
            const obras = [];

            // Agregar compras (tipo = 'Vendida') y reservar ventaId
            (compras || []).forEach(c => {
                obras.push({
                    id: c.obraId,
                    nombre: c.nombre_obra || c.nombre_obra,
                    foto: c.foto,
                    precioObra: c.precioObra || c.precioObra,
                    estatus: 'Vendida',
                    ventaId: c.ventaId,
                    fecha: c.fechaDeVenta
                });
            });

            // Agregar reservadas (tipo = 'Reservada')
            (reservadas || []).forEach(r => {
                obras.push({
                    id: r.id,
                    nombre: r.nombre,
                    foto: r.foto,
                    precioObra: r.precioObra,
                    estatus: 'Reservada'
                });
            });

            res.render('user/historial', { obras, user });

        } catch (error) {
            console.error('Error en historial:', error);
            res.status(500).send('Error al cargar historial');
        }
    }
    ,

    // Ver factura detalle para el comprador (solo lectura)
    facturaUsuario: async (req, res) => {
        try {
            const userSession = req.session?.usuario;
            if (!userSession || !userSession.id) return res.redirect('/auth/login?error=Debes iniciar sesión');

            const factura = await VentaModel.obtenerFacturaPorId(req.params.id);
            if (!factura) return res.status(404).send('Factura no encontrada');

            if (parseInt(factura.comprador_id, 10) !== parseInt(userSession.id, 10)) {
                return res.status(403).send('Acceso denegado a esta factura');
            }

            res.render('user/factura-detalle', { factura });
        } catch (error) {
            console.error('Error en facturaUsuario:', error);
            res.status(500).send('Error al cargar factura');
        }
    }
};

module.exports = GaleriaController;