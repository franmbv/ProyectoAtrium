const db = require('../config/db');

const Venta = {
    // 1. Insertar la factura final en la tabla 'venta'
    crear: async (datos) => {
        const sql = `INSERT INTO venta 
            (comprador_id, administrador_id, obra_id, direccion_id, codigoDeFactura, iva, 
             gananciaMuseoDolares, gananciaMuseoPorcentaje, precioFinalVenta, fechaDeVenta, empresaEnvio) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?)`;
        
        return await db.execute(sql, [
            datos.comprador_id, datos.admin_id, datos.obra_id, datos.direccion_id,
            datos.codigo, datos.iva, datos.gananciaDolar, datos.gananciaPorc, 
            datos.precioFinal, datos.empresaEnvio
        ]);
    },

    // 2. Reporte: Listado detallado de obras vendidas en un periodo
    obtenerVentasPorPeriodo: async (fechaInicio, fechaFin) => {
        const sql = `
            SELECT v.*, o.nombre AS nombre_obra, u.nombre AS nombre_comprador 
            FROM venta v
            JOIN obra o ON v.obra_id = o.id
            JOIN usuario u ON v.comprador_id = u.id
            WHERE v.fechaDeVenta BETWEEN ? AND ?
            ORDER BY v.fechaDeVenta DESC`;
        const [rows] = await db.execute(sql, [fechaInicio, fechaFin]);
        return rows;
    },

    // 3. Reporte: Resumen financiero (Uso de SUM para totales)
    obtenerResumenFinanciero: async (fechaInicio, fechaFin) => {
        const sql = `
            SELECT 
                COUNT(id) as totalVentas,
                SUM(precioFinalVenta) as totalRecaudado,
                SUM(gananciaMuseoDolares) as totalGananciaMuseo
            FROM venta 
            WHERE fechaDeVenta BETWEEN ? AND ?`;
        const [rows] = await db.execute(sql, [fechaInicio, fechaFin]);
        return rows[0];
    },

    // 4. Reporte: Resumen de membresías (Requisito del PDF)
    obtenerMembresiasPorPeriodo: async (fechaInicio, fechaFin) => {
        const sql = `
            SELECT m.*, u.nombre, u.apellido 
            FROM membresia m
            JOIN usuario u ON m.comprador_id = u.id
            WHERE m.fechaPago BETWEEN ? AND ?`;
        const [rows] = await db.execute(sql, [fechaInicio, fechaFin]);
        return rows;
    }
};

module.exports = Venta;