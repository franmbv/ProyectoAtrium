const db = require('../config/db');

class ArtistaModel {
    
    // Listar todos (Para los selects y la tabla de gestión)
    static async listar() {
        const [rows] = await db.execute('SELECT * FROM artista ORDER BY nombre ASC');
        return rows;
    }

    // Buscar uno por ID (Para edición y perfil público)
    static async obtenerPorId(id) {
        const [rows] = await db.execute('SELECT * FROM artista WHERE id = ?', [id]);
        return rows[0];
    }

    // Crear nuevo artista
    static async crear(datos, foto) {
        const sql = `INSERT INTO artista (nombre, apellido, fechaNac, fechaFal, nacionalidad, descripcion, fotografia)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await db.execute(sql, [
            datos.nombre, 
            datos.apellido, 
            datos.fechaNac || null, 
            datos.fechaFal || null, 
            datos.nacionalidad, 
            datos.biografia, 
            foto
        ]);
    }

    // Actualizar artista existente
    static async actualizar(id, datos, nuevaFoto) {
        let sql;
        let params;

        if (nuevaFoto) {
            // Si hay foto nueva, actualizamos todo
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
            // Si no hay foto nueva, mantenemos la anterior
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

    // Eliminar artista
    static async eliminar(id) {
        await db.execute('DELETE FROM artista WHERE id = ?', [id]);
    }
}

module.exports = ArtistaModel;