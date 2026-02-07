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
}

module.exports = VentaModel;