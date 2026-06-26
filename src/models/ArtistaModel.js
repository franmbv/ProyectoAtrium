const db = require('../config/db');

class ArtistaModel {
    
    // 1. PARA LA TABLA DE GESTIÓN: Trae a todos los artistas con sus obras asociadas agrupadas (Corregido 'genero' singular)
    static async listar() {
        const sql = `
            SELECT a.id, a.nombre, a.apellido, a.fechaNac, a.fechaFal, a.nacionalidad, a.descripcion, a.fotografia, a.estado,
                   COALESCE(string_agg(o.nombre, ' | '), '') as obras_asociadas
            FROM artista a
            LEFT JOIN obra o ON a.id = o.autor_id
            GROUP BY a.id, a.nombre, a.apellido, a.fechaNac, a.fechaFal, a.nacionalidad, a.descripcion, a.fotografia, a.estado
            ORDER BY a.nombre ASC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // 2. PARA SELECTS Y GALERÍA: Trae solo los que están Activos
    static async listarActivos() {
        const [rows] = await db.execute("SELECT * FROM artista WHERE estado = 'Ativo' OR estado = 'Activo' ORDER BY nombre ASC");
        return rows;
    }

    // Validar si existe la combinación nombre/apellido
    static async existeNombreCompleto(nombre, apellido) {
        const sql = 'SELECT id FROM artista WHERE LOWER(nombre) = LOWER(?) AND LOWER(apellido) = LOWER(?) LIMIT 1';
        const [rows] = await db.execute(sql, [nombre, apellido]);
        return rows.length > 0;
    }

    // Validar duplicados al editar (ignora el ID del artista actual)
    static async existeNombreCompletoExceptoId(nombre, apellido, id) {
        const sql = 'SELECT id FROM artista WHERE LOWER(nombre) = LOWER(?) AND LOWER(apellido) = LOWER(?) AND id <> ? LIMIT 1';
        const [rows] = await db.execute(sql, [nombre, apellido, id]);
        return rows.length > 0;
    }

    // Buscar uno por ID
    static async obtenerPorId(id) {
        const [rows] = await db.execute('SELECT * FROM artista WHERE id = ?', [id]);
        return rows[0];
    }

    // Crear nuevo artista
    static async crear(datos, foto) {
        const sql = `INSERT INTO artista (nombre, apellido, fechaNac, fechaFal, nacionalidad, descripcion, fotografia)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        const [result] = await db.execute(sql, [
            datos.nombre, 
            datos.apellido, 
            datos.fechaNac || null, 
            datos.fechaFal || null, 
            datos.nacionalidad, 
            datos.biografia, 
            foto
        ]);
        return result.insertId;
    }

    // Actualizar artista existente
    static async actualizar(id, datos, nuevaFoto) {
        let sql;
        let params;

        if (nuevaFoto) {
            sql = `UPDATE artista SET nombre=?, apellido=?, fechaNac=?, fechaFal=?, nacionalidad=?, descripcion=?, fotografia=? WHERE id=?`;
            params = [
                datos.nombre, 
                datos.apellido, 
                datos.fechaNac || null, 
                datos.fechaFal || null, 
                datos.nacionalidad, 
                datos.biografia, 
                nuevaFoto, 
                id
            ];
        } else {
            sql = `UPDATE artista SET nombre=?, apellido=?, fechaNac=?, fechaFal=?, nacionalidad=?, descripcion=? WHERE id=?`;
            params = [
                datos.nombre, 
                datos.apellido, 
                datos.fechaNac || null, 
                datos.fechaFal || null, 
                datos.nacionalidad, 
                datos.biografia, 
                id
            ];
        }

        await db.execute(sql, params);
    }

    // Cambia a Inactivo (Borrado Lógico)
    static async eliminarLogico(id) {
        const sql = `UPDATE artista SET estado = 'Inactivo' WHERE id = ?`;
        await db.execute(sql, [id]);
    }

    // Vuelve a Activo (Reactivación)
    static async activarLogico(id) {
        const sql = `UPDATE artista SET estado = 'Activo' WHERE id = ?`;
        await db.execute(sql, [id]);
    }
}

module.exports = ArtistaModel;