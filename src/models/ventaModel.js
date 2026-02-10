const db = require('../config/db');

class VentaModel {

    // 1. REGISTRAR VENTA (Adaptado a la nueva BD sin direccion_id)
    static async crear(datos) {
        const sql = `INSERT INTO venta (
            comprador_id, administrador_id, obra_id, 
            pais, estado, ciudad, municipio, calle, empresaEnvio,
            codigoDeFactura, iva, 
            gananciaMuseoDolares, gananciaMuseoPorcentaje, 
            precioFinalVenta, fechaDeVenta
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE())`;
        
        // El orden del array DEBE coincidir con los ? de arriba
        const params = [
            datos.comprador_id,
            datos.admin_id,
            datos.obra_id,
            datos.pais || 'Venezuela', // Valor por defecto
            datos.estado,
            datos.ciudad,
            datos.municipio,
            datos.calle,
            datos.empresaEnvio,
            datos.codigo,      // codigoDeFactura
            datos.iva,
            datos.gananciaDolar, // gananciaMuseoDolares
            datos.gananciaPorc,  // gananciaMuseoPorcentaje
            datos.precioFinal    // precioFinalVenta
        ];

        const [result] = await db.execute(sql, params);
        return result;
    }

    // 2. REPORTE: Listado detallado (Soporta filtrado opcional)
    static async obtenerVentasPorPeriodo(fechaInicio, fechaFin) {
        let sql = `
            SELECT v.*, 
                   o.nombre AS nombre_obra, 
                   u.nombre AS nombre_comprador, u.apellido AS nombre_apellido,
                   (v.precioFinalVenta - v.iva - v.gananciaMuseoDolares) AS gananciaArtistaDolares
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN usuario u ON v.comprador_id = u.id
        `;
        
        const params = [];

        // Si mandan fechas, filtramos. Si no, traemos todo.
        if (fechaInicio && fechaFin) {
            sql += ' WHERE v.fechaDeVenta BETWEEN ? AND ?';
            params.push(fechaInicio, fechaFin);
        }

        sql += ' ORDER BY v.fechaDeVenta DESC';

        const [rows] = await db.execute(sql, params);
        return rows;
    }

    // 2b. OBRAS VENDIDAS: Listado con filtro por periodo
    static async obtenerObrasVendidasPorPeriodo(fechaInicio, fechaFin) {
        let sql = `
            SELECT v.codigoDeFactura, v.fechaDeVenta,
                   o.id, o.nombre, o.estatus, o.precioObra, o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN artista a ON o.autor_id = a.id
            JOIN genero g ON o.genero_id = g.id
        `;

        const params = [];
        if (fechaInicio && fechaFin) {
            sql += ' WHERE v.fechaDeVenta BETWEEN ? AND ?';
            params.push(fechaInicio, fechaFin);
        }

        sql += ' ORDER BY v.fechaDeVenta DESC';

        const [rows] = await db.execute(sql, params);
        return rows;
    }

    // 3. REPORTE: Resumen Financiero
    static async obtenerResumenFinanciero(fechaInicio, fechaFin) {
        let sql = `
            SELECT 
                COUNT(id) as totalVentas,
                COALESCE(SUM(precioFinalVenta), 0) as totalRecaudado,
                COALESCE(SUM(gananciaMuseoDolares), 0) as totalGananciaMuseo
            FROM venta
        `;

        const params = [];
        if (fechaInicio && fechaFin) {
            sql += ' WHERE fechaDeVenta BETWEEN ? AND ?';
            params.push(fechaInicio, fechaFin);
        }

        const [rows] = await db.execute(sql, params);
        return rows[0];
    }

    // 4. DASHBOARD: Total histórico recaudado (ESTE FALTABA)
    static async totalRecaudado() {
        // Sumamos todo lo que hay en la columna precioFinalVenta
        const sql = 'SELECT COALESCE(SUM(precioFinalVenta), 0) as total FROM venta';
        const [rows] = await db.execute(sql);
        // Devolvemos el número limpio (ej: 5000.00)
        return rows[0].total;
    }

    // 5. DASHBOARD: Total histórico de ganancia del museo
    static async totalGananciaMuseo() {
        const sql = 'SELECT COALESCE(SUM(gananciaMuseoDolares), 0) as total FROM venta';
        const [rows] = await db.execute(sql);
        return rows[0].total;
    }

    static async listarFacturas(filtros = {}) {
        const condiciones = [];
        const params = [];

        const nombre = filtros.nombre ? String(filtros.nombre).trim() : '';
        const fechaInicio = filtros.fechaInicio ? String(filtros.fechaInicio).trim() : '';
        const fechaFin = filtros.fechaFin ? String(filtros.fechaFin).trim() : '';

        if (nombre) {
            condiciones.push('(u.nombre LIKE ? OR u.apellido LIKE ? OR CONCAT(u.nombre, " ", u.apellido) LIKE ?)');
            const likeNombre = `%${nombre}%`;
            params.push(likeNombre, likeNombre, likeNombre);
        }

        if (fechaInicio && fechaFin) {
            condiciones.push('v.fechaDeVenta BETWEEN ? AND ?');
            params.push(fechaInicio, fechaFin);
        } else if (fechaInicio) {
            condiciones.push('v.fechaDeVenta >= ?');
            params.push(fechaInicio);
        } else if (fechaFin) {
            condiciones.push('v.fechaDeVenta <= ?');
            params.push(fechaFin);
        }

        let sql = `
            SELECT v.id, v.comprador_id, v.codigoDeFactura, v.fechaDeVenta, v.precioFinalVenta,
                   o.nombre AS nombre_obra,
                   u.nombre AS nombre_comprador, u.apellido AS apellido_comprador
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN usuario u ON v.comprador_id = u.id
        `;

        if (condiciones.length > 0) {
            sql += ' WHERE ' + condiciones.join(' AND ');
        }

        sql += ' ORDER BY v.fechaDeVenta DESC';

        const [rows] = await db.execute(sql, params);
        return rows;
    }

    static async obtenerFacturaPorId(id) {
        const sql = `
            SELECT v.*, 
                   o.nombre AS nombre_obra, o.precioObra, o.porcentajeGanancia,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   u.nombre AS nombre_comprador, u.apellido AS apellido_comprador,
                   u.cedula, u.gmail
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN artista a ON o.autor_id = a.id
            JOIN usuario u ON v.comprador_id = u.id
            WHERE v.id = ?
            LIMIT 1
        `;

        const [rows] = await db.execute(sql, [id]);
        return rows[0];
    }
}

module.exports = VentaModel;