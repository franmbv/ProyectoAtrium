const db = require('../config/db');

const toDbValue = (value, fallback = null) => {
    if (value === undefined) return fallback;
    if (value === null) return null;
    if (typeof value === 'string') {
        const trimmed = value.trim();
        return trimmed === '' ? fallback : trimmed;
    }
    return value;
};

class InfoCompradorModel {

    // 1. VALIDAR CÓDIGO (Usado en la compra de obra)
    static async buscarPorCodigoyUsuario(codigo, comprador_id) {
        const query = 'SELECT * FROM info_comprador WHERE codigoseguridad = $1 AND comprador_id = $2 LIMIT 1';
        const result = await db.query(query, [codigo, comprador_id]);
        return result.rows[0];
    }

    // 1b. OBTENER INFO DEL COMPRADOR POR USUARIO
    static async obtenerPorCompradorId(compradorId) {
        const sql = 'SELECT * FROM info_comprador WHERE comprador_id = $1 LIMIT 1';
        const result = await db.query(sql, [compradorId]);
        return result.rows[0];
    }

    // 2. REGISTRAR MEMBRESÍA (Usado en el Registro del Usuario)
    static async crear(idUsuario, codigoSeguridad, nroTarjeta, direccion) {
        const client = await db.connect(); 
        try {
            await client.query('BEGIN');

            const sqlInfo = `
                INSERT INTO info_comprador 
                (comprador_id, codigoseguridad, nrotarjeta, estado, fechageneracion, pais, estado_residencia, ciudad, municipio, calle) 
                VALUES ($1, $2, $3, 'Activo', CURRENT_DATE, $4, $5, $6, $7, $8)
            `;

            const paramsInfo = [
                idUsuario, 
                codigoSeguridad, 
                nroTarjeta,
                toDbValue(direccion?.pais, 'Venezuela'),
                toDbValue(direccion?.estado_residencia, 'Pendiente'),
                toDbValue(direccion?.ciudad, 'Pendiente'),
                toDbValue(direccion?.municipio, 'Pendiente'),
                toDbValue(direccion?.calle, 'Pendiente')
            ];

            await client.query(sqlInfo, paramsInfo);

            const sqlMembresia = `
                INSERT INTO membresia 
                (comprador_id, montopagado, fechapago, estadomembresia) 
                VALUES ($1, 10, CURRENT_DATE, 1)
            `;
            await client.query(sqlMembresia, [idUsuario]);

            await client.query('COMMIT');
            return true;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }

    // 3. REPORTE PARA EL ADMIN
    static async obtenerReportePorPeriodo(fechaInicio, fechaFin) {
        let sql = `
            SELECT i.comprador_id AS "Id", i.codigoseguridad AS "codigoSeguridad", i.fechageneracion AS "fechaGeneracion", i.estado,
                   m.fechapago AS "fechaPago", m.montopagado AS "montoPagado",
                   u.nombre, u.apellido, u.cedula, u.gmail
            FROM info_comprador i
            JOIN usuario u ON i.comprador_id = u.id
            JOIN membresia m ON i.comprador_id = m.comprador_id
        `;
        
        const params = [];
        if (fechaInicio && fechaFin) {
            sql += ' WHERE m.fechapago BETWEEN $1 AND $2'; 
            params.push(fechaInicio, fechaFin);
        }
        
        sql += ' ORDER BY m.fechapago DESC';

        const result = await db.query(sql, params);
        return result.rows;
    }

    // 4. DASHBOARD (Contar activos)
    static async contarActivas() {
        const result = await db.query("SELECT COUNT(*)::integer as total FROM info_comprador WHERE estado = 'Activo'");
        return result.rows[0].total;
    }


    // 5. ACTUALIZAR CÓDIGOS 
    static async actualizarCodigo(compradorId, nuevoCodigo) {
        const sql = 'UPDATE info_comprador SET codigoseguridad = $1 WHERE comprador_id = $2';
        await db.query(sql, [nuevoCodigo, compradorId]);
        return true;
    }

    // 6. ACTUALIZAR DIRECCION DEL COMPRADOR
    static async actualizarDireccion(compradorId, direccion) {
        const sql = `
            UPDATE info_comprador
            SET pais = $1, estado_residencia = $2, ciudad = $3, municipio = $4, calle = $5
            WHERE comprador_id = $6
        `;

        const params = [
            toDbValue(direccion?.pais, 'Venezuela'),
            toDbValue(direccion?.estado_residencia, 'Pendiente'),
            toDbValue(direccion?.ciudad, 'Pendiente'),
            toDbValue(direccion?.municipio, 'Pendiente'),
            toDbValue(direccion?.calle, 'Pendiente'),
            toDbValue(compradorId)
        ];

        await db.query(sql, params);
        return true;
    }
}

module.exports = InfoCompradorModel;