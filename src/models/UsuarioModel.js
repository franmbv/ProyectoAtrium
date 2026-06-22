const db = require('../config/db');

class UsuarioModel {

    // 1. Método para Registrar un Nuevo Usuario
    static async crear(datos, rol = 2) {
        try {
            const query = `
                INSERT INTO usuario 
                (rol_id, nombre, apellido, cedula, gmail, login, password, fecharegistro) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_DATE) RETURNING id
            `;
            
            const result = await db.query(query, [
                rol,
                datos.nombre,
                datos.apellido,
                datos.cedula,
                datos.gmail,
                datos.login,
                datos.password 
            ]);

            return result.rows[0].id;

        } catch (error) {
            throw error; 
        }
    }

    // 2. Método para Buscar por Login (Para el proceso de Autenticación)
    static async buscarPorLogin(login) {
        const query = `SELECT id, rol_id AS "rol_id", nombre, apellido, cedula, gmail, login, password, fecharegistro AS "fechaRegistro" FROM usuario WHERE login = $1`;
        const result = await db.query(query, [login]);
        
        return result.rows[0];
    }

    // 3. Método auxiliar para verificar duplicados antes de registrar
    static async buscarPorEmail(email) {
        const query = `SELECT id, rol_id AS "rol_id", nombre, apellido, cedula, gmail, login, password, fecharegistro AS "fechaRegistro" FROM usuario WHERE gmail = $1`;
        const result = await db.query(query, [email]);
        return result.rows[0];
    }
    
    // 4. Método para buscar por ID (Útil para las variables de sesión)
    static async buscarPorId(id) {
        const query = `SELECT id, rol_id AS "rol_id", nombre, apellido, cedula, gmail, login, password, fecharegistro AS "fechaRegistro" FROM usuario WHERE id = $1`;
        const result = await db.query(query, [id]);
        return result.rows[0];
    }

    //5. Obtener las preguntas y respuestas de un usuario
    static async obtenerPreguntasSeguridad(usuarioId) {
        const sql = `
            SELECT 
                cp.pregunta, 
                aqc.respuesta 
            FROM asignacion_q_comprador aqc
            JOIN catalogopreguntas cp ON aqc.pregunta_id = cp.id
            WHERE aqc.comprador_id = $1
        `;
        
        const result = await db.query(sql, [usuarioId]);
        return result.rows; 
    }

    // 6. Obtener el catálogo de preguntas (Para mostrar en el formulario de registro)
    static async obtenerCatalogoPreguntas() {
        const sql = `SELECT id AS "Id", pregunta FROM catalogopreguntas ORDER BY id ASC`;
        const result = await db.query(sql);
        return result.rows;
    }

    // 7. Guardar las respuestas de un usuario nuevo
    static async guardarRespuestas(usuarioId, arrayIds, respuestasArray) {
        try {
            for (let i = 0; i < respuestasArray.length; i++) {
                const preguntaId = arrayIds[i]; 
                const respuestaUsuario = respuestasArray[i];

                const sql = `
                    INSERT INTO asignacion_q_comprador (pregunta_id, comprador_id, respuesta) 
                    VALUES ($1, $2, $3)
                `;
                await db.query(sql, [preguntaId, usuarioId, respuestaUsuario]);
            }
            return true;
        } catch (error) {
            console.error('Error al guardar respuestas:', error);
            throw error;
        }
    }

    // 8. Actualizar datos básicos del usuario (Nombre, Apellido, Gmail, Login y Password)
    static async actualizarDatosBasicos(id, datos) {
        let sql = `UPDATE usuario SET nombre=$1, apellido=$2, gmail=$3, login=$4 WHERE id=$5`;
        let params = [datos.nombre, datos.apellido, datos.gmail, datos.login, id];

        if (datos.password) {
            sql = `UPDATE usuario SET nombre=$1, apellido=$2, gmail=$3, login=$4, password=$5 WHERE id=$6`;
            params = [datos.nombre, datos.apellido, datos.gmail, datos.login, datos.password, id];
        }

        await db.query(sql, params);
        return true;
    }

    // 9. Obtener perfil completo (Datos básicos + Dirección)
    static async obtenerPerfilCompleto(idUsuario) {
        const sql = `
            SELECT 
                u.id, u.nombre, u.apellido, u.cedula, u.gmail, u.login, u.password, u.rol_id AS "rol_id",
                i.pais, i.estado_residencia, i.ciudad, i.municipio, i.calle
            FROM usuario u
            LEFT JOIN info_comprador i ON u.id = i.comprador_id
            WHERE u.id = $1
        `;
        const result = await db.query(sql, [idUsuario]);
        return result.rows[0];
    }

    // 10. Obtener todos los usuarios con rol de Super Admin
    static async obtenerTodosLosAdmins() {
        const sql = `
            SELECT id, nombre, apellido, cedula, gmail, login, rol_id AS "rol_id" 
            FROM usuario 
            WHERE rol_id IN (1, 3)
            ORDER BY rol_id ASC, apellido ASC
        `;
        const result = await db.query(sql);
        return result.rows;
    }

    // 11. Actualizar datos de otro admin desde el panel de Super Admin (sin cambiar contraseña)
    static async actualizarDesdeAdmin(id, datos) {
        const sql = `
            UPDATE usuario 
            SET nombre = $1, apellido = $2, gmail = $3, login = $4, rol_id = $5 
            WHERE id = $6
        `;
        const params = [datos.nombre, datos.apellido, datos.gmail, datos.login, datos.rol_id, id];
        await db.query(sql, params);
        return true;
    }

    // 12. Actualizar únicamente la contraseña de un usuario
    static async actualizarPassword(id, passwordHash) {
        const sql = `UPDATE usuario SET password = $1 WHERE id = $2`;
        await db.query(sql, [passwordHash, id]);
        return true;
    }
}

module.exports = UsuarioModel;