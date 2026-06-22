const db = require('../config/db');

class VentaModel {

    // 1. REGISTRAR VENTA (Adaptado a la nueva BD sin direccion_id)
    static async crear(datos) {
        const sql = `INSERT INTO venta (
            comprador_id, administrador_id, obra_id, 
            pais, estado, ciudad, municipio, calle, empresaenvio,
            codigodefactura, iva, 
            gananciamuseodolares, gananciamuseoporcentaje, 
            preciofinalventa, fechadeventa
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, CURRENT_DATE)`;
        
        // El orden del array DEBE coincidir con los de arriba
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

        const result = await db.query(sql, params);
        return result;
    }

    // Obtener datos completos para el PDF por Código de Factura
    static async obtenerFacturaPorCodigo(codigo) {
        const sql = `
            SELECT v.id, v.comprador_id, v.administrador_id, v.obra_id, 
                   v.codigodefactura AS "codigoDeFactura", v.iva, 
                   v.gananciamuseodolares AS "gananciaMuseoDolares", 
                   v.gananciamuseoporcentaje AS "gananciaMuseoPorcentaje", 
                   v.preciofinalventa AS "precioFinalVenta", 
                   v.fechadeventa AS "fechaDeVenta", 
                   v.empresaenvio AS "empresaEnvio", 
                   v.pais, v.estado, v.ciudad, v.municipio, v.calle,
                   o.nombre AS nombre_obra, o.precioobra AS "precioObra", o.porcentajeganancia AS "porcentajeGanancia", o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   u.nombre AS nombre_comprador, u.apellido AS apellido_comprador,
                   u.cedula, u.gmail
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN artista a ON o.autor_id = a.id
            JOIN usuario u ON v.comprador_id = u.id
            WHERE v.codigodefactura = $1
            LIMIT 1
        `;
        const result = await db.query(sql, [codigo]);
        return result.rows[0];
    }

    // 2. REPORTE: Listado detallado (Soporta filtrado por periodo)
    static async obtenerVentasPorPeriodo(fechaInicio, fechaFin) {
        let sql = `
            SELECT v.id, v.comprador_id, v.administrador_id, v.obra_id, 
                   v.codigodefactura AS "codigoDeFactura", v.iva, 
                   v.gananciamuseodolares AS "gananciaMuseoDolares", 
                   v.gananciamuseoporcentaje AS "gananciaMuseoPorcentaje", 
                   v.preciofinalventa AS "precioFinalVenta", 
                   v.fechadeventa AS "fechaDeVenta", 
                   v.empresaenvio AS "empresaEnvio", 
                   v.pais, v.estado, v.ciudad, v.municipio, v.calle,
                   o.nombre AS nombre_obra, 
                   u.nombre AS nombre_comprador, u.apellido AS nombre_apellido,
                   (v.preciofinalventa - v.iva - v.gananciamuseodolares) AS "gananciaArtistaDolares"
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN usuario u ON v.comprador_id = u.id
        `;
        
        const params = [];

        // Si mandan fechas, filtramos. Si no, traemos todo.
        if (fechaInicio && fechaFin) {
            sql += ' WHERE v.fechadeventa BETWEEN $1 AND $2';
            params.push(fechaInicio, fechaFin);
        }

        sql += ' ORDER BY v.fechadeventa DESC';

        const result = await db.query(sql, params);
        return result.rows;
    }

    // 2b. OBRAS VENDIDAS: Listado con filtro por periodo
    static async obtenerObrasVendidasPorPeriodo(fechaInicio, fechaFin) {
        let sql = `
            SELECT v.codigodefactura AS "codigoDeFactura", v.fechadeventa AS "fechaDeVenta",
                   o.id, o.nombre, o.estatus, o.precioobra AS "precioObra", o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN artista a ON o.autor_id = a.id
            JOIN genero g ON o.genero_id = g.id
        `;

        const params = [];
        if (fechaInicio && fechaFin) {
            sql += ' WHERE v.fechadeventa BETWEEN $1 AND $2';
            params.push(fechaInicio, fechaFin);
        }

        sql += ' ORDER BY v.fechadeventa DESC';

        const result = await db.query(sql, params);
        return result.rows;
    }

    // 3. REPORTE: Resumen Financiero
    static async obtenerResumenFinanciero(fechaInicio, fechaFin) {
        let sql = `
            SELECT 
                COUNT(id)::integer as "totalVentas",
                COALESCE(SUM(preciofinalventa), 0) as "totalRecaudado",
                COALESCE(SUM(gananciamuseodolares), 0) as "totalGananciaMuseo"
            FROM venta
        `;

        const params = [];
        if (fechaInicio && fechaFin) {
            sql += ' WHERE fechadeventa BETWEEN $1 AND $2';
            params.push(fechaInicio, fechaFin);
        }

        const result = await db.query(sql, params);
        return result.rows[0];
    }

