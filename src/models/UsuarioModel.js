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

    // 8. Actualizar datos básicos del usuario (Nombre, Apellido, Gmail, Login y Password)
    static async actualizarDatosBasicos(id, datos) {
        let sql = `UPDATE usuario SET nombre=?, apellido=?, gmail=?, login=? WHERE id=?`;
        let params = [datos.nombre, datos.apellido, datos.gmail, datos.login, id];

        if (datos.password) {
            sql = `UPDATE usuario SET nombre=?, apellido=?, gmail=?, login=?, password=? WHERE id=?`;
            params = [datos.nombre, datos.apellido, datos.gmail, datos.login, datos.password, id];
        }

        await db.execute(sql, params);
        return true;
    }

    // 9. Obtener perfil completo (Datos básicos + Dirección)
    static async obtenerPerfilCompleto(idUsuario) {
        const sql = `
            SELECT 
                u.id, u.nombre, u.apellido, u.cedula, u.gmail, u.login, u.password, u.rol_id,
                i.pais, i.estado_residencia, i.ciudad, i.municipio, i.calle
            FROM usuario u
            LEFT JOIN info_comprador i ON u.id = i.comprador_id
            WHERE u.id = ?
        `;
        const [rows] = await db.execute(sql, [idUsuario]);
        return rows[0];
    }

    // 10. Obtener todos los usuarios con rol de Super Admin
    static async obtenerTodosLosAdmins() {
        const sql = `
            SELECT id, nombre, apellido, cedula, gmail, login, rol_id 
            FROM usuario 
            WHERE rol_id IN (1, 3)
            ORDER BY rol_id ASC, apellido ASC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // 11. Actualizar datos de otro admin desde el panel de Super Admin (sin cambiar contraseña)
    static async actualizarDesdeAdmin(id, datos) {
        const sql = `
            UPDATE usuario 
            SET nombre = ?, apellido = ?, gmail = ?, login = ?, rol_id = ? 
            WHERE id = ?
        `;
        const params = [datos.nombre, datos.apellido, datos.gmail, datos.login, datos.rol_id, id];
        await db.execute(sql, params);
        return true;
    }
}

module.exports = UsuarioModel;