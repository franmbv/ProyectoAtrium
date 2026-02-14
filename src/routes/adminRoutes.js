const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController'); 
const AuthController = require('../controllers/AuthController');
const upload = require('../config/multer');

const verificarAccesoPanel = (req, res, next) => {
    const rol = req.session.usuario?.rol;
    if (rol === 1 || rol === 3) {
        return next();
    }
    res.redirect('/auth/login?error=Acceso denegado. Se requieren permisos de administrador.');
};

const verificarSuperAdmin = (req, res, next) => {
    if (req.session.usuario && req.session.usuario.rol === 3) {
        return next();
    }
    res.redirect('/admin/dashboard?error=Acceso restringido: Solo los Superadministradores pueden crear nuevas cuentas.');
};

router.use(AuthController.verificarSesion);

router.use(verificarAccesoPanel);

// Proteger todas las rutas de admin
router.use(AuthController.verificarSesion);

// Redirigir /admin al dashboard
router.get('/', (req, res) => {
	res.redirect('/admin/dashboard');
});

// Dashboard e Inventario
router.get('/dashboard', adminController.dashboard);
router.get('/inventario', adminController.inventarioObras);
router.get('/reservas', adminController.reservasObras);
router.post('/reservas/:id/rechazar', adminController.rechazarReserva);
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
router.get('/usuarios/crear', verificarSuperAdmin, adminController.mostrarCrearAdmin);
router.post('/usuarios/crear', verificarSuperAdmin, adminController.procesarCrearAdmin);

module.exports = router;