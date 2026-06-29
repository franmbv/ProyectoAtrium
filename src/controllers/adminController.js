const db = require('../config/db');
const ObraModel = require('../models/ObraModel');
const VentaModel = require('../models/ventaModel');
const ArtistaModel = require('../models/ArtistaModel');
const InfoCompradorModel = require('../models/InfoCompradorModel');
const MongoSyncService = require('../services/MongoSyncService');
const Neo4jSyncService = require('../services/Neo4jSyncService');
const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/UsuarioModel');
const { sendReservaAceptada } = require('../config/mailer');
const { enviarAuditoria } = require('../config/auditoria');
const { Parser } = require('json2csv');
const axios = require('axios');

// --- INICIALIZACIÓN DE SUPABASE ---
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Helper de subida a Supabase
const subirImagenASupabase = async (file, subcarpeta) => {
    if (!file) return null;
    try {
        let fileBuffer = file.buffer || fs.readFileSync(file.path);
        const filename = `${subcarpeta}/${Date.now()}-${file.originalname}`;
        const { error } = await supabase.storage.from('atrium-images').upload(filename, fileBuffer, {
            contentType: file.mimetype,
            duplex: 'half'
        });
        if (error) throw error;
        const { data } = supabase.storage.from('atrium-images').getPublicUrl(filename);
        if (file.path && fs.existsSync(file.path)) fs.unlinkSync(file.path);
        return data.publicUrl;
    } catch (error) {
        console.error("❌ Supabase Error:", error.message);
        return file.filename; // Fallback
    }
};

