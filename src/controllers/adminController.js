const db = require('../config/db');

const adminController = {
    // Dashboard de administración
    dashboard: async (req, res) => {
        try {
            const [[{ totalObras }]] = await db.execute('SELECT COUNT(*) AS totalObras FROM obra');
            const [[{ recaudado }]] = await db.execute('SELECT COALESCE(SUM(gananciaMuseoDolares), 0) AS recaudado FROM venta');
            const [[{ membresias }]] = await db.execute('SELECT COUNT(*) AS membresias FROM membresia WHERE estadoMembresia = 1');

            const stats = {
                totalObras: totalObras ?? 0,
                recaudado: recaudado ?? 0,
                membresias: membresias ?? 0
            };

            res.render('admin/dashboard', { stats }, (err, html) => {
                if (err) {
                    console.error('Error render dashboard:', err);
                    return res.status(500).send('Error al renderizar el dashboard');
                }
                res.send(html);
            });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar el dashboard');
        }
    },

    // Gestión de obras (formulario)
    gestionObras: async (req, res) => {
        try {
            const [generos] = await db.execute('SELECT Id, nombre FROM genero ORDER BY nombre ASC');
            const [artistas] = await db.execute('SELECT id, nombre, apellido FROM artista ORDER BY nombre ASC');

            res.render('admin/gestion-obras', { generos, artistas });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar gestión de obras');
        }
    },

    // Guardar obra (con foto)
    guardarObra: async (req, res) => {
        try {
            const { nombre, precioObra, porcentajeGanancia, genero_id, autor_id } = req.body;
            const foto = req.file ? req.file.filename : null;

            if (!nombre || !precioObra || !porcentajeGanancia || !genero_id || !autor_id) {
                return res.status(400).send('Datos incompletos para guardar la obra');
            }

            const sql = `INSERT INTO obra
                (genero_id, autor_id, nombre, fechaCreacion, precioObra, porcentajeGanancia, estatus, foto)
                VALUES (?, ?, ?, CURDATE(), ?, ?, 'Disponible', ?)`;

            await db.execute(sql, [
                genero_id,
                autor_id,
                nombre,
                parseFloat(precioObra),
                parseFloat(porcentajeGanancia),
                foto
            ]);

            res.redirect('/admin/gestion-obras');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al guardar la obra');
        }
    },

    // Gestión de artistas (formulario)
    gestionArtistas: async (req, res) => {
        try {
            res.render('admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar gestión de artistas');
        }
    },

    // Guardar artista (con foto)
    guardarArtista: async (req, res) => {
        try {
            const { nombre, apellido, nacionalidad, biografia } = req.body;
            const foto = req.file ? req.file.filename : null;

            if (!nombre || !nacionalidad) {
                return res.status(400).send('Nombre y nacionalidad son obligatorios');
            }

            const sql = `INSERT INTO artista
                (nombre, apellido, nacionalidad, descripcion, fotografia)
                VALUES (?, ?, ?, ?, ?)`;

            await db.execute(sql, [
                nombre,
                apellido || null,
                nacionalidad,
                biografia || null,
                foto
            ]);

            res.redirect('/admin/gestion-artistas');
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al guardar el artista');
        }
    },
    // 1. Mostrar la pantalla de facturación (necesitas traer los datos antes de facturar)
    pantallaFactura: async (req, res) => {
        try {
            const [obra] = await db.execute("SELECT * FROM obra WHERE id = ?", [req.params.id]);
            const [compradores] = await db.execute("SELECT id, nombre, apellido FROM usuario WHERE rol_id = 2");
            const [direcciones] = await db.execute("SELECT id, ciudad, calle FROM direccion");
            
            res.render('admin/modulo-facturacion', { 
                obra: obra[0], 
                compradores, 
                direcciones 
            });
        } catch (error) {
            res.status(500).send("Error al cargar datos de facturación");
        }
    },

    // 2. EMITIR FACTURA (Corregido con admin_id y empresaEnvio)
    emitirFactura: async (req, res) => {
        try {
            const { 
                obra_id, precioObra, porcentajeGanancia,
                comprador_id, direccion_id, empresaEnvio 
            } = req.body;

            // El ID del administrador debe venir de la sesión (login)
            const administrador_id = req.session?.usuario?.id; 
            if (!administrador_id) {
                return res.status(401).send('Sesión no válida');
            }

            // Cálculos financieros
            const precioBase = parseFloat(precioObra);
            const porc = parseFloat(porcentajeGanancia);
            const iva = precioBase * 0.16;
            const gananciaDolares = precioBase * (porc / 100);
            const precioTotal = precioBase + iva + gananciaDolares;
            const codigoFac = "FAC-" + Date.now();

            const sqlVenta = `INSERT INTO venta (
                comprador_id, administrador_id, obra_id, direccion_id, 
                iva, gananciaMuseoDolares, gananciaMuseoPorcentaje, 
                precioFinalVenta, fechaDeVenta, codigoDeFactura, empresaEnvio
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, ?)`;
            
            await db.execute(sqlVenta, [
                comprador_id, administrador_id, obra_id, direccion_id, 
                iva, gananciaDolares, porc, 
                precioTotal, codigoFac, empresaEnvio
            ]);

            await db.execute("UPDATE obra SET estatus = 'Vendida' WHERE id = ?", [obra_id]);

            res.redirect('/admin/reportes-ventas');
        } catch (error) {
            console.error(error);
            res.status(500).send("Error al procesar la venta");
        }
    },

    // 3. REPORTES (Lo que te falta para completar tu parte)
    reporteVentas: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            if (!fechaInicio || !fechaFin) {
                return res.render('admin/reportes-ventas', { reporte: { totalRecaudado: 0, totalGanancia: 0 }, ventas: [] });
            }

            const sqlResumen = `SELECT 
                                    COALESCE(SUM(precioFinalVenta), 0) as totalRecaudado,
                                    COALESCE(SUM(gananciaMuseoDolares), 0) as totalGanancia
                                FROM venta 
                                WHERE fechaDeVenta BETWEEN ? AND ?`;

            const sqlDetalle = `SELECT 
                                    v.*, 
                                    o.nombre AS nombre_obra, 
                                    u.nombre AS nombre_comprador, 
                                    u.apellido AS apellido_comprador
                                FROM venta v
                                JOIN obra o ON v.obra_id = o.id
                                JOIN usuario u ON v.comprador_id = u.id
                                WHERE v.fechaDeVenta BETWEEN ? AND ?
                                ORDER BY v.fechaDeVenta DESC`;

            const [reporte] = await db.execute(sqlResumen, [fechaInicio, fechaFin]);
            const [ventas] = await db.execute(sqlDetalle, [fechaInicio, fechaFin]);

            res.render('admin/reportes-ventas', { reporte: reporte[0], ventas });
        } catch (error) {
            res.status(500).send("Error al generar reporte");
        }
    },

    // 4. Reporte de membresías
    reporteMembresias: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            if (!fechaInicio || !fechaFin) {
                return res.render('admin/reportes-membresia', { membresias: [] });
            }

            const sql = `SELECT m.Id as id, m.fechaPago, m.estadoMembresia, u.nombre, u.apellido
                         FROM membresia m
                         JOIN usuario u ON m.comprador_id = u.id
                         WHERE m.fechaPago BETWEEN ? AND ?
                         ORDER BY m.fechaPago DESC`;

            const [membresias] = await db.execute(sql, [fechaInicio, fechaFin]);
            res.render('admin/reportes-membresia', { membresias });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al generar reporte de membresías');
        }
    }
};

module.exports = adminController;