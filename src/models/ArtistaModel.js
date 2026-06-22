const db = require('../config/db');

class ArtistaModel {
    
    // 1. PARA LA TABLA DE GESTIÓN: Trae a todos (Activos e Inactivos)
    static async listar() {
        const result = await db.query('SELECT * FROM artista ORDER BY nombre ASC');
        return result.rows;
    }

    // 2. PARA SELECTS Y GALERÍA: Trae solo los que pueden vender/aparecer
    static async listarActivos() {
        const result = await db.query("SELECT * FROM artista WHERE estado = 'Activo' ORDER BY nombre ASC");
        return result.rows;
    }

    // ---  Validar si existe la combinación nombre/apellido (Ignora mayúsculas/minúsculas) ---
    static async existeNombreCompleto(nombre, apellido) {
        const sql = 'SELECT id FROM artista WHERE LOWER(nombre) = LOWER($1) AND LOWER(apellido) = LOWER($2) LIMIT 1';
        const result = await db.query(sql, [nombre, apellido]);
        return result.rows.length > 0;
    }

    // ---  Validar duplicados al editar (Verifica si el nombre ya lo tiene OTRO artista) ---
    static async existeNombreCompletoExceptoId(nombre, apellido, id) {
        const sql = 'SELECT id FROM artista WHERE LOWER(nombre) = LOWER($1) AND LOWER(apellido) = LOWER($2) AND id <> $3 LIMIT 1';
        const result = await db.query(sql, [nombre, apellido, id]);
        return result.rows.length > 0;
    }

    // Buscar uno por ID (Para edición y perfil público)
    static async obtenerPorId(id) {
        const result = await db.query('SELECT * FROM artista WHERE id = $1', [id]);
        return result.rows[0];
    }

    // Crear nuevo artista
    static async crear(datos, foto) {
        const sql = `INSERT INTO artista (nombre, apellido, fechanac, fechafal, nacionalidad, descripcion, fotografia)
                     VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`;
        const result = await db.query(sql, [
            datos.nombre, 
            datos.apellido, 
            datos.fechaNac || null, 
            datos.fechaFal || null, 
            datos.nacionalidad, 
            datos.biografia, 
            foto
        ]);
        return result.rows[0].id;
    }

    // Actualizar artista existente
    static async actualizar(id, datos, nuevaFoto) {
        let sql;
        let params;

        if (nuevaFoto) {
            // Si hay foto nueva, actualizamos todo (Columna: fotografia sin acento)
            sql = `UPDATE artista SET nombre=$1, apellido=$2, fechanac=$3, fechafal=$4, nacionalidad=$5, descripcion=$6, fotografia=$7 WHERE id=$8`;
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
            sql = `UPDATE artista SET nombre=$1, apellido=$2, fechanac=$3, fechafal=$4, nacionalidad=$5, descripcion=$6 WHERE id=$7`;
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

        await db.query(sql, params);
    }

    // Cambia a Inactivo (Borrado Lógico)
    static async eliminarLogico(id) {
        const sql = `UPDATE artista SET estado = 'Inactivo' WHERE id = $1`;
        await db.query(sql, [id]);
    }

    // Vuelve a Activo (Reactivación)
    static async activarLogico(id) {
        const sql = `UPDATE artista SET estado = 'Activo' WHERE id = $1`;
        await db.query(sql, [id]);
    }
}

module.exports = ArtistaModel;