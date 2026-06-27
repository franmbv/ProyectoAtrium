const ObraModel = require('../models/ObraModel');
const ArtistaModel = require('../models/ArtistaModel'); // Importar el modelo
const VentaModel = require('../models/ventaModel');
const UsuarioModel = require('../models/UsuarioModel');
const axios = require('axios');

const MONGO_API_URL = process.env.MONGO_API_URL || 'http://localhost:8000';

const GaleriaController = {
    
   // Mostrar la Galería Principal (CON SOPORTE DE PAGINACIÓN Y FILTRADO DE DISPONIBILIDAD ESTRICTA)
    mostrarGaleria: async (req, res) => {
        try {
            // Capturar la página actual (por defecto la 1) y el límite de obras por lote (12)
            const page = parseInt(req.query.page || 1, 10);
            const limit = 12;

            const filtros = {
                genero: req.query.genero || null,
                artista: req.query.artista || null,
                precio: req.query.precio || null,
                busqueda: req.query.busqueda || null 
            };

            // Cargamos géneros y artistas de SQL para los filtros de la vista
            const generos = await ObraModel.obtenerGeneros();
            const artistas = await ObraModel.obtenerArtistas();

            // --- INTEGRACIÓN SPRINT 1: LEER DE MONGODB (PAGINADO) ---
            let obrasMongo = [];
            try {
                const queryParams = { page, limit }; // Pasar parámetros de paginación a la API de Python
                if (filtros.genero) queryParams.genero_id = filtros.genero;
                
                const response = await axios.get(`${MONGO_API_URL}/catalog/search`, { 
                    params: queryParams,
                    timeout: 1500 // Evitar cuelgues si el microservicio está en arranque en frío
                });
                obrasMongo = response.data || [];
                
                // Mapear la respuesta de Mongo (anidada) a la estructura plana SQL que espera EJS
                obrasMongo = obrasMongo.map(obra => {
                    const infoArtista = mergeInfo = obra.informacion_artista || {};
                    
                    const generoLocal = generos.find(g => (g.id === obra.genero_id || g.Id === obra.genero_id));
                    const nombreGenero = generoLocal ? generoLocal.nombre : 'Desconocido';

                    return {
                        id: obra.id_sql,
                        nombre: obra.nombre,
                        precioObra: obra.precio_obra,
                        foto: obra.foto,
                        estatus: obra.estatus,
                        nombre_artista: infoArtista.nombre || 'Desconocido',
                        apellido_artista: infoArtista.apellido || '',
                        nombre_genero: nombreGenero,
                        autor_id: obra.autor_id,
                        genero_id: obra.genero_id
                    };
                });

                // 1. Filtrado crítico de Negocio: Mostrar EXCLUSIVAMENTE obras Disponibles.
                obrasMongo = obrasMongo.filter(o => String(o.estatus).toLowerCase() === 'disponible');

                // 2. Aplicar filtros locales que el endpoint de Python (aún) no soporta
                if (filtros.busqueda) {
                    const termino = filtros.busqueda.toLowerCase();
                    obrasMongo = obrasMongo.filter(o => 
                        o.nombre.toLowerCase().includes(termino) ||
                        (o.nombre_artista && o.nombre_artista.toLowerCase().includes(termino)) ||
                        (o.apellido_artista && o.apellido_artista.toLowerCase().includes(termino))
                    );
                }

                // 3. Filtrar por Artista (Mapeo estricto a String para evitar fallos de tipo)
                if (filtros.artista) {
                    obrasMongo = obrasMongo.filter(o => String(o.autor_id) === String(filtros.artista));
                }

                // 4. Ordenamiento por Inversión (Precio)
                if (filtros.precio === 'menor') {
                    obrasMongo.sort((a, b) => a.precioObra - b.precioObra);
                } else if (filtros.precio === 'mayor') {
                    obrasMongo.sort((a, b) => b.precioObra - a.precioObra);
                }

            } catch (mongoError) {
                console.error("Error consultando MongoDB, cayendo en fallback SQL:", mongoError.message);
                // Fallback (Tolerancia a fallos básica)
                obrasMongo = await ObraModel.obtenerFiltradas(filtros);
                
                // AJUSTE CRÍTICO: Filtrar también en el Fallback de SQL por seguridad
                obrasMongo = obrasMongo.filter(o => String(o.estatus).toLowerCase() === 'disponible');
            }

            // --- INTEGRACIÓN SPRINT 3: RECOMENDACIONES NEO4J ---
            let obrasRecomendadas = [];
            let populares = null;
            const NEO4J_API_URL = process.env.NEO4J_API_URL || 'http://localhost:8000';
            const usuarioLogueado = req.session?.usuario;

            if (usuarioLogueado && usuarioLogueado.rol === 2) {
                try {
                    const recResponse = await axios.get(`${NEO4J_API_URL}/api/v1/recommendations/obras/${usuarioLogueado.id}`);
                    if (recResponse.data && recResponse.data.success) {
                        obrasRecomendadas = recResponse.data.data.map(rec => {
                            const match = obrasMongo.find(o => o.id === rec.id_sql);
                            return {
                                id: rec.id_sql,
                                nombre: rec.titulo,
                                precioObra: rec.precio,
                                nombre_artista: rec.artista,
                                nombre_genero: rec.genero,
                                foto: match ? match.foto : 'default.png',
                                estatus: match ? match.estatus : 'Disponible'
                            };
                        });
                    }
                } catch (recError) {
                    console.log(`[Neo4j Recommendations] Sin recomendaciones personalizadas para usuario ${usuarioLogueado.id}:`, recError.response?.data?.detail || recError.message);
                }

                if (obrasRecomendadas.length === 0) {
                    try {
                        const [artistasPop, generosPop] = await Promise.all([
                            axios.get(`${NEO4J_API_URL}/api/v1/recommendations/artistas/populares?limit=3`).catch(() => null),
                            axios.get(`${NEO4J_API_URL}/api/v1/recommendations/generos/populares?limit=3`).catch(() => null)
                        ]);
                        populares = {
                            artistas: artistsPop = artistasPop?.data?.success ? artistasPop.data.data : [],
                            generos: generosPop?.data?.success ? generosPop.data.data : []
                        };
                    } catch (popError) {
                        console.error("[Neo4j Recommendations Error] Obteniendo populares:", popError.message);
                    }
                }
            }

            const message = req.session.message;
            if (req.session.message) delete req.session.message;

            res.render('galeria/index', {
                obras: obrasMongo,
                generos,
                artistas,
                filtros, 
                currentPage: page, 
                message,
                obrasRecomendadas,
                populares
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
            let obra = null;

            // --- INTEGRACIÓN SPRINT 1: LEER DE MONGODB ---
            try {
                const response = await axios.get(`${MONGO_API_URL}/artwork/${idObra}`);
                const obraMongo = response.data;

                if (!obraMongo.error) {
                    // Mapear el JSON de Mongo a la estructura plana SQL
                    obra = {
                        id: obraMongo.id_sql,
                        nombre: obraMongo.nombre,
                        precioObra: obraMongo.precio_obra,
                        foto: obraMongo.foto,
                        estatus: obraMongo.estatus,
                        autor_id: obraMongo.autor_id,
                        genero_id: obraMongo.genero_id
                    };

                    // Hacemos requests adicionales para el artista para llenar la ficha completa
                    const [resArtista, generosSql] = await Promise.all([
                        axios.get(`${MONGO_API_URL}/artist/${obraMongo.autor_id}`).catch(()=>null),
                        ObraModel.obtenerGeneros()
                    ]);

                    if (resArtista && resArtista.data && !resArtista.data.error) {
                        obra.nombre_artista = resArtista.data.nombre;
                        obra.apellido_artista = resArtista.data.apellido;
                        obra.nacionalidad = resArtista.data.nacionalidad;
                    }

                    // Buscar el nombre del género localmente usando el ID
                    const generoLocal = generosSql.find(g => (g.id === obra.genero_id || g.Id === obra.genero_id));
                    obra.nombre_genero = generoLocal ? generoLocal.nombre : 'Desconocido';

                    // Aplanar los detalles polimórficos de MongoDB directamente al objeto principal
                    // EJS busca obra.tecnica, obra.peso, etc.
                    obra.detalles = obraMongo.detalles || {};
                    if (obraMongo.detalles) {
                        Object.keys(obraMongo.detalles).forEach(key => {
                            obra[key] = obraMongo.detalles[key];
                        });
                    }
                }
            } catch (mongoError) {
                console.error("Error consultando ficha en MongoDB, cayendo en fallback SQL:", mongoError.message);
                obra = await ObraModel.obtenerPorId(idObra);
            }

            // Si falló Mongo y el fallback
            if (!obra) {
                obra = await ObraModel.obtenerPorId(idObra);
                if (!obra) return res.redirect('/galeria');
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
    },

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
    },

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