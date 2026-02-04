const ObraModel = require('../models/ObraModel');

const GaleriaController = {
    
    // Mostrar la Galería Principal (Grid Mercado Libre)
    mostrarGaleria: async (req, res) => {
        try {
            // Recoger filtros de la URL (query params)
            const filtros = {
                genero: req.query.genero || null,
                artista: req.query.artista || null,
                precio: req.query.precio || null
            };

            // 1. Obtener las obras filtradas
            const obras = await ObraModel.obtenerFiltradas(filtros);

            // 2. Obtener listas para llenar los <select> de filtros
            const generos = await ObraModel.obtenerGeneros();
            const artistas = await ObraModel.obtenerArtistas();

            // 3. Obtener mensaje de sesión (flash message)
            const message = req.session.message;
            if (req.session.message) {
                delete req.session.message; // Limpiar el mensaje después de usarlo
            }

            // 4. Renderizar vista pasando todos los datos
            res.render('galeria/index', {
                obras,
                generos,
                artistas,
                filtros, // Para mantener seleccionado el filtro actual
                message // Mensaje flash
            });

        } catch (error) {
            console.error("Error en Galeria:", error);
            res.status(500).send("Error interno del servidor");
        }
    },

    // Mostrar el Detalle de una Obra (Ficha Técnica)
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
    }
};

module.exports = GaleriaController;