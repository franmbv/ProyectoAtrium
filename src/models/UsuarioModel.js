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
}

module.exports = UsuarioModel;