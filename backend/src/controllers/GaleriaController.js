const ObraModel = require('../models/ObraModel');
const ArtistaModel = require('../models/ArtistaModel');
const VentaModel = require('../models/ventaModel');
const UsuarioModel = require('../models/UsuarioModel');

const FASTAPI_URL = 'http://localhost:8000';

const GaleriaController = {
    
    // Obtener la Galería Principal con filtros (Usando Aggregation Pipeline de FastAPI)
    obtenerGaleria: async (req, res) => {
        try {
            const filtros = {
                genero: req.query.genero || null,
                artista: req.query.artista || null,
                precio: req.query.precio || null,
                busqueda: req.query.busqueda || null 
            };

            // Construir Query String para FastAPI
            const params = new URLSearchParams();
            params.append('estatus', 'Disponible'); // Siempre filtramos disponibles para el público
            if (filtros.genero) params.append('genero_id', filtros.genero);
            // Nota: FastAPI no tiene filtro de texto/búsqueda o artista en su pipeline actualmente,
            // pero nos traerá todo lo filtrado por género y estatus con el $lookup ya hecho.

            // Hacemos llamadas paralelas
            const [catalogRes, generosRes, artistasRes] = await Promise.all([
                fetch(`${FASTAPI_URL}/catalog/search?${params.toString()}`),
                fetch(`${FASTAPI_URL}/category/`),
                fetch(`${FASTAPI_URL}/artist/`)
            ]);

            if (!catalogRes.ok || !generosRes.ok || !artistasRes.ok) {
                throw new Error("Error al comunicarse con el microservicio del catálogo");
            }

            let obras = await catalogRes.json();
            const generos = await generosRes.json();
            const artistas = await artistasRes.json();

            // Filtrado adicional en memoria para los campos que el pipeline de MongoDB aún no soporta
            if (filtros.busqueda && filtros.busqueda !== '') {
                const term = filtros.busqueda.toLowerCase();
                obras = obras.filter(o => {
                    const artist = o.informacion_artista;
                    const artistName = artist ? `${artist.nombre} ${artist.apellido}`.toLowerCase() : '';
                    return o.nombre.toLowerCase().includes(term) || artistName.includes(term);
                });
            }

            if (filtros.artista && filtros.artista !== '') {
                obras = obras.filter(o => o.autor_id == filtros.artista);
            }

            if (filtros.precio === 'menor') {
                obras.sort((a, b) => a.precio_obra - b.precio_obra);
            } else if (filtros.precio === 'mayor') {
                obras.sort((a, b) => b.precio_obra - a.precio_obra);
            } else {
                obras.sort((a, b) => b.id_sql - a.id_sql);
            }

            res.status(200).json({
                success: true,
                data: { obras, generos, artistas, filtros }
            });

        } catch (error) {
            console.error("Error en Galeria:", error);
            res.status(500).json({ success: false, message: "Error interno del servidor al cargar la galería" });
        }
    },

    // Obtener el Detalle de una Obra (DESDE FASTAPI)
    obtenerObra: async (req, res) => {
        try {
            const idObra = req.params.id;
            const r = await fetch(`${FASTAPI_URL}/artwork/${idObra}`);
            const obra = await r.json();

            if (!r.ok || obra.error) {
                return res.status(404).json({ success: false, message: 'Obra no encontrada en el catálogo' });
            }

            res.status(200).json({ success: true, data: { obra } });

        } catch (error) {
            console.error("Error en Detalle:", error);
            res.status(500).json({ success: false, message: "Error al cargar la obra" });
        }
    },

    // Ver Perfil Público del Artista (DESDE FASTAPI)
    obtenerPerfilArtista: async (req, res) => {
        try {
            const id = req.params.id;
            
            const [rArtista, rObras] = await Promise.all([
                fetch(`${FASTAPI_URL}/artist/${id}`),
                fetch(`${FASTAPI_URL}/artwork/`)
            ]);

            const artista = await rArtista.json();
            if (!rArtista.ok || artista.error) {
                return res.status(404).json({ success: false, message: 'Artista no encontrado' });
            }

            const todasObras = await rObras.json();
            const obras = todasObras.filter(o => o.autor_id == id);

            res.status(200).json({ success: true, data: { artista, obras } });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar perfil del artista' });
        }
    },

    // Consultar disponibilidad (Ideal para validar antes de que el usuario intente reservar) (DESDE FASTAPI)
    verificarDisponibilidad: async (req, res) => {
        try {
            const id = req.params.id;
            const r = await fetch(`${FASTAPI_URL}/artwork/${id}`);
            const obra = await r.json();

            if (r.ok && !obra.error && obra.estatus === 'Disponible') {
                return res.status(200).json({ success: true, data: { disponible: true, estatus: 'Disponible' } });
            } else {
                return res.status(200).json({ 
                    success: true, 
                    data: { 
                        disponible: false, 
                        estatus: (r.ok && !obra.error) ? obra.estatus : 'No encontrada' 
                    } 
                });
            }
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al verificar disponibilidad' });
        }
    },

    // Mostrar historial (compras y reservas) del usuario logueado
    // Este método se mantiene usando MySQL ya que las reservas y ventas son dominio de transacciones de Node.js
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
    // Este método se mantiene usando MySQL
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