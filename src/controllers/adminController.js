const db = require('../config/db'); // Necesario para consultas simples de usuarios/generos
const ObraModel = require('../models/ObraModel');
const VentaModel = require('../models/ventaModel');
const ArtistaModel = require('../models/ArtistaModel');
const InfoCompradorModel = require('../models/InfoCompradorModel');

const AdminController = {

    // 1. DASHBOARD PRINCIPAL
    dashboard: async (req, res) => {
        try {
            const [totalObras, recaudado, membresias] = await Promise.all([
                ObraModel.contarTotal(),        // Total de obras en inventario
                VentaModel.totalRecaudado(),    // Dinero de ventas de obras
                InfoCompradorModel.contarActivas()  // Membresías activas
            ]);

            res.render('admin/dashboard', { 
                stats: { totalObras, recaudado, membresias }, 
                errorMsg: null 
            });
        } catch (error) {
            console.error('Error en Dashboard:', error);
            res.render('admin/dashboard', { 
                stats: { totalObras: 0, recaudado: 0, membresias: 0 }, 
                errorMsg: 'Error de conexión con la base de datos.' 
            });
        }
    },

    // 2. GESTIÓN DE OBRAS (Inventario)
    
    gestionObras: async (req, res) => {
        try {
            const generos = await ObraModel.obtenerGeneros();
            const artistas = await ArtistaModel.listar(); 
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

    // Vista: Listado completo
    inventarioObras: async (req, res) => {
        try {
            const obras = await ObraModel.obtenerInventario();
            res.render('admin/inventario', { obras });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar inventario');
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

    // 3. GESTIÓN DE ARTISTAS
    gestionArtistas: async (req, res) => {
        res.render('admin/gestion-artistas');
    },

    guardarArtista: async (req, res) => {
        try {
            const foto = req.file ? req.file.filename : null;
            await ArtistaModel.crear(req.body, foto);
            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al guardar artista');
        }
    },

    // 4. FACTURACIÓN Y VENTAS (Refactorizado sin tabla Dirección)
    
    // Vista: Pantalla para emitir factura
    pantallaFactura: async (req, res) => {
        try {
            const obra = await ObraModel.obtenerPorId(req.params.id);
            
            const [compradores] = await db.execute("SELECT id, nombre, apellido FROM usuario WHERE rol_id = 2");
            
            res.render('admin/modulo-facturacion', { 
                obra, 
                compradores 
            });
        } catch (error) {
            console.error(error);
            res.status(500).send("Error al cargar datos de facturación");
        }
    },

    // Acción: Procesar la venta
    emitirFactura: async (req, res) => {
        try {
            const { 
                obra_id, precioObra, porcentajeGanancia, comprador_id, 
                empresaEnvio,
                pais, estado, ciudad, municipio, calle 
            } = req.body;

            const admin_id = req.session?.usuario?.id;
            if (!admin_id) return res.status(401).send('Sesión no válida o expirada');

            const precioBase = parseFloat(precioObra);
            const porc = parseFloat(porcentajeGanancia);
            const iva = precioBase * 0.16;
            const ganancia = precioBase * (porc / 100);
            const total = precioBase + iva + ganancia;
            const codigo = "FAC-" + Date.now(); // Generador simple de código

            await VentaModel.crear({
                comprador_id, admin_id, obra_id,
                pais, estado, ciudad, municipio, calle, empresaEnvio,
                iva, ganancia, porcentaje: porc, 
                total, codigo
            });

            await ObraModel.marcarComoVendida(obra_id);

            res.redirect('/admin/reportes-ventas');

        } catch (error) {
            console.error('Error al facturar:', error);
            res.status(500).send("Error al procesar la venta");
        }
    },

    // 5. REPORTES

    // Reporte de Ventas de Obras
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

    // Reporte de Membresías 
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
    }
};

module.exports = AdminController;