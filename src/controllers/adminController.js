const db = require('../config/db');

const adminController = {
    // Dashboard de administración
    dashboard: async (req, res) => {
        try {
            const [totalObrasRes, recaudadoRes, membresiasRes] = await Promise.allSettled([
                db.execute('SELECT COUNT(*) AS totalObras FROM obra'),
                db.execute('SELECT COALESCE(SUM(gananciaMuseoDolares), 0) AS recaudado FROM venta'),
                db.execute('SELECT COUNT(*) AS membresias FROM membresia WHERE estadoMembresia = 1')
            ]);

            const totalObras = totalObrasRes.status === 'fulfilled'
                ? totalObrasRes.value[0][0]?.totalObras
                : 0;
            const recaudado = recaudadoRes.status === 'fulfilled'
                ? recaudadoRes.value[0][0]?.recaudado
                : 0;
            const membresias = membresiasRes.status === 'fulfilled'
                ? membresiasRes.value[0][0]?.membresias
                : 0;

            const stats = {
                totalObras: totalObras ?? 0,
                recaudado: recaudado ?? 0,
                membresias: membresias ?? 0
            };

            const errorMsg = [totalObrasRes, recaudadoRes, membresiasRes].some(r => r.status === 'rejected')
                ? 'No se pudieron cargar todas las métricas. Revisa la conexión a la base de datos.'
                : null;

            res.render('admin/dashboard', { stats, errorMsg });
        } catch (error) {
            console.error(error);
            res.render('admin/dashboard', {
                stats: { totalObras: 0, recaudado: 0, membresias: 0 },
                errorMsg: 'Error al cargar el dashboard. Verifica la conexión a la base de datos.'
            });
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

    // Listado de obras en inventario
    inventarioObras: async (req, res) => {
        try {
            const sql = `
                SELECT o.id, o.nombre, o.estatus, o.precioObra, o.foto,
                       a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                       g.nombre AS nombre_genero
                FROM obra o
                INNER JOIN artista a ON o.autor_id = a.id
                INNER JOIN genero g ON o.genero_id = g.Id
                ORDER BY o.id DESC
            `;
            const [obras] = await db.execute(sql);
            res.render('admin/inventario', { obras });
        } catch (error) {
            console.error(error);
            res.status(500).send('Error al cargar inventario de obras');
        }
    },

    // Guardar obra (con foto)
    guardarObra: async (req, res) => {
        try {
            const {
                nombre, precioObra, porcentajeGanancia, genero_id, autor_id,
                tecnica, soporte,
                material, peso, largo, ancho, profundidad,
                tipo_foto, papel, formato,
                tipoArcilla, temperaturaCoccion, tipoEsmalte,
                metal, pureza, piedraPreciosa
            } = req.body;
            const foto = req.file ? req.file.filename : null;

            if (!nombre || !precioObra || !porcentajeGanancia || !genero_id || !autor_id) {
                return res.status(400).send('Datos incompletos para guardar la obra');
            }

            const sql = `INSERT INTO obra
                (genero_id, autor_id, nombre, fechaCreacion, precioObra, porcentajeGanancia, estatus, foto)
                VALUES (?, ?, ?, CURDATE(), ?, ?, 'Disponible', ?)`;

            const [resultado] = await db.execute(sql, [
                genero_id,
                autor_id,
                nombre,
                parseFloat(precioObra),
                parseFloat(porcentajeGanancia),
                foto
            ]);

            const obraId = resultado.insertId;

            switch (parseInt(genero_id, 10)) {
                case 1: // Pintura
                    await db.execute(
                        'INSERT INTO pintura (obra_id, tecnica, soporte) VALUES (?, ?, ?)',
                        [obraId, tecnica || null, soporte || null]
                    );
                    break;
                case 2: // Escultura
                    await db.execute(
                        'INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES (?, ?, ?, ?, ?, ?)',
                        [
                            obraId,
                            material || null,
                            peso ? parseFloat(peso) : null,
                            largo ? parseFloat(largo) : null,
                            ancho ? parseFloat(ancho) : null,
                            profundidad ? parseFloat(profundidad) : null
                        ]
                    );
                    break;
                case 3: // Fotografía
                    await db.execute(
                        'INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES (?, ?, ?, ?)',
                        [obraId, tipo_foto || null, papel || null, formato || null]
                    );
                    break;
                case 4: // Cerámica
                    await db.execute(
                        'INSERT INTO ceramica (obra_id, tipoArcilla, temperaturaCoccion, tipoEsmalte) VALUES (?, ?, ?, ?)',
                        [
                            obraId,
                            tipoArcilla || null,
                            temperaturaCoccion ? parseFloat(temperaturaCoccion) : null,
                            tipoEsmalte || null
                        ]
                    );
                    break;
                case 5: // Orfebrería
                    await db.execute(
                        'INSERT INTO orfebreria (obra_id, metal, pureza, piedraPreciosa) VALUES (?, ?, ?, ?)',
                        [
                            obraId,
                            metal || null,
                            pureza ? parseFloat(pureza) : null,
                            piedraPreciosa !== undefined && piedraPreciosa !== '' ? parseInt(piedraPreciosa, 10) : null
                        ]
                    );
                    break;
                default:
                    break;
            }

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
            const { nombre, apellido, nacionalidad, biografia, fechaNac, fechaFal } = req.body;
            const foto = req.file ? req.file.filename : null;

            if (!nombre || !nacionalidad) {
                return res.status(400).send('Nombre y nacionalidad son obligatorios');
            }

            const sql = `INSERT INTO artista
                (nombre, apellido, fechaNac, fechaFal, nacionalidad, descripcion, fotografia)
                VALUES (?, ?, ?, ?, ?, ?, ?)`;

            await db.execute(sql, [
                nombre,
                apellido || null,
                fechaNac || null,
                fechaFal || null,
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
            const usarRango = fechaInicio && fechaFin;

            const where = usarRango ? 'WHERE fechaDeVenta BETWEEN ? AND ?' : '';
            const params = usarRango ? [fechaInicio, fechaFin] : [];

            const sqlResumen = `SELECT 
                                    COALESCE(SUM(precioFinalVenta), 0) as totalRecaudado,
                                    COALESCE(SUM(gananciaMuseoDolares), 0) as totalGanancia
                                FROM venta 
                                ${where}`;

            const sqlDetalle = `SELECT 
                                    v.*, 
                                    o.nombre AS nombre_obra, 
                                    u.nombre AS nombre_comprador, 
                                    u.apellido AS apellido_comprador,
                                    (v.precioFinalVenta - v.iva - v.gananciaMuseoDolares) AS gananciaArtistaDolares
                                FROM venta v
                                JOIN obra o ON v.obra_id = o.id
                                JOIN usuario u ON v.comprador_id = u.id
                                ${usarRango ? 'WHERE v.fechaDeVenta BETWEEN ? AND ?' : ''}
                                ORDER BY v.fechaDeVenta DESC`;

            const [reporte] = await db.execute(sqlResumen, params);
            const [ventas] = await db.execute(sqlDetalle, params);

            res.render('admin/reportes-ventas', { 
                reporte: reporte[0], 
                ventas,
                filtros: { fechaInicio: fechaInicio || '', fechaFin: fechaFin || '' }
            });
        } catch (error) {
            res.status(500).send("Error al generar reporte");
        }
    },

    // 4. Reporte de membresías
    reporteMembresias: async (req, res) => {
        try {
            const { fechaInicio, fechaFin } = req.query;
            const usarRango = fechaInicio && fechaFin;

            const where = usarRango ? 'WHERE m.fechaPago BETWEEN ? AND ?' : '';
            const params = usarRango ? [fechaInicio, fechaFin] : [];

            const sql = `SELECT m.Id as id, m.fechaPago, m.estadoMembresia, u.nombre, u.apellido
                         FROM membresia m
                         JOIN usuario u ON m.comprador_id = u.id
                         ${where}
                         ORDER BY m.fechaPago DESC`;

            const [membresias] = await db.execute(sql, params);
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

module.exports = adminController;