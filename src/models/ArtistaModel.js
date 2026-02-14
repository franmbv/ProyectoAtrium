const db = require('../config/db');

class ArtistaModel {
    
    // 1. PARA LA TABLA DE GESTIÓN: Trae a todos (Activos e Inactivos)
    static async listar() {
        const [rows] = await db.execute('SELECT * FROM artista ORDER BY nombre ASC');
        return rows;
    }

    // 2. PARA SELECTS Y GALERÍA: Trae solo los que pueden vender/aparecer
    static async listarActivos() {
        const [rows] = await db.execute('SELECT * FROM artista WHERE estado = "Activo" ORDER BY nombre ASC');
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
            // Si hay foto nueva, actualizamos todo (Columna: fotografia sin acento)
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