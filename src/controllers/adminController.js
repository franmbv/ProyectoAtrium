//const db = require('../config/db');
const db = require('../config/db');
const ObraModel = require('../models/ObraModel');
const VentaModel = require('../models/ventaModel');
const ArtistaModel = require('../models/ArtistaModel');
const InfoCompradorModel = require('../models/InfoCompradorModel');
const MongoSyncService = require('../services/MongoSyncService');

const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/UsuarioModel');
const { sendReservaAceptada } = require('../config/mailer');
const { enviarAuditoria } = require('../config/auditoria');

// LIBRERÍAS PARA EL PDF
const puppeteer = require('puppeteer-core');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');


//Librerias de Excel
const { Parser } = require('json2csv');

// Importar Axios en caso de que no esté definido al inicio del archivo
const axios = require('axios'); 


// Inicializar el cliente oficial de Supabase consumiendo las variables del .env
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
    process.env.SUPABASE_URL, 
    process.env.SUPABASE_KEY
);

const AdminController = {

    // 1. DASHBOARD PRINCIPAL
   dashboard: async (req, res) => {
        try {
            // Asegúrate de que Promise.all reciba y asigne las 6 variables
            const [totalObras, recaudado, gananciaMuseo, membresias, statsGeneros, statsEstatus] = await Promise.all([
                ObraModel.contarInventarioActivo(),
                VentaModel.totalRecaudado(),
                VentaModel.totalGananciaMuseo(),
                InfoCompradorModel.contarActivas(),
                ObraModel.obtenerEstadisticasGeneros(), // Variable statsGeneros
                ObraModel.obtenerEstadisticasEstatus()  // Variable statsEstatus
            ]);

            res.render('admin/dashboard', {
                stats: { totalObras, recaudado, gananciaMuseo, membresias },
                charts: { generos: statsGeneros, estatus: statsEstatus }, // Ahora sí existen
                errorMsg: null
            });
        } catch (error) {
            console.error('Error en Dashboard:', error);
            // En caso de error, pasamos arrays vacíos para que no falle la vista
            res.render('admin/dashboard', {
                stats: { totalObras: 0, recaudado: 0, gananciaMuseo: 0, membresias: 0 },
                charts: { generos: [], estatus: [] },
                errorMsg: 'Error de conexión con la base de datos.'
            });
        }
    },

 // NUEVO: Ver Historial de Obra en Cassandra
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
                // Manejar de manera segura si la API no tiene registros o devuelve un error (ej. 404)
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
// ... (dentro de AdminController en src/controllers/adminController.js)

    // Controlador para consultar la Bitácora de Seguridad en Cassandra
    verBitacoraSeguridad: async (req, res) => {
        try {
            const auditoriaApiUrl = process.env.AUDITORIA_API_URL || 'https://museoatrium-auditoria.onrender.com';
            
            // Parámetros por defecto para evitar campos vacíos
            const login_usuario = req.query.login_usuario ? String(req.query.login_usuario).trim() : 'frantest';
            const desde = req.query.desde || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]; // Hace 30 días
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

    // Controlador para consultar el Reporte de Auditoría Fiscal en Cassandra
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

    // Agregar dentro de AdminController en src/controllers/adminController.js:
verDocumentacion: (req, res) => {
    try {
        res.render('admin/documentacion');
    } catch (error) {
        console.error('Error al cargar la documentación:', error);
        res.status(500).send('Error interno al cargar la documentación');
    }
},


// Agregar dentro de AdminController en src/controllers/adminController.js:
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

    guardarObra: async (req, res) => {
        try {
            let foto = req.file ? req.file.filename : null;

            // 🔍 DEPURACIÓN: Imprimir en la terminal qué datos de archivo nos está entregando Multer
            if (req.file) {
                console.log("📂 [DEBUG Multer] Objeto req.file recibido:", {
                    fieldname: req.file.fieldname,
                    originalname: req.file.originalname,
                    mimetype: req.file.mimetype,
                    size: req.file.size,
                    hasBuffer: !!req.file.buffer,
                    hasPath: !!req.file.path,
                    path: req.file.path
                });
            }

            // --- PROCESAMIENTO SEGURO DE SUBIDA A SUPABASE ---
            if (req.file) {
                try {
                    let fileBuffer = null;

                    // Extraer los datos binarios de forma adaptativa sin lanzar excepciones
                    if (req.file.buffer) {
                        fileBuffer = req.file.buffer; // Caso MemoryStorage
                    } else if (req.file.path) {
                        fileBuffer = fs.readFileSync(req.file.path); // Caso DiskStorage
                    }

                    // Si no se encuentra ningún buffer o ruta válida, no continuar con Supabase
                    if (!fileBuffer) {
                        throw new Error("El objeto de archivo de Multer no contiene datos legibles (buffer o path).");
                    }

                    const filename = `obras/${Date.now()}-${req.file.originalname}`;

                    // Subir el recurso binario al bucket público 'atrium-images'
                    const { data, error } = await supabase.storage
                        .from('atrium-images')
                        .upload(filename, fileBuffer, {
                            contentType: req.file.mimetype,
                            duplex: 'half'
                        });

                    if (error) throw error;

                    // Obtener la URL pública del CDN de Supabase
                    const { data: publicUrlData } = supabase.storage
                        .from('atrium-images')
                        .getPublicUrl(filename);

                    foto = publicUrlData.publicUrl;

                    // Limpieza segura: eliminar el archivo del disco de Render únicamente si existe la ruta física
                    if (req.file.path && typeof req.file.path === 'string' && fs.existsSync(req.file.path)) {
                        fs.unlinkSync(req.file.path);
                    }
                    
                    console.log("🟢 Imagen de obra subida con éxito a Supabase:", foto);

                } catch (supabaseError) {
                    console.error("❌ Falló la subida a Supabase, aplicando fallback local:", supabaseError.message);
                    // Fallback: si falla Supabase, conservamos el filename local para evitar caídas
                    foto = req.file.filename;
                }
            }
            // -------------------------------------------------

            if (req.body.obra_id) {
                const actualizada = await ObraModel.actualizar(req.body.obra_id, req.body, foto);
                if (!actualizada) {
                    return res.status(404).send('Obra no encontrada');
                }
                
                // --- SYNC MONGO ---
                req.body.foto = foto || req.body.foto_actual;
                await MongoSyncService.syncObra(req.body, true);

                return res.redirect('/admin/inventario');
            }

            const nuevaObraId = await ObraModel.crear(req.body, foto);
            
            // --- SYNC MONGO ---
            req.body.id = nuevaObraId;
            req.body.foto = foto;
            await MongoSyncService.syncObra(req.body, false);

            res.redirect('/admin/gestion-obras');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al guardar la obra');
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
            const reservadas = await ObraModel.obtenerReservadas();
            res.render('admin/reservas', { obras: reservadas || [] });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar reservas');
        }
    },

    rechazarReserva: async (req, res) => {
        try {
            const actualizado = await ObraModel.marcarComoDisponible(req.params.id);
            if (!actualizado) {
                return res.status(404).send('Obra no encontrada o no reservada');
            }

            // --- SYNC MONGO ---
            const obraCompleta = await ObraModel.obtenerPorId(req.params.id);
            if (obraCompleta) await MongoSyncService.syncObra(obraCompleta, true);

            res.redirect('/admin/reservas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al rechazar la reserva');
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

            // --- SYNC MONGO ---
            req.body.obra_id = req.params.id;
            if (foto) req.body.foto = foto;
            else req.body.foto = req.body.foto_actual; // Se asume que viene del form si no hay nueva
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

            // --- SYNC MONGO ---
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

            const foto = req.file ? req.file.filename : null;
            const nuevoArtistaId = await ArtistaModel.crear(req.body, foto);

            // --- SYNC MONGO ---
            req.body.id = nuevoArtistaId;
            req.body.foto = foto;
            await MongoSyncService.syncArtista(req.body, false);

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
            const foto = req.file ? req.file.filename : null;
            
            await ArtistaModel.actualizar(id, req.body, foto);

            // --- SYNC MONGO ---
            req.body.id = id;
            if (foto) req.body.foto = foto;
            else req.body.foto = req.body.foto_actual; // si la tienes en el form
            await MongoSyncService.syncArtista(req.body, true);

            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al actualizar artista');
        }
    },

    activarArtista: async (req, res) => {
        try {
            await ArtistaModel.activarLogico(req.params.id);
            
            // --- SYNC MONGO ---
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

            // --- SYNC MONGO ---
            // El backend python permite borrarlo fisicamente, o podemos hacer update de inactivo.
            // Según tu esquema de Mongo no hay un endpoint de desactivar suave. 
            // Eliminaremos de mongo, o podemos actualizar para que no rompa si tiene obras.
            // Para ser seguros con la referencialidad, actualizamos estado.
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

    // 4. FACTURACION Y VENTAS
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

            // --- SYNC MONGO ---
            const obraCompletaSync = await ObraModel.obtenerPorId(obra_id);
            if (obraCompletaSync) await MongoSyncService.syncObra(obraCompletaSync, true);

            // --- AUDITORÍA DE OBRA EN CASSANDRA ---
            await enviarAuditoria('/obras/historico', {
                id_obra: parseInt(obra_id),
                estatus_anterior: 'Reservada',
                estatus_nuevo: 'Vendida',
                usuario_id: admin_id,
                ip_origen: req.ip || '127.0.0.1',
                fecha_evento: new Date().toISOString()
            });

            // --- AUDITORÍA DE FACTURACIÓN EN CASSANDRA ---
            const ahoraFactura = new Date();
            await enviarAuditoria('/reportes/facturacion', {
                anio: ahoraFactura.getFullYear(),
                mes: ahoraFactura.getMonth() + 1,
                id_factura: parseInt(codigo.split('-')[1].slice(-8)) || Math.floor(Math.random() * 100000),
                fecha_emision: ahoraFactura.toISOString(),
                id_comprador: parseInt(comprador_id),
                monto_neto: precioBase.toFixed(2),
                iva_calculado: iva.toFixed(2),
                ganancia_museo: ganancia.toFixed(2),
                estado: "PAGADA"
            });

            // --- LÓGICA DE GENERACIÓN DE PDF AUTOMÁTICA CON AUTO-DETECCIÓN ---
            try {
                const facturaData = await VentaModel.obtenerFacturaPorCodigo(codigo);
                const compradorData = await UsuarioModel.buscarPorId(comprador_id);

                if (compradorData && compradorData.gmail) {
                    
                    // --- PROCESAR IMAGEN PARA PDF (BASE64) ---
                    let fotoPDF = "";
                    try {
                        const imagePath = path.join(__dirname, '../../public/uploads', facturaData.foto);
                        if (fs.existsSync(imagePath)) {
                            const bitmap = fs.readFileSync(imagePath);
                            fotoPDF = `data:image/png;base64,${bitmap.toString('base64')}`;
                        }
                    } catch (e) { console.error("Error cargando imagen para PDF"); }

                    const htmlFactura = await ejs.renderFile(
                        path.join(__dirname, '../../views/admin/factura-detalle.ejs'), 
                        { factura: facturaData, fotoPDF: fotoPDF }
                    );

                    // ALGORITMO DE BÚSQUEDA DE NAVEGADORES (Windows / Linux)
                    const appData = process.env.LOCALAPPDATA;
                    const progFiles = process.env.PROGRAMFILES;
                    const progFiles86 = process.env["ProgramFiles(x86)"];

                    const commonPaths = [
                        path.join(progFiles, 'Google/Chrome/Application/chrome.exe'),
                        path.join(progFiles86, 'Google/Chrome/Application/chrome.exe'),
                        path.join(progFiles86, 'Microsoft/Edge/Application/msedge.exe'),
                        path.join(appData, 'Programs/Opera GX/opera.exe'),
                        path.join(appData, 'Programs/Opera/opera.exe'),
                        path.join(progFiles, 'BraveSoftware/Brave-Browser/Application/brave.exe'),
                        path.join(progFiles, 'Mozilla Firefox/firefox.exe'),
                        path.join(appData, 'Programs/Zen/zen.exe'),
                        '/usr/bin/google-chrome',
                        '/usr/bin/firefox'
                    ];

                    const executablePath = commonPaths.find(p => p && fs.existsSync(p));
                    if (!executablePath) throw new Error("No se detectó ningún navegador instalado.");

                    const browser = await puppeteer.launch({
                        executablePath: executablePath,
                        headless: "new",
                        args: ['--no-sandbox', '--disable-setuid-sandbox']
                    });

                    const page = await browser.newPage();
                    // Evita cuelgues por CDNs/scripts externos al generar el PDF en servidor.
                    await page.setRequestInterception(true);
                    page.on('request', (request) => {
                        const url = request.url();
                        if (url.startsWith('http://') || url.startsWith('https://')) {
                            return request.abort();
                        }
                        return request.continue();
                    });

                    await page.setContent(htmlFactura, { waitUntil: 'domcontentloaded', timeout: 60000 });
                    
                    const pdfBuffer = await page.pdf({
                        format: 'A4',
                        printBackground: true,
                        margin: { top: '0.5cm', bottom: '0.5cm', left: '0.5cm', right: '0.5cm' }
                    });

                    await browser.close();
                    await sendReservaAceptada(compradorData.gmail, obraObj.nombre, codigo, pdfBuffer);
                    console.log('✅ Factura PDF generada y enviada satisfactoriamente.');
                }
            } catch (errPdf) {
                console.error('❌ Error crítico en generación de PDF:', errPdf.message);
            }

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
            const obrasVendidas = await VentaModel.obtenerObrasVendidasPorPeriodo(fechaInicio, fechaFin);

            res.render('admin/obras-vendidas', {
                obras: obrasVendidas || [],
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
        res.redirect('/admin/dashboard?error=Acceso restringido: Solo los Superadministradores pueden crear nuevas cuentas.');
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

//NUEVO EXPORTACIÓN A EXCEL:
    exportarVentasExcel: async (req, res) => {
    try {
        // Buscamos todas las ventas (puedes reusar tu método de VentaModel)
        const ventas = await VentaModel.obtenerVentasPorPeriodo(); 

        // Formateamos los datos para que el Excel sea "humano"
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

        // Convertimos a CSV (que Excel abre automáticamente)
        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(datosFormateados);

        // Configuramos la respuesta para que el navegador lo descargue
        res.header('Content-Type', 'text/csv');
        res.attachment(`Reporte_Ventas_Atrium_${Date.now()}.csv`);
        return res.send(csv);

    } catch (error) {
        console.error(error);
        res.status(500).send("Error al exportar datos");
    }
    }

};

module.exports = AdminController;