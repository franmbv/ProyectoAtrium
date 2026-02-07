const db = require('../config/db');

class ArtistaModel {
    static async listar() {
        const [rows] = await db.execute('SELECT id, nombre, apellido FROM artista ORDER BY nombre ASC');
        return rows;
    }

    static async crear(datos, foto) {
        const sql = `INSERT INTO artista (nombre, apellido, fechaNac, fechaFal, nacionalidad, descripcion, fotografia)
                     VALUES (?, ?, ?, ?, ?, ?, ?)`;
        await db.execute(sql, [datos.nombre, datos.apellido, datos.fechaNac, datos.fechaFal, datos.nacionalidad, datos.biografia, foto]);
    }
}
module.exports = ArtistaModel;