    // 4. DASHBOARD: Total histórico recaudado por el museo (suma de precioFinalVenta)
    static async totalRecaudado() {
        // Sumamos todo lo que hay en la columna precioFinalVenta
        const sql = 'SELECT COALESCE(SUM(preciofinalventa), 0) as total FROM venta';
        const result = await db.query(sql);
        // Devolvemos el número limpio 
        return result.rows[0].total;
    }

    // 5. DASHBOARD: Total histórico de ganancia del museo
    static async totalGananciaMuseo() {
        const sql = 'SELECT COALESCE(SUM(gananciamuseodolares), 0) as total FROM venta';
        const result = await db.query(sql);
        return result.rows[0].total;
    }

    static async listarFacturas(filtros = {}) {
        const condiciones = [];
        const params = [];
        let paramIdx = 1;

        const nombre = filtros.nombre ? String(filtros.nombre).trim() : '';
        const fechaInicio = filtros.fechaInicio ? String(filtros.fechaInicio).trim() : '';
        const fechaFin = filtros.fechaFin ? String(filtros.fechaFin).trim() : '';

        if (nombre) {
             // Buscamos por nombre, apellido, nombre completo O código de factura
            condiciones.push(`(u.nombre LIKE $${paramIdx} OR u.apellido LIKE $${paramIdx + 1} OR CONCAT(u.nombre, ' ', u.apellido) LIKE $${paramIdx + 2} OR v.codigodefactura LIKE $${paramIdx + 3})`);
            const term = `%${nombre}%`;
            params.push(term, term, term, term);
            paramIdx += 4;
        }

        if (fechaInicio && fechaFin) {
            condiciones.push(`v.fechadeventa >= $${paramIdx} AND v.fechadeventa < ($${paramIdx + 1}::date + INTERVAL '1 day')`);
            params.push(fechaInicio, fechaFin);
            paramIdx += 2;
        } else if (fechaInicio) {
            condiciones.push(`v.fechadeventa >= $${paramIdx}`);
            params.push(fechaInicio);
            paramIdx += 1;
        } else if (fechaFin) {
            condiciones.push(`v.fechadeventa < ($${paramIdx}::date + INTERVAL '1 day')`);
            params.push(fechaFin);
            paramIdx += 1;
        }

        let sql = `
            SELECT v.id, v.comprador_id, v.codigodefactura AS "codigoDeFactura", v.fechadeventa AS "fechaDeVenta", v.preciofinalventa AS "precioFinalVenta",
                   o.nombre AS nombre_obra,
                   u.nombre AS nombre_comprador, u.apellido AS apellido_comprador
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN usuario u ON v.comprador_id = u.id
        `;

        if (condiciones.length > 0) {
            sql += ' WHERE ' + condiciones.join(' AND ');
        }

        sql += ' ORDER BY v.fechadeventa DESC';

        const result = await db.query(sql, params);
        return result.rows;
    }

    static async obtenerFacturaPorId(id) {
        const sql = `
            SELECT v.id, v.comprador_id, v.administrador_id, v.obra_id, 
                   v.codigodefactura AS "codigoDeFactura", v.iva, 
                   v.gananciamuseodolares AS "gananciaMuseoDolares", 
                   v.gananciamuseoporcentaje AS "gananciaMuseoPorcentaje", 
                   v.preciofinalventa AS "precioFinalVenta", 
                   v.fechadeventa AS "fechaDeVenta", 
                   v.empresaenvio AS "empresaEnvio", 
                   v.pais, v.estado, v.ciudad, v.municipio, v.calle,
                   o.nombre AS nombre_obra, o.precioobra AS "precioObra", o.porcentajeganancia AS "porcentajeGanancia", o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   u.nombre AS nombre_comprador, u.apellido AS apellido_comprador,
                   u.cedula, u.gmail
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN artista a ON o.autor_id = a.id
            JOIN usuario u ON v.comprador_id = u.id
            WHERE v.id = $1
            LIMIT 1
        `;

        const result = await db.query(sql, [id]);
        return result.rows[0];
    }

    // Obtener ventas (facturas) por comprador
    static async obtenerPorComprador(compradorId) {
        const sql = `
            SELECT v.id as "ventaId", v.codigodefactura AS "codigoDeFactura", v.fechadeventa AS "fechaDeVenta", v.preciofinalventa AS "precioFinalVenta",
                   o.id as "obraId", o.nombre as nombre_obra, o.foto, o.precioobra AS "precioObra", o.estatus
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            WHERE v.comprador_id = $1
            ORDER BY v.fechadeventa DESC
        `;
        const result = await db.query(sql, [compradorId]);
        return result.rows;
    }
}

module.exports = VentaModel;