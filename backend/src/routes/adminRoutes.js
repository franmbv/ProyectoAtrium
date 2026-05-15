const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController'); 
const AuthController = require('../controllers/AuthController');
const upload = require('../config/multer');

router.use(AuthController.verificarSesion);
router.use(adminController.verificarAccesoPanel);


router.get('/', (req, res) => {
    res.status(200).json({ message: 'API de Administración en línea' });
});

// ==========================================
// DASHBOARD E INVENTARIO
// ==========================================
router.get('/dashboard', adminController.dashboard);
router.get('/inventario', adminController.inventarioObras);
router.get('/reservas', adminController.reservasObras);
router.post('/reservas/:id/rechazar', adminController.rechazarReserva);
router.post('/reservas/:id/aceptar', adminController.aceptarReserva);

// ==========================================
// GESTIÓN DE OBRAS (CRUD)
// ==========================================
router.get('/obras', adminController.gestionObras);
router.get('/obras/:id', adminController.obtenerObra);
router.post('/obras', upload, adminController.guardarObra); 
router.put('/obras/:id', upload, adminController.actualizarObra); 
router.delete('/obras/:id', adminController.eliminarObra);

// ==========================================
// GESTIÓN DE ARTISTAS (CRUD)
// ==========================================
router.get('/artistas', adminController.gestionArtistas);
router.get('/artistas/:id', adminController.obtenerArtista); 
router.post('/artistas', upload, adminController.guardarArtista);
router.put('/artistas/:id', upload, adminController.actualizarArtista); 
router.delete('/artistas/:id', adminController.eliminarArtista); 
router.put('/artistas/:id/activar', adminController.activarArtista); 

// ==========================================
// FACTURACIÓN
// ==========================================
router.get('/facturar/:id', adminController.datosFacturacion);
router.post('/facturas', adminController.emitirFactura); 

// ==========================================
// REPORTES
// ==========================================
router.get('/reportes/ventas', adminController.reporteVentas);
router.get('/reportes/obras-vendidas', adminController.obrasVendidas);
router.get('/reportes/facturas', adminController.facturasListado);
router.get('/reportes/facturas/:id', adminController.facturaDetalle);
router.get('/reportes/membresia', adminController.reporteMembresias);
router.get('/reportes/ventas/excel', adminController.exportarVentasExcel); 

// ==========================================
// GESTIÓN DE USUARIOS / ADMINS
// ==========================================
router.get('/admins', adminController.listarAdmins); 
router.get('/admins/:id', adminController.obtenerAdmin); 
router.post('/admins', adminController.verificarSuperAdmin, adminController.crearAdmin); 
router.put('/admins/:id', adminController.verificarSuperAdmin, adminController.actualizarAdmin);

module.exports = router;