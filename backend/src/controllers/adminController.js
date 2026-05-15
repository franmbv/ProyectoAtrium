const db = require('../config/db');
const ObraModel = require('../models/ObraModel');
const VentaModel = require('../models/ventaModel');
const ArtistaModel = require('../models/ArtistaModel');
const InfoCompradorModel = require('../models/InfoCompradorModel');
const bcrypt = require('bcryptjs');
const UsuarioModel = require('../models/UsuarioModel');
const { sendReservaAceptada } = require('../config/mailer');
const puppeteer = require('puppeteer-core');
const ejs = require('ejs');
const path = require('path');
const fs = require('fs');
const { Parser } = require('json2csv');

const AdminController = {

    // ==========================================
    // 1. DASHBOARD PRINCIPAL
    // ==========================================
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

            res.status(200).json({
                success: true,
                data: {
                    stats: { totalObras, recaudado, gananciaMuseo, membresias },
                    charts: { generos: statsGeneros, estatus: statsEstatus }
                }
            });
        } catch (error) {
            console.error('Error en Dashboard:', error);
            res.status(500).json({ success: false, message: 'Error de conexión con la base de datos.', error: error.message });
        }
    },

    // ==========================================
    // 2. GESTION DE OBRAS
    // ==========================================
    gestionObras: async (req, res) => {
        try {
            const generos = await ObraModel.obtenerGeneros();
            const artistas = await ArtistaModel.listarActivos(); 
            res.status(200).json({ success: true, data: { generos, artistas } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar datos de obras' });
        }
    },

    inventarioObras: async (req, res) => {
        try {
            const obras = await ObraModel.obtenerInventario();
            res.status(200).json({ success: true, data: obras });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar inventario' });
        }
    },

    reservasObras: async (req, res) => {
        try {
            const reservadas = await ObraModel.obtenerReservadas();
            res.status(200).json({ success: true, data: reservadas || [] });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar reservas' });
        }
    },

    rechazarReserva: async (req, res) => {
        try {
            const actualizado = await ObraModel.marcarComoDisponible(req.params.id);
            if (!actualizado) return res.status(404).json({ success: false, message: 'Obra no encontrada o no reservada' });
            res.status(200).json({ success: true, message: 'Reserva rechazada, obra disponible nuevamente' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al rechazar la reserva' });
        }
    },

    aceptarReserva: async (req, res) => {
        try {
            const obra = await ObraModel.obtenerPorId(req.params.id);
            if (!obra || obra.estatus !== 'Reservada' || !obra.reservado_por) {
                return res.status(404).json({ success: false, message: 'Reserva no encontrada o inválida' });
            }
            res.status(200).json({ success: true, message: 'Reserva aceptada', data: obra });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al aceptar la reserva' });
        }
    },

    obtenerObra: async (req, res) => {
        try {
            const obra = await ObraModel.obtenerPorId(req.params.id);
            if (!obra) return res.status(404).json({ success: false, message: 'Obra no encontrada' });
            res.status(200).json({ success: true, data: obra });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar la obra' });
        }
    },

    guardarObra: async (req, res) => {
        try {
            const foto = req.file ? req.file.filename : null;
            if (req.body.obra_id) {
                const actualizada = await ObraModel.actualizar(req.body.obra_id, req.body, foto);
                if (!actualizada) return res.status(404).json({ success: false, message: 'Obra no encontrada' });
                return res.status(200).json({ success: true, message: 'Obra actualizada correctamente' });
            }
            const nuevaObra = await ObraModel.crear(req.body, foto);
            res.status(201).json({ success: true, message: 'Obra creada exitosamente', data: nuevaObra });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al guardar la obra' });
        }
    },

    actualizarObra: async (req, res) => {
        try {
            const foto = req.file ? req.file.filename : null;
            const actualizada = await ObraModel.actualizar(req.params.id, req.body, foto);
            if (!actualizada) return res.status(404).json({ success: false, message: 'Obra no encontrada' });
            res.status(200).json({ success: true, message: 'Obra actualizada correctamente' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al actualizar la obra' });
        }
    },

    eliminarObra: async (req, res) => {
        try {
            const eliminada = await ObraModel.eliminar(req.params.id);
            if (!eliminada) return res.status(404).json({ success: false, message: 'Obra no encontrada' });
            res.status(200).json({ success: true, message: 'Obra eliminada correctamente' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al eliminar la obra' });
        }
    },

    // ==========================================
    // 3. GESTION DE ARTISTAS
    // ==========================================
    gestionArtistas: async (req, res) => {
        try {
            const artistas = await ArtistaModel.listar();
            res.status(200).json({ success: true, data: artistas });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar artistas' });
        }
    },

    obtenerArtista: async (req, res) => {
        try {
            const artista = await ArtistaModel.obtenerPorId(req.params.id);
            if (!artista) return res.status(404).json({ success: false, message: 'Artista no encontrado' });
            res.status(200).json({ success: true, data: artista });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar el artista' });
        }
    },

    guardarArtista: async (req, res) => {
        try {
            const { nombre, apellido } = req.body;
            const duplicado = await ArtistaModel.existeNombreCompleto(nombre, apellido);
            if (duplicado) return res.status(409).json({ success: false, message: 'Ya existe un artista registrado con ese nombre y apellido.' });
            
            const foto = req.file ? req.file.filename : null;
            const nuevoArtista = await ArtistaModel.crear(req.body, foto);
            res.status(201).json({ success: true, message: 'Artista creado con éxito', data: nuevoArtista });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al guardar artista' });
        }
    },

    actualizarArtista: async (req, res) => {
        try {
            const foto = req.file ? req.file.filename : null;
            await ArtistaModel.actualizar(req.params.id, req.body, foto);
            res.status(200).json({ success: true, message: 'Artista actualizado con éxito' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al actualizar artista' });
        }
    },

    activarArtista: async (req, res) => {
        try {
            await ArtistaModel.activarLogico(req.params.id);
            res.status(200).json({ success: true, message: 'Artista activado con éxito' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al activar el artista' });
        }
    },

    eliminarArtista: async (req, res) => {
        try {
            await ArtistaModel.eliminarLogico(req.params.id);
            res.status(200).json({ success: true, message: 'Artista desactivado con éxito' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al desactivar el artista' });
        }
    },

    // ==========================================
    // 4. FACTURACION Y VENTAS
    // ==========================================
    datosFacturacion: async (req, res) => {
        try {
            const obra = await ObraModel.obtenerPorId(req.params.id);
            if (!obra || obra.estatus !== 'Reservada' || !obra.reservado_por) {
                return res.status(404).json({ success: false, message: 'Reserva no encontrada' });
            }
            const comprador = await UsuarioModel.buscarPorId(obra.reservado_por);
            if (!comprador) return res.status(404).json({ success: false, message: 'Comprador no encontrado' });

            const infoComprador = await InfoCompradorModel.obtenerPorCompradorId(obra.reservado_por);
            res.status(200).json({ success: true, data: { obra, comprador, infoComprador } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar datos de facturación' });
        }
    },

    emitirFactura: async (req, res) => {
        try {
            const {
                obra_id, precioObra, porcentajeGanancia, comprador_id,
                empresaEnvio, pais, estado, ciudad, municipio, calle
            } = req.body;

            const admin_id = req.user?.id || req.session?.usuario?.id; 
            if (!admin_id) return res.status(401).json({ success: false, message: 'No autorizado' });

            const compradorIdStr = String(comprador_id || '').trim();
            const obraObj = await ObraModel.obtenerPorId(obra_id);
            if (!obraObj || obraObj.estatus.toLowerCase() !== 'reservada' || String(obraObj.reservado_por).trim() !== compradorIdStr) {
                return res.status(400).json({ success: false, message: 'Reserva inválida' });
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
                pais: direccion.pais, estado: direccion.estado_residencia,
                ciudad: direccion.ciudad, municipio: direccion.municipio, calle: direccion.calle,
                empresaEnvio: empresaEnvio || 'Pendiente',
                iva, gananciaDolar: ganancia, gananciaPorc: porc,
                precioFinal: total, codigo
            });

            await ObraModel.marcarComoVendida(obra_id);

            // Generacion de PDF
            try {
                const facturaData = await VentaModel.obtenerFacturaPorCodigo(codigo);
                const compradorData = await UsuarioModel.buscarPorId(comprador_id);

                if (compradorData && compradorData.gmail) {
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
                    await page.setRequestInterception(true);
                    page.on('request', (request) => {
                        const url = request.url();
                        if (url.startsWith('http://') || url.startsWith('https://')) return request.abort();
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
                }
            } catch (errPdf) {
                console.error('❌ Error crítico en generación de PDF:', errPdf.message);
            }

            res.status(200).json({ success: true, message: 'Factura emitida correctamente', data: { codigo, total } });

        } catch (error) {
            console.error('Error al facturar:', error);
            res.status(500).json({ success: false, message: 'Error al procesar la venta' });
        }
    },

    // ==========================================
    // 5. REPORTES
    // ==========================================
    reporteVentas: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const ventas = await VentaModel.obtenerVentasPorPeriodo(fechaInicio, fechaFin);
            const resumen = await VentaModel.obtenerResumenFinanciero(fechaInicio, fechaFin);

            res.status(200).json({
                success: true,
                data: {
                    reporte: resumen || { totalRecaudado: 0, totalGanancia: 0 },
                    ventas: ventas || [],
                    filtros: { fechaInicio: fechaInicio || '', fechaFin: fechaFin || '' }
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al generar reporte de ventas' });
        }
    },

    obrasVendidas: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const obrasVendidas = await VentaModel.obtenerObrasVendidasPorPeriodo(fechaInicio, fechaFin);
            res.status(200).json({
                success: true,
                data: {
                    obras: obrasVendidas || [],
                    filtros: { fechaInicio: fechaInicio || '', fechaFin: fechaFin || '' }
                }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar obras vendidas' });
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

            res.status(200).json({
                success: true,
                data: { grupos: Array.from(agrupadas.values()), filtros: { fechaInicio: fechaInicio || '', fechaFin: fechaFin || '', nombre: nombre || '' } }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar facturas' });
        }
    },

    facturaDetalle: async (req, res) => {
        try {
            const factura = await VentaModel.obtenerFacturaPorId(req.params.id);
            if (!factura) return res.status(404).json({ success: false, message: 'Factura no encontrada' });
            res.status(200).json({ success: true, data: { factura } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar la factura' });
        }
    },

    reporteMembresias: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const membresias = await InfoCompradorModel.obtenerReportePorPeriodo(fechaInicio, fechaFin);
            res.status(200).json({
                success: true,
                data: { membresias, filtros: { fechaInicio: fechaInicio || '', fechaFin: fechaFin || '' } }
            });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al generar reporte de membresías' });
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
            res.status(500).json({ success: false, message: 'Error al exportar datos' });
        }
    },

    // ==========================================
    // 6. GESTION DE ADMINISTRADORES
    // ==========================================
    verificarAccesoPanel: (req, res, next) => {
        const rol = req.session?.usuario?.rol || req.user?.rol; 
        if (rol === 1 || rol === 3) return next();
        res.status(403).json({ success: false, message: 'Acceso denegado. Se requieren permisos de administrador.' });
    },

    verificarSuperAdmin: (req, res, next) => {
        const rol = req.session?.usuario?.rol || req.user?.rol;
        if (rol === 3) return next();
        res.status(403).json({ success: false, message: 'Acceso restringido: Solo los Superadministradores.' });
    },

    listarAdmins: async (req, res) => {
        try {
            const rol = req.session?.usuario?.rol || req.user?.rol;
            if (rol !== 3) return res.status(403).json({ success: false, message: 'No tienes permisos para ver esta lista' });

            const admins = await UsuarioModel.obtenerTodosLosAdmins();
            res.status(200).json({ success: true, data: admins });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar la lista de administradores' });
        }
    },

    obtenerAdmin: async (req, res) => {
        try {
            const idParaEditar = req.params.id;
            const adminData = await UsuarioModel.obtenerPerfilCompleto(idParaEditar);
            if (!adminData) return res.status(404).json({ success: false, message: 'Administrador no encontrado' });
            res.status(200).json({ success: true, data: adminData });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar datos del administrador' });
        }
    },

    crearAdmin: async (req, res) => {
        try {
            const { nombre, apellido, cedula, gmail, login, password } = req.body;
            const existeLogin = await UsuarioModel.buscarPorLogin(login);
            if (existeLogin) return res.status(409).json({ success: false, message: 'El Login ya está en uso' });

            const existeEmail = await UsuarioModel.buscarPorEmail(gmail);
            if (existeEmail) return res.status(409).json({ success: false, message: 'El Correo ya está registrado en otra cuenta' });

            const passwordEncriptado = await bcrypt.hash(password, 10);
            const datosUsuario = { nombre, apellido, cedula, gmail, login, password: passwordEncriptado };
            
            await UsuarioModel.crear(datosUsuario, 1);
            res.status(201).json({ success: true, message: 'Nuevo Administrador creado con éxito' });
        } catch (error) {
            console.error('Error al crear admin:', error);
            res.status(500).json({ success: false, message: 'Error interno del servidor.' });
        }
    },

    actualizarAdmin: async (req, res) => {
        const idParaEditar = req.params.id;
        const { nombre, apellido, gmail, login, rol_id } = req.body;
        try {
            const datosActualizados = { nombre, apellido, gmail, login, rol_id };
            await UsuarioModel.actualizarDesdeAdmin(idParaEditar, datosActualizados);
            res.status(200).json({ success: true, message: 'Administrador actualizado correctamente' });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al actualizar. El correo o usuario podrían estar duplicados.' });
        }    
    }
};

module.exports = AdminController;