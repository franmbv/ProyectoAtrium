const db = require('../config/db');

class UsuarioModel {

    // 1. Método para Registrar un Nuevo Usuario
    static async crear(datos, rol = 2) {
        try {
            const query = `
                INSERT INTO Usuario 
                (rol_id, nombre, apellido, cedula, gmail, login, password, fechaRegistro) 
                VALUES (?, ?, ?, ?, ?, ?, ?, CURDATE())
            `;
            
            const [result] = await db.execute(query, [
                rol,
                datos.nombre,
                datos.apellido,
                datos.cedula,
                datos.gmail,
                datos.login,
                datos.password 
            ]);

            return result.insertId;

        } catch (error) {
            throw error; 
        }
    }

    // 2. Método para Buscar por Login (Para el proceso de Autenticación)
    static async buscarPorLogin(login) {
        const query = `SELECT * FROM Usuario WHERE login = ?`;
        const [rows] = await db.execute(query, [login]);
        
        return rows[0];
    }

    // 3. Método auxiliar para verificar duplicados antes de registrar
    static async buscarPorEmail(email) {
        const query = `SELECT * FROM Usuario WHERE gmail = ?`;
        const [rows] = await db.execute(query, [email]);
        return rows[0];
    }
    
    // 4. Método para buscar por ID (Útil para las variables de sesión)
    static async buscarPorId(id) {
        const query = `SELECT * FROM Usuario WHERE id = ?`;
        const [rows] = await db.execute(query, [id]);
        return rows[0];
    }

    //5. Obtener las preguntas y respuestas de un usuario
    static async obtenerPreguntasSeguridad(usuarioId) {
        const sql = `
            SELECT 
                cp.pregunta, 
                aqc.respuesta 
            FROM asignacion_q_comprador aqc
            JOIN catalogopreguntas cp ON aqc.pregunta_id = cp.Id
            WHERE aqc.comprador_id = ?
        `;
        
        const [rows] = await db.execute(sql, [usuarioId]);
        return rows; 
    }

    // 6. Obtener el catálogo de preguntas (Para mostrar en el formulario de registro)
    static async obtenerCatalogoPreguntas() {
        const sql = `SELECT Id, pregunta FROM catalogopreguntas ORDER BY Id ASC`;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // 7. Guardar las respuestas de un usuario nuevo
    static async guardarRespuestas(usuarioId, arrayIds, respuestasArray) {
        try {
            for (let i = 0; i < respuestasArray.length; i++) {
                const preguntaId = arrayIds[i]; 
                const respuestaUsuario = respuestasArray[i];

                const sql = `
                    INSERT INTO asignacion_q_comprador (pregunta_id, comprador_id, respuesta) 
                    VALUES (?, ?, ?)
                `;
                await db.execute(sql, [preguntaId, usuarioId, respuestaUsuario]);
            }
            return true;
        } catch (error) {
            console.error('Error al guardar respuestas:', error);
            throw error;
        }
    }

    // Método profesional para cambiar el estado del usuario (Baja/Alta)
    static async cambiarEstado(id, nuevoEstado) {
        const sql = `UPDATE usuario SET estado = ? WHERE id = ?`;
        const [result] = await db.execute(sql, [nuevoEstado, id]);
        return result.affectedRows > 0;
    }

}

module.exports = UsuarioModel;