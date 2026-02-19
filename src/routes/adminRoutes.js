const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController'); 
const AuthController = require('../controllers/AuthController');
const upload = require('../config/multer');
const IAController = require('../controllers/IAController'); 

// --- RUTA PÚBLICA (IMPORTANTE: Debe ir PRIMERO) ---
// Esta ruta permite que la galería consulte a la IA sin iniciar sesión
router.post('/ia/curador', IAController.curadorVirtual);

// --- A PARTIR DE AQUÍ, TODO REQUIERE SESIÓN ---
router.use(AuthController.verificarSesion);
router.use(adminController.verificarAccesoPanel);

router.get('/', (req, res) => { res.redirect('/admin/dashboard'); });

// Dashboard e Inventario
router.get('/dashboard', adminController.dashboard);
router.get('/inventario', adminController.inventarioObras);
router.get('/reservas', adminController.reservasObras);
router.post('/reservas/:id/rechazar', adminController.rechazarReserva);
router.post('/reservas/:id/aceptar', adminController.aceptarReserva);
router.get('/obras/:id/editar', adminController.editarObraForm);
router.post('/obras/:id/editar', upload, adminController.actualizarObra);
router.post('/obras/:id/eliminar', adminController.eliminarObra);

// Gestión Obras
router.get('/gestion-obras', adminController.gestionObras);
router.post('/guardar-obra', upload, adminController.guardarObra);

// Gestión Artistas (CRUD)
router.get('/gestion-artistas', adminController.gestionArtistas);
router.post('/guardar-artista', upload, adminController.guardarArtista);
router.get('/editar-artista/:id', adminController.editarArtista);
router.post('/actualizar-artista/:id', upload, adminController.actualizarArtista);
router.get('/eliminar-artista/:id', adminController.eliminarArtista);
router.get('/activar-artista/:id', adminController.activarArtista);

// Facturación
router.get('/facturar/:id', adminController.pantallaFactura);
router.post('/emitir-factura', adminController.emitirFactura);

// Reportes
router.get('/reportes-ventas', adminController.reporteVentas);
router.get('/obras-vendidas', adminController.obrasVendidas);
router.get('/facturas', adminController.facturasListado);
router.get('/facturas/:id', adminController.facturaDetalle);
router.get('/reportes-membresia', adminController.reporteMembresias);

// Gestión de Usuarios
router.get('/usuarios/crear', adminController.verificarSuperAdmin, adminController.mostrarCrearAdmin);
router.post('/usuarios/crear', adminController.verificarSuperAdmin, adminController.procesarCrearAdmin);
router.get('/lista-admins', AuthController.verificarSesion, adminController.listarAdmins);
router.get('/editar-usuario/:id', AuthController.verificarSesion, adminController.mostrarEditarAdmin);
router.post('/editar-usuario/:id', AuthController.verificarSesion, adminController.actualizarAdmin);

// Rutas internas (IA Biografía y Excel)
router.post('/ia/generar-biografia', IAController.generarBiografia);
router.get('/exportar-ventas', adminController.exportarVentasExcel);
router.get('/respaldar-db', adminController.verificarSuperAdmin, adminController.respaldarBD);

module.exports = router;