const AdminController = {

    // 1. DASHBOARD PRINCIPAL
    dashboard: async (req, res) => {
        try {
            const [totalObras, recaudado, gananciaMuseo, membresias, statsGeneros, statsEstatus] = await Promise.all([
                ObraModel.contarInventarioActivo(),
                VentaModel.totalRecaudado(),
                VentaModel.totalGananciaMuseo(),
                InfoCompradorModel.contarActivas(),
                ObraModel.obtenerEstadisticasGeneros(),
                ObraModel.obtenerEstadisticasEstatus()
            ]);

            res.render('admin/dashboard', {
                stats: { totalObras, recaudado, gananciaMuseo, membresias },
                charts: { generos: statsGeneros, estatus: statsEstatus },
                errorMsg: null
            });
        } catch (error) {
            console.error('Error en Dashboard:', error);
            res.render('admin/dashboard', {
                stats: { totalObras: 0, recaudado: 0, gananciaMuseo: 0, membresias: 0 },
                charts: { generos: [], estatus: [] },
                errorMsg: 'Error de conexión con la base de datos.'
            });
        }
    },

    // Historial de Obra en Cassandra
    historialObra: async (req, res) => {
        try {
            const idObra = req.params.id;
            
            // 1. Obtener la información básica de la obra
            const obra = await ObraModel.obtenerPorId(idObra);
            if (!obra) {
                return res.status(404).send('Obra no encontrada');
            }

            // 2. Consultar el historial en el microservicio de Cassandra
            const auditoriaApiUrl = process.env.AUDITORIA_API_URL || 'https://museoatrium-auditoria.onrender.com';
            let historial = [];
            
            try {
                const response = await axios.get(`${auditoriaApiUrl}/obras/historico/${idObra}`);
                if (response.data && Array.isArray(response.data)) {
                    // Ordenar por fecha del evento de forma descendente (más reciente primero)
                    historial = response.data.sort((a, b) => new Date(b.fecha_evento) - new Date(a.fecha_evento));
                }
            } catch (apiError) {
                console.warn(`[Cassandra API Warn] No se pudo obtener el historial para la obra ${idObra}:`, apiError.message);
            }

            // 3. Renderizar la vista
            res.render('admin/historial-obra', {
                obra,
                historial,
                errorMsg: null
            });
        } catch (error) {
            console.error('Error al recuperar historial de la obra:', error);
            res.status(500).send('Error interno al cargar el historial de trazabilidad.');
        }
    },

    // Bitácora de Seguridad en Cassandra
    verBitacoraSeguridad: async (req, res) => {
        try {
            const auditoriaApiUrl = process.env.AUDITORIA_API_URL || 'https://museoatrium-auditoria.onrender.com';
            
            const login_usuario = req.query.login_usuario ? String(req.query.login_usuario).trim() : 'frantest';
            const desde = req.query.desde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            const hasta = req.query.hasta || new Date().toISOString().split('T')[0];

            let logs = [];
            try {
                const response = await axios.get(`${auditoriaApiUrl}/seguridad/logs`, {
                    params: {
                        login_usuario,
                        desde: new Date(desde).toISOString(),
                        hasta: new Date(hasta + 'T23:59:59Z').toISOString()
                    }
                });
                logs = response.data || [];
            } catch (errApi) {
                console.error('Error al recuperar bitácora de Cassandra:', errApi.message);
            }

            res.render('admin/bitacora-seguridad', {
                logs,
                login_usuario,
                desde,
                hasta
            });
        } catch (error) {
            console.error('Error en verBitacoraSeguridad:', error);
            res.status(500).send('Error interno del servidor.');
        }
    },

    // Reporte de Auditoría Fiscal en Cassandra
    verAuditoriaReportes: async (req, res) => {
        try {
            const auditoriaApiUrl = process.env.AUDITORIA_API_URL || 'https://museoatrium-auditoria.onrender.com';
            
            const anio = parseInt(req.query.anio || new Date().getFullYear());
            const mes = parseInt(req.query.mes || (new Date().getMonth() + 1));

            let facturas = [];
            let membresias = [];

            try {
                const [resFacturas, resMembresias] = await Promise.all([
                    axios.get(`${auditoriaApiUrl}/reportes/facturacion`, { params: { anio, mes } }).catch(() => ({ data: [] })),
                    axios.get(`${auditoriaApiUrl}/reportes/membresias`, { params: { anio, mes } }).catch(() => ({ data: [] }))
                ]);

                facturas = resFacturas.data || [];
                membresias = resMembresias.data || [];
            } catch (errApi) {
                console.error('Error recuperando auditoría fiscal de Cassandra:', errApi.message);
            }

            res.render('admin/auditoria-reportes', {
                facturas,
                membresias,
                anio,
                mes
            });
        } catch (error) {
            console.error('Error en verAuditoriaReportes:', error);
            res.status(500).send('Error interno del servidor.');
        }
    },

    verDocumentacion: (req, res) => {
        try {
            res.render('admin/documentacion');
        } catch (error) {
            console.error('Error al cargar la documentación:', error);
            res.status(500).send('Error interno al cargar la documentación');
        }
    },

    verAuditoriaMembresias: async (req, res) => {
        try {
            const auditoriaApiUrl = process.env.AUDITORIA_API_URL || 'https://museoatrium-auditoria.onrender.com';
            
            const id_comprador = req.query.id_comprador ? parseInt(req.query.id_comprador) : 26;
            const paging_state = req.query.paging_state || '';

            let codigos = [];
            let next_paging_state = null;

            try {
                const response = await axios.get(`${auditoriaApiUrl}/membresias/codigos`, {
                    params: {
                        id_comprador,
                        page_size: 20,
                        paging_state: paging_state || undefined
                    }
                });
                codigos = response.data.datos || [];
                next_paging_state = response.data.paging_state || null;
            } catch (errApi) {
                console.error('Error al recuperar códigos de membresía de Cassandra:', errApi.message);
            }

            res.render('admin/auditoria-membresias', {
                codigos,
                id_comprador,
                paging_state: next_paging_state
            });
        } catch (error) {
            console.error('Error en verAuditoriaMembresias:', error);
            res.status(500).send('Error interno del servidor.');
        }
    },

    // Gestión de Categorías/Disciplinas NoSQL (Corregido 'genero' singular)
    gestionCategorias: async (req, res) => {
        try {
            const [categorias] = await db.execute("SELECT Id, nombre FROM genero ORDER BY nombre ASC");
            res.render('admin/gestion-categorias', { categorias });
        } catch (error) {
            console.error(error);
            res.status(500).send("Error al cargar categorías");
        }
    },

    // Guardar Categoría Dinámica Polimórfica (Con validación preventiva de duplicados)
    guardarCategoria: async (req, res) => {
        try {
            const { nombre, detallesNombres, detallesTipos } = req.body;
            const nombreNormalizado = nombre.trim();

            // 1. Validación preventiva: Verificar si el género ya existe en PostgreSQL (ignora mayúsculas/minúsculas)
            const [existe] = await db.execute(
                "SELECT Id FROM genero WHERE LOWER(nombre) = LOWER(?) LIMIT 1", 
                [nombreNormalizado]
            );

            if (existe.length > 0) {
                // Recuperar categorías actuales para recargar la vista con el mensaje de error
                const [categorias] = await db.execute("SELECT Id, nombre FROM genero ORDER BY nombre ASC");
                return res.render('admin/gestion-categorias', { 
                    categorias, 
                    error: `El género "${nombreNormalizado}" ya se encuentra registrado en el sistema.` 
                });
            }

            // 2. Guardar la categoría en PostgreSQL si no está duplicada
            const [result] = await db.execute("INSERT INTO genero (nombre) VALUES (?)", [nombreNormalizado]);
            const nuevoId = result.insertId;

            // 3. Construir el diccionario de metadatos de tipos de datos NoSQL
            const detallesDict = {};
            if (detallesNombres && detallesTipos) {
                const nombresArray = Array.isArray(detallesNombres) ? detallesNombres : [detallesNombres];
                const tiposArray = Array.isArray(detallesTipos) ? detallesTipos : [detallesTipos];

                for (let i = 0; i < nombresArray.length; i++) {
                    const campoNombre = nombresArray[i].trim().toLowerCase().replace(/\s+/g, '_');
                    const campoTipo = tiposArray[i]; // String, Integer, Decimal, Boolean
                    if (campoNombre) {
                        detallesDict[campoNombre] = campoTipo;
                    }
                }
            }

            // 4. Sincronizar con el catálogo de MongoDB
            await MongoSyncService.syncCategoria({
                id_sql: nuevoId,
                nombre_categoria: nombreNormalizado,
                detalles: detallesDict
            });

            // 4b. Sincronizar con Neo4j
            res.redirect('/admin/categorias?success=Categoría guardada con éxito');
        } catch (error) {
            console.error("Error al guardar categoría:", error);
            res.status(500).send("Error interno al procesar la categoría polimórfica");
        }
    },

    obtenerEspecificacionesCategoria: async (req, res) => {
        try {
            const id = req.params.id;
            const MONGO_API_URL = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';
            const response = await axios.get(`${MONGO_API_URL}/category/${id}`);
            res.json(response.data);
        } catch (error) {
            res.status(500).json({ error: "No se pudo recuperar la especificación de la categoría" });
        }
    },

    // 2. GESTION DE OBRAS
    gestionObras: async (req, res) => {
        try {
            const generos = await ObraModel.obtenerGeneros();
            const artistas = await ArtistaModel.listarActivos(); 
            res.render('admin/gestion-obras', { generos, artistas });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar formulario de obras');
        }
    },

    // GUARDAR OBRA (Transaccional Políglota con Inserciones de Especialización SQL)
    guardarObra: async (req, res) => {
        const client = await db.connect(); // Adquirir cliente aislado para la transacción relacional
        try {
            // 1. Subir imagen a Supabase (operación externa inicial de red)
            const foto = req.file ? await subirImagenASupabase(req.file, 'obras') : null;

            if (req.body.obra_id) {
                // Flujo de actualización (se mantiene síncrono estándar)
                const fotoFinal = foto || req.body.foto_actual;
                const actualizada = await ObraModel.actualizar(req.body.obra_id, req.body, fotoFinal);
                if (!actualizada) {
                    return res.status(404).send('Obra no encontrada');
                }
                
                req.body.foto = fotoFinal;
                await MongoSyncService.syncObra(req.body, true);

                return res.redirect('/admin/inventario');
            } else {
                // 2. INICIAR TRANSACCIÓN EN POSTGRESQL (Para garantizar atomicidad)
                await client.query('BEGIN');

                // Recolectar propiedades dinámicas de los detalles que no son campos del modelo base
                const detalles = {};
                const baseKeys = ['genero_id', 'autor_id', 'nombre', 'precioObra', 'porcentajeGanancia', 'foto', 'obra_id', 'foto_actual'];
                Object.keys(req.body).forEach(key => {
                    if (!baseKeys.includes(key)) {
                        detalles[key] = String(req.body[key]).trim();
                    }
                });

                const sqlObra = `INSERT INTO obra
                    (genero_id, autor_id, nombre, fechaCreacion, precioObra, porcentajeGanancia, estatus, foto, detalles)
                    VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, 'Disponible', $6, $7) RETURNING id`;
                
                const resObra = await client.query(sqlObra, [
                    parseInt(req.body.genero_id, 10),
                    parseInt(req.body.autor_id, 10),
                    req.body.nombre,
                    parseFloat(req.body.precioObra),
                    parseFloat(req.body.porcentajeGanancia),
                    foto,
                    JSON.stringify(detalles)
                ]);

                const nuevaObraId = resObra.rows[0].id;
                req.body.id = nuevaObraId;
                req.body.foto = foto;
                req.body.detalles = detalles;

                // 3. INSERCIÓN DE ESPECIALIZACIÓN EN LAS TABLAS HIJAS RELACIONALES (SQL - Legado)
                const generoId = parseInt(req.body.genero_id, 10);

                if (generoId === 1) { // Pintura
                    await client.query('INSERT INTO pintura (obra_id, tecnica, soporte) VALUES ($1, $2, $3)', [
                        nuevaObraId, req.body.tecnica, req.body.soporte
                    ]);
                } 
                else if (generoId === 2) { // Escultura
                    await client.query('INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES ($1, $2, $3, $4, $5, $6)', [
                        nuevaObraId,
                        req.body.material,
                        parseFloat(req.body.peso || 0),
                        parseFloat(req.body.largo || 0),
                        parseFloat(req.body.ancho || 0),
                        parseFloat(req.body.profundidad || 0)
                    ]);
                } 
                else if (generoId === 3) { // Fotografia
                    await client.query('INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES ($1, $2, $3, $4)', [
                        nuevaObraId, req.body.tipo_foto, req.body.papel, req.body.formato
                    ]);
                } 
                else if (generoId === 4) { // Ceramica
                    await client.query('INSERT INTO ceramica (obra_id, tipoArcilla, temperaturaCoccion, tipoEsmalte) VALUES ($1, $2, $3, $4)', [
                        nuevaObraId, req.body.tipoArcilla, parseFloat(req.body.temperaturaCoccion || 0), req.body.tipoEsmalte
                    ]);
                } 
                else if (generoId === 5) { // Orfebreria
                    await client.query('INSERT INTO orfebreria (obra_id, metal, pureza, piedraPreciosa) VALUES ($1, $2, $3, $4)', [
                        nuevaObraId, req.body.metal, parseFloat(req.body.pureza || 0), parseInt(req.body.piedraPreciosa || 0, 10)
                    ]);
                }

                // 4. SINCRONIZACIÓN SÍNCRONA CON MONGODB
                try {
                    await MongoSyncService.syncObra(req.body, false);
                } catch (mongoErr) {
                    throw new Error(`Sincronización NoSQL (MongoDB) fallida: ${mongoErr.message}`);
                }

                // 5. SINCRONIZACIÓN SÍNCRONA CON NEO4J
                try {
                    await Neo4jSyncService.syncObra(req.body);
                } catch (neoErr) {
                    // Revertir de MongoDB si Neo4j falla para mantener la consistencia
                    await MongoSyncService.deleteObra(nuevaObraId).catch(() => {});
                    throw new Error(`Sincronización NoSQL (Neo4j) fallida: ${neoErr.message}`);
                }

                // 6. Si todo el flujo fue exitoso, confirmamos la transacción relacional
                await client.query('COMMIT');
                res.redirect('/admin/inventario');
            }
        } catch (error) {
            // Revertir toda la transacción relacional en caso de cualquier fallo en la red NoSQL
            await client.query('ROLLBACK');
            console.error("❌ Transacción Políglota Fallida:", error.message);
            res.status(500).send(`Error al guardar la obra en el ecosistema: ${error.message}`);
        } finally {
            client.release(); // Liberar el cliente de vuelta al pool
        }
    },

    inventarioObras: async (req, res) => {
        try {
            const obras = await ObraModel.obtenerInventario();
            res.render('admin/inventario', { obras });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar inventario');
        }
    },

    reservasObras: async (req, res) => {
        try {
            const [reservadas, generos] = await Promise.all([
                ObraModel.obtenerReservadas(),
                ObraModel.obtenerGeneros()
            ]);
            res.render('admin/reservas', { obras: reservadas || [], generos: generos || [] });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar reservas');
        }
    },

    rechazarReserva: async (req, res) => {
        try {
            const actualizado = await ObraModel.marcarComoDisponible(req.params.id);
            if (!actualizado) {
                return res.redirect('/admin/reservas?error=La+obra+no+se+encuentra+reservada');
            }

            const obraCompleta = await ObraModel.obtenerPorId(req.params.id);
            if (obraCompleta) await MongoSyncService.syncObra(obraCompleta, true);

            res.redirect('/admin/reservas');
        } catch (error) {
            console.error(error);
            res.redirect('/admin/reservas?error=Error+al+rechazar+la+reserva');
        }
    },

    aceptarReserva: async (req, res) => {
        try {
            const obra = await ObraModel.obtenerPorId(req.params.id);
            if (!obra || obra.estatus !== 'Reservada' || !obra.reservado_por) {
                return res.status(404).send('Reserva no encontrada');
            }
            res.redirect(`/admin/facturar/${obra.id}`);
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al aceptar la reserva');
        }
    },

    editarObraForm: async (req, res) => {
        try {
            const obra = await ObraModel.obtenerPorId(req.params.id);
            if (!obra) {
                return res.redirect('/admin/inventario');
            }

            const [generos, artistas] = await Promise.all([
                ObraModel.obtenerGeneros(),
                ArtistaModel.listar()
            ]);

            res.render('admin/editar-obra', { obra, generos, artistas });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar la obra');
        }
    },

    actualizarObra: async (req, res) => {
        try {
            const foto = req.file ? req.file.filename : null;
            const actualizada = await ObraModel.actualizar(req.params.id, req.body, foto);

            if (!actualizada) {
                return res.status(404).send('Obra no encontrada');
            }

            req.body.obra_id = req.params.id;
            if (foto) req.body.foto = foto;
            else req.body.foto = req.body.foto_actual;
            await MongoSyncService.syncObra(req.body, true);

            res.redirect('/admin/inventario');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al actualizar la obra');
        }
    },

    eliminarObra: async (req, res) => {
        try {
            const eliminada = await ObraModel.eliminar(req.params.id);
            if (!eliminada) {
                return res.status(404).send('Obra no encontrada');
            }

            await MongoSyncService.deleteObra(req.params.id);

            res.redirect('/admin/inventario');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al eliminar la obra');
        }
    },

    // 3. GESTION DE ARTISTAS
    gestionArtistas: async (req, res) => {
        try {
            const artistas = await ArtistaModel.listar();
            res.render('admin/gestion-artistas', { artistas });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar artistas');
        }
    },

    guardarArtista: async (req, res) => {
        try {
            const { nombre, apellido } = req.body;
            
            const duplicado = await ArtistaModel.existeNombreCompleto(nombre, apellido);
            
            if (duplicado) {
                return res.send("<script>alert('Error: Ya existe un artista registrado con ese nombre y apellido.'); window.location.href='/admin/gestion-artistas';</script>");
            }

            const foto = req.file ? await subirImagenASupabase(req.file, 'artistas') : null;
            const nuevoArtistaId = await ArtistaModel.crear(req.body, foto);

            req.body.id = nuevoArtistaId;
            req.body.foto = foto;
            
            setImmediate(() => {
                MongoSyncService.syncArtista(req.body, false).catch(err => {
                    console.error("❌ Falló la sincronización asíncrona de artista en MongoDB:", err.message);
                });
                Neo4jSyncService.syncArtista(req.body).catch(err => {
                    console.error("❌ Falló la sincronización asíncrona de artista en Neo4j:", err.message);
                });
            });

            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al guardar artista');
        }
    },

    editarArtista: async (req, res) => {
        try {
            const artista = await ArtistaModel.obtenerPorId(req.params.id);
            if (!artista) return res.redirect('/admin/gestion-artistas');
            
            res.render('admin/editar-artista', { artista });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar edición');
        }
    },

    actualizarArtista: async (req, res) => {
        try {
            const id = req.params.id;
            const foto = req.file ? await subirImagenASupabase(req.file, 'artistas') : null;
            await ArtistaModel.actualizar(id, req.body, foto);

            req.body.id = id;
            if (foto) req.body.foto = foto;
            else req.body.foto = req.body.foto_actual;
            
            setImmediate(() => {
                MongoSyncService.syncArtista(req.body, true).catch(err => {
                    console.error("❌ Falló la sincronización asíncrona de artista en MongoDB:", err.message);
                });
            });

            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al actualizar artista');
        }
    },

    activarArtista: async (req, res) => {
        try {
            await ArtistaModel.activarLogico(req.params.id);
            
            const artista = await ArtistaModel.obtenerPorId(req.params.id);
            if(artista) await MongoSyncService.syncArtista(artista, true);

            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al activar el artista');
        }
    },

    eliminarArtista: async (req, res) => {
        try {
            await ArtistaModel.eliminarLogico(req.params.id);

            const artista = await ArtistaModel.obtenerPorId(req.params.id);
            if(artista) {
                artista.estado_activo = false;
                await MongoSyncService.syncArtista(artista, true);
            }

            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al desactivar el artista');
        }
    },

    pantallaFactura: async (req, res) => {
        try {
            const obra = await ObraModel.obtenerPorId(req.params.id);
            if (!obra || obra.estatus !== 'Reservada' || !obra.reservado_por) {
                return res.status(404).send('Reserva no encontrada');
            }

            const comprador = await UsuarioModel.buscarPorId(obra.reservado_por);
            if (!comprador) {
                return res.status(404).send('Comprador no encontrado');
            }

            const infoComprador = await InfoCompradorModel.obtenerPorCompradorId(obra.reservado_por);

            res.render('admin/modulo-facturacion', { obra, comprador, infoComprador });
        } catch (error) {
            console.error(error);
            res.status(500).send("Error al cargar datos de facturación");
        }
    },

    emitirFactura: async (req, res) => {
        try {
            const {
                obra_id, precioObra, porcentajeGanancia, comprador_id,
                empresaEnvio, pais, estado, ciudad, municipio, calle
            } = req.body;

            const admin_id = req.session?.usuario?.id;
            if (!admin_id) return res.status(401).send('Sesión no válida o expirada');

            const compradorIdStr = String(comprador_id || '').trim();
            if (!compradorIdStr) return res.status(400).send('Comprador inválido');

            const obraObj = await ObraModel.obtenerPorId(obra_id);
            const estatus = String(obraObj?.estatus || '').trim().toLowerCase();
            const reservadoPor = obraObj?.reservado_por == null ? '' : String(obraObj.reservado_por).trim();
            if (!obraObj || estatus !== 'reservada' || reservadoPor !== compradorIdStr) {
                return res.status(400).send('Reserva inválida');
            }

            const precioBase = parseFloat(precioObra);
            const porc = parseFloat(porcentajeGanancia);
            const iva = precioBase * 0.16;
            const ganancia = precioBase * (porc / 100);
            const total = precioBase + iva + ganancia;
            const codigo = "FAC-" + Date.now();

            const direccion = {
                pais: (pais || 'Venezuela').trim(),
                estado_residencia: (estado || 'Pendiente').trim(),
                ciudad: (ciudad || 'Pendiente').trim(),
                municipio: (municipio || 'Pendiente').trim(),
                calle: (calle || 'Pendiente').trim()
            };

            await InfoCompradorModel.actualizarDireccion(comprador_id, direccion);

            await VentaModel.crear({
                comprador_id, admin_id, obra_id,
                pais: direccion.pais,
                estado: direccion.estado_residencia,
                ciudad: direccion.ciudad,
                municipio: direccion.municipio,
                calle: direccion.calle,
                empresaEnvio: empresaEnvio || 'Pendiente',
                iva, gananciaDolar: ganancia, gananciaPorc: porc,
                precioFinal: total, codigo
            });

            await ObraModel.marcarComoVendida(obra_id);
            console.log("🟢 [DEBUG] Obra marcada como vendida en SQL");


            // Operaciones asíncronas liberadas del hilo principal
            setImmediate(async () => {
                const obraCompletaSync = await ObraModel.obtenerPorId(obra_id);
                if (obraCompletaSync) MongoSyncService.syncObra(obraCompletaSync, true).catch(() => {});
                 console.log("✅ [DEBUG] Sincronización exitosa con MongoDB.");
                Neo4jSyncService.syncCompra(comprador_id, obra_id, total).catch(() => {});

                enviarAuditoria('/obras/historico', {
                    id_obra: parseInt(obra_id),
                    estatus_anterior: 'Reservada',
                    estatus_nuevo: 'Vendida',
                    usuario_id: admin_id,
                    ip_origen: req.ip || '127.0.0.1',
                    fecha_evento: new Date().toISOString()
                }).catch(() => {});

                enviarAuditoria('/reportes/facturacion', {
                    anio: new Date().getFullYear(),
                    mes: new Date().getMonth() + 1,
                    id_factura: parseInt(codigo.split('-')[1].slice(-8)) || Math.floor(Math.random() * 100000),
                    fecha_emision: new Date().toISOString(),
                    id_comprador: parseInt(comprador_id),
                    monto_neto: precioBase.toFixed(2),
                    iva_calculado: iva.toFixed(2),
                    ganancia_museo: ganancia.toFixed(2),
                    estado: "PAGADA"
                }).catch(() => {});

                try {
                    const facturaData = await VentaModel.obtenerFacturaPorCodigo(codigo);
                    const compradorData = await UsuarioModel.buscarPorId(comprador_id);

                    if (compradorData && compradorData.gmail) {
                        await sendReservaAceptada(compradorData.gmail, facturaData, codigo);
                        console.log("✅ [EMAIL] Factura enviada a:", compradorData.gmail);
                    }
                } catch (errEmail) {
                    console.error('❌ Error enviando factura por email:', errEmail.message);
                }
            });

            res.redirect('/admin/reportes-ventas');

        } catch (error) {
            console.error('Error al facturar:', error);
            res.status(500).send("Error al procesar la venta");
        }
    },

    // 5. REPORTES
    reporteVentas: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const ventas = await VentaModel.obtenerVentasPorPeriodo(fechaInicio, fechaFin);
            const resumen = await VentaModel.obtenerResumenFinanciero(fechaInicio, fechaFin);

            res.render('admin/reportes-ventas', {
                reporte: resumen || { totalRecaudado: 0, totalGanancia: 0 },
                ventas: ventas || [],
                filtros: { fechaInicio: fechaInicio || '', fechaFin: fechaFin || '' }
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Error al generar reporte de ventas");
        }
    },

    obrasVendidas: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const [obrasVendidas, generos] = await Promise.all([
                VentaModel.obtenerObrasVendidasPorPeriodo(fechaInicio, fechaFin),
                ObraModel.obtenerGeneros()
            ]);

            res.render('admin/obras-vendidas', {
                obras: obrasVendidas || [],
                generos: generos || [],
                filtros: { fechaInicio: fechaInicio || '', fechaFin: fechaFin || '' }
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar obras vendidas');
        }
    },

    facturasListado: async (req, res) => {
        try {
            const { fechaInicio, fechaFin, nombre } = req.query;
            const facturas = await VentaModel.listarFacturas({ fechaInicio, fechaFin, nombre });
            const agrupadas = new Map();

            (facturas || []).forEach((factura) => {
                const idKey = factura.comprador_id ? String(factura.comprador_id) : null;
                const nameKey = `${factura.nombre_comprador || ''}-${factura.apellido_comprador || ''}`;
                const groupKey = idKey || nameKey;

                if (!agrupadas.has(groupKey)) {
                    agrupadas.set(groupKey, {
                        comprador: `${factura.nombre_comprador || ''} ${factura.apellido_comprador || ''}`.trim(),
                        facturas: []
                    });
                }

                agrupadas.get(groupKey).facturas.push(factura);
            });

            res.render('admin/facturas', {
                grupos: Array.from(agrupadas.values()),
                filtros: {
                    fechaInicio: fechaInicio || '',
                    fechaFin: fechaFin || '',
                    nombre: nombre || ''
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar facturas');
        }
    },

    facturaDetalle: async (req, res) => {
        try {
            const factura = await VentaModel.obtenerFacturaPorId(req.params.id);
            if (!factura) {
                return res.status(404).send('Factura no encontrada');
            }

            res.render('admin/factura-detalle', { factura, fotoPDF: '' });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar la factura');
        }
    },

    reporteMembresias: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const membresias = await InfoCompradorModel.obtenerReportePorPeriodo(fechaInicio, fechaFin);

            res.render('admin/reportes-membresia', {
                membresias,
                filtros: { fechaInicio: fechaInicio || '', fechaFin: fechaFin || '' }
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al generar reporte de membresías');
        }
    },

    mostrarCrearAdmin: (req, res) => {
        res.render('admin/crear-admin', { error: null }); 
    },

    procesarCrearAdmin: async (req, res) => {
        try {
            const { nombre, apellido, cedula, gmail, login, password } = req.body;

            const existeLogin = await UsuarioModel.buscarPorLogin(login);
            if (existeLogin) {
                return res.render('admin/crear-admin', { error: 'El Login ya está en uso' });
            }

            const existeEmail = await UsuarioModel.buscarPorEmail(gmail);
            if (existeEmail) {
                return res.render('admin/crear-admin', { error: 'El Correo ya está registrado en otra cuenta' });
            }

            const passwordEncriptado = await bcrypt.hash(password, 10);
            const datosUsuario = { nombre, apellido, cedula, gmail, login, password: passwordEncriptado };
            await UsuarioModel.crear(datosUsuario, 1);
            res.redirect('/admin/dashboard?success=Nuevo Administrador creado con éxito');

        } catch (error) {
            console.error('Error al crear admin:', error);
            res.render('admin/crear-admin', { error: 'Error interno del servidor.' });
        }
    },

    verificarAccesoPanel: (req, res, next) => {
        const rol = req.session.usuario?.rol;
        if (rol === 1 || rol === 3) {
            return next();
        }
        res.redirect('/auth/login?error=Acceso denegado. Se requieren permisos de administrador.');
    },

    verificarSuperAdmin: (req, res, next) => {
        if (req.session.usuario && req.session.usuario.rol === 3) {
            return next();
        }
        res.redirect('/admin/dashboard?error=Access restricted: Only Super Administrators can create new accounts.');
    },

    listarAdmins: async (req, res) => {
        try {
            if (req.session.usuario.rol !== 3) {
                return res.redirect('/galeria?error=No tienes permisos para ver esta lista');
            }

            const admins = await UsuarioModel.obtenerTodosLosAdmins();
            
            res.render('admin/lista-admins', { 
                admins, 
                mensaje: req.query.success || null,
                error: req.query.error || null
            });
        } catch (error) {
            console.error(error);
            res.redirect('/admin/dashboard?error=Error al cargar la lista de administradores');
        }
    },


    mostrarEditarAdmin: async (req, res) => {
        try {
            const idParaEditar = req.params.id;
            const adminData = await UsuarioModel.obtenerPerfilCompleto(idParaEditar);

            if (!adminData) {
                return res.redirect('/admin/lista-admins?error=Administrador no encontrado');
            }

            res.render('admin/editar-admin', { 
                admin: adminData, 
                mensaje: null, 
                error: null 
            });
        } catch (error) {
            console.error(error);
            res.redirect('/admin/lista-admins?error=Error al cargar datos');
        }
    },

    actualizarAdmin: async (req, res) => {
        const idParaEditar = req.params.id;
        const { nombre, apellido, gmail, login, rol_id } = req.body;

        try {
            const datosActualizados = { nombre, apellido, gmail, login, rol_id };
            await UsuarioModel.actualizarDesdeAdmin(idParaEditar, datosActualizados);
            res.redirect('/admin/lista-admins?success=Administrador actualizado correctamente');
        } catch (error) {
            console.error(error);
            const adminData = await UsuarioModel.obtenerPerfilCompleto(idParaEditar);
            res.render('admin/editar-admin', { 
                admin: adminData, 
                mensaje: null, 
                error: 'Error al actualizar. El correo o usuario podrían estar duplicados.' 
            });
        }    
    },

    exportarVentasExcel: async (req, res) => {
        try {
            const ventas = await VentaModel.obtenerVentasPorPeriodo();

            const datosFormateados = ventas.map(v => ({
                "Factura": v.codigoDeFactura,
                "Fecha": new Date(v.fechaDeVenta).toLocaleDateString(),
                "Obra": v.nombre_obra,
                "Comprador": `${v.nombre_comprador} ${v.nombre_apellido}`,
                "Precio Base": v.precioFinalVenta - v.iva - v.gananciaMuseoDolares,
                "IVA (16%)": v.iva,
                "Comision Museo": v.gananciaMuseoDolares,
                "Total Final": v.precioFinalVenta
            }));

            const json2csvParser = new Parser();
            const csv = json2csvParser.parse(datosFormateados);

            res.header('Content-Type', 'text/csv');
            res.attachment(`Reporte_Ventas_Atrium_${Date.now()}.csv`);
            return res.send(csv);

        } catch (error) {
            console.error(error);
            res.status(500).send("Error al exportar datos");
        }
    },

    // Método para procesar y retornar la biografía generada por la IA (Groq - Llama-3)
    generarBiografiaArtista: async (req, res) => {
        try {
            const { nombre, apellido, nacionalidad } = req.body;
            
            // Log de entrada
            console.log(`\n🧠 [IA REQUEST ACTIVO]: Analizando existencia de "${nombre} ${apellido || ''}"`);

            const apiKey = process.env.GROQ_API_KEY;
            if (!apiKey) {
                console.error("❌ [IA ERROR]: GROQ_API_KEY no se encuentra definida en el archivo .env");
                return res.status(500).json({ success: false, error: "Falta la API KEY de Groq" });
            }

            const prompt = `
                Analiza al artista plástico, creador visual, pintor, ilustrador o animador: "${nombre} ${apellido || ''}". 
                Nacionalidad sugerida: "${nacionalidad || 'desconocida'}".
                
                TU MISIÓN:
                1. Determina si este creador realmente existe o existió históricamente. Incluye directores de animación, cineastas, ilustradores, diseñadores gráficos/conceptuales, escultores o pintores (como Hayao Miyazaki, Walt Disney, Akira Toriyama, Pablo Picasso, Vincent van Gogh, etc.) como artistas reales (es decir, existe: true).
                2. Si el artista/creador es real (EXISTE):
                   - "existe": true
                   - "nacionalidad": Su nacionalidad real (ej: "Japonesa", "Española", "Venezolana").
                   - "fechaNac": Su fecha de nacimiento real en formato estricto "YYYY-MM-DD".
                   - "fechaFal": Su fecha de fallecimiento real en formato "YYYY-MM-DD" (si aplica) o null (si sigue vivo).
                   - "biografia": Una biografía artística profesional de tres párrafos cortos.
                3. Si el artista es completamente ficticio o inventado por el usuario:
                   - "existe": false
                   - "nacionalidad": Su nacionalidad sugerida o una estimada de forma lógica.
                   - "fechaNac": null
                   - "fechaFal": null
                   - "biografia": Una biografía ficticia elegante, creativa y verosímil de tres párrafos cortos para una galería de arte contemporáneo.

                REGLA DE FORMATO OBLIGATORIA (ESTRICTA):
                Devuelve únicamente un objeto JSON plano, sin bloques de código markdown (\`\`\`json), sin textos introductorios ni explicaciones.
                
                EJEMPLO DE RESPUESTA ESPERADA:
                {
                    "existe": true,
                    "fechaNac": "1941-01-05",
                    "fechaFal": null,
                    "nacionalidad": "Japonesa",
                    "biografia": "Biografía redactada..."
                }
            `;

            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: "Eres un historiador de arte contemporáneo de la galería del Museo Atrium." },
                    { role: "user", content: prompt }
                ],
                temperature: 0.1
            }, { headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' } });

            const rawContent = response.data.choices[0].message.content.trim();
            
            // Log de la respuesta del servicio de Groq
            console.log("🤖 [IA RAW RESPONSE]:", rawContent);

            const cleanJson = rawContent.replace(/```json|```/g, '').trim();
            const profile = JSON.parse(cleanJson);
            
            console.log("📦 [IA PARSED PROFILE]:", profile);

            // Retornamos el objeto structured 'profile' esperado por el frontend
            res.json({ success: true, profile });
        } catch (error) {
            console.error("❌ [IA ERROR EXCEPTION]:", error.message);
            res.status(500).json({ success: false, error: "No se pudo procesar la biografía con la IA." });
        }
    },

    pantallaNLPQuery: async (req, res) => {
        res.render('admin/nlp-query', {
            query: null,
            results: null,
            error: null,
            cypher: null,
            intent: null
        });
    },

    procesarNLPQuery: async (req, res) => {
        const text = req.body.text ? String(req.body.text).trim() : '';
        if (!text) {
            return res.render('admin/nlp-query', {
                query: '',
                results: null,
                error: 'La consulta no puede estar vacía.',
                cypher: null,
                intent: null
            });
        }

        const NEO4J_API_URL = process.env.NEO4J_API_URL || 'http://localhost:8000';

        try {
            const response = await axios.post(`${NEO4J_API_URL}/api/v1/graph/nlp-query`, { text });
            const resultData = response.data;

            if (resultData && resultData.success) {
                const data = resultData.data;
                res.render('admin/nlp-query', {
                    query: text,
                    results: data.results,
                    cypher: data.query,
                    intent: data.intent,
                    error: null
                });
            } else {
                res.render('admin/nlp-query', {
                    query: text,
                    results: null,
                    cypher: null,
                    intent: null,
                    error: resultData.message || 'No se pudo interpretar la consulta.'
                });
            }
        } catch (error) {
            console.error('[NLP Query Error]:', error.response?.data || error.message);
            res.render('admin/nlp-query', {
                query: text,
                results: null,
                cypher: null,
                intent: null,
                error: error.response?.data?.detail || 'Error de conexión con el microservicio NLP.'
            });
        }
    }

};

module.exports = AdminController;