const db = require('../config/db'); 
const ObraModel = require('../models/ObraModel');
const VentaModel = require('../models/ventaModel');
const ArtistaModel = require('../models/ArtistaModel');
const InfoCompradorModel = require('../models/InfoCompradorModel');

const AdminController = {

    // 1. DASHBOARD PRINCIPAL
    dashboard: async (req, res) => {
        try {
            const [totalObras, recaudado, membresias] = await Promise.all([
                ObraModel.contarTotal(),        
                VentaModel.totalRecaudado(),    
                InfoCompradorModel.contarActivas()  
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

    // 2. GESTIÓN DE OBRAS
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

    // 3. GESTIÓN DE ARTISTAS (CRUD COMPLETO)
    
    // Listar y Crear
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
            const foto = req.file ? req.file.filename : null;
            await ArtistaModel.crear(req.body, foto);
            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al guardar artista');
        }
    },

    // Formulario de Edición
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

    // Acción Actualizar
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

    // Acción Eliminar
    eliminarArtista: async (req, res) => {
        try {
            await ArtistaModel.eliminar(req.params.id);
            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('No se puede eliminar el artista porque tiene obras registradas.');
        }
    },

    // 4. FACTURACIÓN Y VENTAS
    pantallaFactura: async (req, res) => {
        try {
            const obra = await ObraModel.obtenerPorId(req.params.id);
            const [compradores] = await db.execute("SELECT id, nombre, apellido FROM usuario WHERE rol_id = 2");
            
            res.render('admin/modulo-facturacion', { obra, compradores });
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

            const precioBase = parseFloat(precioObra);
            const porc = parseFloat(porcentajeGanancia);
            const iva = precioBase * 0.16;
            const ganancia = precioBase * (porc / 100);
            const total = precioBase + iva + ganancia;
            const codigo = "FAC-" + Date.now(); 

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