const ObraModel = require('../models/ObraModel');
const ArtistaModel = require('../models/ArtistaModel'); // Importar el modelo

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
};

module.exports = GaleriaController;