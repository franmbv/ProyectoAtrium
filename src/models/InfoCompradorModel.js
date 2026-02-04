const db = require('../config/db');

class InfoCompradorModel {
    
    // Método para buscar si existe un comprador con cierto código de seguridad
    static async buscarPorCodigo(codigo) {
        const query = 'SELECT * FROM info_comprador WHERE codigoSeguridad = ?';
        
        const [rows] = await db.execute(query, [codigo]);
        
        return rows[0];
    }
}

module.exports = InfoCompradorModel;