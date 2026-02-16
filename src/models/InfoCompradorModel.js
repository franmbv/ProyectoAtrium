const db = require('../config/db');

class InfoCompradorModel {

    // 1. VALIDAR CÓDIGO (Usado en la compra de obra)
    static async buscarPorCodigoyUsuario(codigo, comprador_id) {
        const query = 'SELECT * FROM info_comprador WHERE codigoSeguridad = ? AND comprador_id = ? LIMIT 1';
        const [rows] = await db.execute(query, [codigo, comprador_id]);
        return rows[0];
    }

    // 1b. OBTENER INFO DEL COMPRADOR POR USUARIO
    static async obtenerPorCompradorId(compradorId) {
        const sql = 'SELECT * FROM info_comprador WHERE comprador_id = ? LIMIT 1';
        const [rows] = await db.execute(sql, [compradorId]);
        return rows[0];
    }

    // 2. REGISTRAR MEMBRESÍA (Usado en el Registro del Usuario)
    static async crear(idUsuario, codigoSeguridad, nroTarjeta) {
        const connection = await db.getConnection(); 
        try {
            await connection.beginTransaction();

            const sqlInfo = `
                INSERT INTO info_comprador 
                (comprador_id, codigoSeguridad, nroTarjeta, estado, fechaGeneracion, pais) 
                VALUES (?, ?, ?, 'Activo', CURDATE(), 'Venezuela')
            `;
            await connection.execute(sqlInfo, [idUsuario, codigoSeguridad, nroTarjeta]);

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
            SELECT i.comprador_id AS Id, i.codigoSeguridad, i.fechaGeneracion, i.estado,
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


    // 5. ACTUALIZAR CÓDIGOS 
    static async actualizarCodigo(compradorId, nuevoCodigo) {
        const sql = 'UPDATE info_comprador SET codigoSeguridad = ? WHERE comprador_id = ?';
        await db.execute(sql, [nuevoCodigo, compradorId]);
        return true;
    }

    // 6. ACTUALIZAR DIRECCION DEL COMPRADOR
    static async actualizarDireccion(compradorId, direccion) {
        const sql = `
            UPDATE info_comprador
            SET pais = ?, estado = ?, ciudad = ?, municipio = ?, calle = ?
            WHERE comprador_id = ?
        `;

        const params = [
            direccion.pais,
            direccion.estado,
            direccion.ciudad,
            direccion.municipio,
            direccion.calle,
            compradorId
        ];

        await db.execute(sql, params);
        return true;
    }
}

module.exports = InfoCompradorModel;
