const db = require('../config/db');

class InfoCompradorModel {

    // 1. VALIDAR CÓDIGO (Usado en la compra de obra)
    static async buscarPorCodigo(codigo) {
        const query = 'SELECT * FROM info_comprador WHERE codigoSeguridad = ? LIMIT 1';
        const [rows] = await db.execute(query, [codigo]);
        return rows[0];
    }

    // 2. REGISTRAR MEMBRESÍA (Usado en el Registro del Usuario)
    static async crear(idUsuario, codigoSeguridad) {
        const connection = await db.getConnection(); 
        try {
            await connection.beginTransaction();

            const sqlInfo = `
                INSERT INTO info_comprador 
                (comprador_id, codigoSeguridad, estado, fechaGeneracion, pais) 
                VALUES (?, ?, 'Activo', CURDATE(), 'Venezuela')
            `;
            await connection.execute(sqlInfo, [idUsuario, codigoSeguridad]);

            const sqlMembresia = `
                INSERT INTO membresia 
                (comprador_id, montoPagado, fechaPago, estadoMembresia) 
                VALUES (?, 10, CURDATE(), 1)
            `;
            await connection.execute(sqlMembresia, [idUsuario]);

            await connection.commit();
            return true;

        } catch (error) {
            await connection.rollback();
            throw error;
        } finally {
            connection.release();
        }
    }

    // 3. REPORTE PARA EL ADMIN
    static async obtenerReportePorPeriodo(fechaInicio, fechaFin) {
        let sql = `
            SELECT i.Id, i.codigoSeguridad, i.fechaGeneracion, i.estado,
                   m.fechaPago, m.montoPagado,
                   u.nombre, u.apellido, u.cedula, u.gmail
            FROM info_comprador i
            JOIN usuario u ON i.comprador_id = u.id
            JOIN membresia m ON i.comprador_id = m.comprador_id
        `;
        
        const params = [];
        if (fechaInicio && fechaFin) {
            sql += ' WHERE m.fechaPago BETWEEN ? AND ?'; 
            params.push(fechaInicio, fechaFin);
        }
        
        sql += ' ORDER BY m.fechaPago DESC';

        const [rows] = await db.execute(sql, params);
        return rows;
    }

    // 4. DASHBOARD (Contar activos)
    static async contarActivas() {
        const [rows] = await db.execute("SELECT COUNT(*) as total FROM info_comprador WHERE estado = 'Activo'");
        return rows[0].total;
    }
}

module.exports = InfoCompradorModel;