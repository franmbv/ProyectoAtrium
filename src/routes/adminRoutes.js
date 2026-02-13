const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController'); // <--- CORREGIDO: minúscula
const AuthController = require('../controllers/AuthController');
const upload = require('../config/multer');

// Proteger todas las rutas de admin
router.use(AuthController.verificarSesion);

// Redirigir /admin al dashboard
router.get('/', (req, res) => {
	res.redirect('/admin/dashboard');
});

// Dashboard e Inventario
router.get('/dashboard', adminController.dashboard);
router.get('/inventario', adminController.inventarioObras);
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

// Facturación
router.get('/facturar/:id', adminController.pantallaFactura);
router.post('/emitir-factura', adminController.emitirFactura);

// Reportes
router.get('/reportes-ventas', adminController.reporteVentas);
router.get('/reportes-membresia', adminController.reporteMembresias);

module.exports = router;