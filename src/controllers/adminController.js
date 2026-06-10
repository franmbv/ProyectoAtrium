const db = require('../config/db');
const ObraModel = require('../models/ObraModel');
const VentaModel = require('../models/ventaModel');
const ArtistaModel = require('../models/ArtistaModel');
const InfoCompradorModel = require('../models/InfoCompradorModel');

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
            const foto = req.file ? req.file.filename : null;
            if (req.body.obra_id) {
                const actualizada = await ObraModel.actualizar(req.body.obra_id, req.body, foto);
                if (!actualizada) {
                    return res.status(404).send('Obra no encontrada');
                }
                return res.redirect('/admin/inventario');
            }

            await ObraModel.crear(req.body, foto);
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
            await ArtistaModel.crear(req.body, foto);
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
            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al actualizar artista');
        }
    },

    activarArtista: async (req, res) => {
        try {
            await ArtistaModel.activarLogico(req.params.id);
            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al activar el artista');
        }
    },

    eliminarArtista: async (req, res) => {
        try {
            await ArtistaModel.eliminarLogico(req.params.id);
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