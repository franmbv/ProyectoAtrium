const express = require('express');
const router = express.Router();

const adminController = require('../controllers/adminController'); 
const AuthController = require('../controllers/AuthController');
const upload = require('../config/multer');

// ... (Mantener tus importaciones anteriores)
const IAController = require('../controllers/IAController');

// Proteger todas las rutas de admin
router.use(AuthController.verificarSesion);

// Verificar que el usuario tenga acceso al panel de administración
router.use(adminController.verificarAccesoPanel);

// Redirigir /admin al dashboard
router.get('/', (req, res) => {
	res.redirect('/admin/dashboard');
});

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

//Exportación a Excel:
router.get('/exportar-ventas', adminController.exportarVentasExcel);

// Buscar la sección de Dashboard / Gestión de obras y añadir la siguiente línea:
router.get('/obras/:id/historial', adminController.historialObra);

// Agregar al archivo src/routes/adminRoutes.js junto a las demás rutas administrativas:

// Bitácora de Seguridad (Cassandra)
router.get('/seguridad/logs', adminController.verBitacoraSeguridad);

// Auditoría de Reportes Fiscales (Cassandra)
router.get('/auditoria/reportes', adminController.verAuditoriaReportes);

// Agregar en src/routes/adminRoutes.js:
router.get('/documentacion', adminController.verDocumentacion);

// Consulta NLP en Grafos (Neo4j)
router.get('/nlp-query', adminController.pantallaNLPQuery);
router.post('/nlp-query', adminController.procesarNLPQuery);

router.get('/auditoria/membresias', adminController.verAuditoriaMembresias);

// Gestión de Categorías Polimórficas
router.get('/categorias', adminController.gestionCategorias);
router.post('/categorias/guardar', adminController.guardarCategoria);
router.get('/categorias/especificaciones/:id', adminController.obtenerEspecificacionesCategoria);

// Generación de Biografía con IA
router.post('/artistas/generar-biografia', adminController.generarBiografiaArtista);
router.post('/ia/curador', IAController.curadorVirtual);

module.exports = router;