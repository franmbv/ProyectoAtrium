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

    // 2. REGISTRAR MEMBRESÍA (Usado en el Registro del Usuario - Transacción PostgreSQL)
    static async crear(idUsuario, codigoSeguridad, nroTarjeta, direccion) {
        // Adquirir un cliente aislado del pool de pg para la transacción
        const client = await db.connect(); 
        try {
            await client.query('BEGIN');

            const sqlInfo = `
                INSERT INTO info_comprador 
                (comprador_id, codigoSeguridad, nroTarjeta, estado, fechaGeneracion, pais, estado_residencia, ciudad, municipio, calle) 
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
                (comprador_id, montoPagado, fechaPago, estadoMembresia) 
                VALUES ($1, 10, CURRENT_DATE, 1)
            `;
            await client.query(sqlMembresia, [idUsuario]);

            await client.query('COMMIT');
            return true;

        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release(); // Liberar el cliente de vuelta al pool
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
            SET pais = ?, estado_residencia = ?, ciudad = ?, municipio = ?, calle = ?
            WHERE comprador_id = ?
        `;

        const params = [
            toDbValue(direccion?.pais, 'Venezuela'),
            toDbValue(direccion?.estado_residencia, 'Pendiente'),
            toDbValue(direccion?.ciudad, 'Pendiente'),
            toDbValue(direccion?.municipio, 'Pendiente'),
            toDbValue(direccion?.calle, 'Pendiente'),
            toDbValue(compradorId)
        ];

        await db.execute(sql, params);
        return true;
    }
}

module.exports = InfoCompradorModel;