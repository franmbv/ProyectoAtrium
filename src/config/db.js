const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

module.exports = {
    query: (text, params) => pool.query(text, params),
    connect: () => pool.connect(),
    
    // ADAPTADOR INTELIGENTE CON TOLERANCIA A FALLOS DE COLUMNAS DE RETORNO
    execute: async (text, params = []) => {
        let index = 1;
        let postgresText = text.replace(/\?/g, () => `$${index++}`);
        
        const esInsercion = postgresText.trim().toUpperCase().startsWith('INSERT');
        
        if (esInsercion) {
            try {
                // 1. Intentar la inserción asumiendo que la tabla tiene una secuencia 'id'
                const textWithReturning = postgresText + ' RETURNING id';
                const result = await pool.query(textWithReturning, params);
                const rows = result.rows;
                
                // Buscar el ID en mayúscula o minúscula de forma tolerante
                const insertId = rows.length > 0 ? (rows[0].id || rows[0].Id) : null;
                
                return [{ insertId, affectedRows: result.rowCount }, result.fields];
            } catch (err) {
                // 2. RECUPERACIÓN EN CALIENTE: Si el error es '42703' (la columna id no existe en esta tabla hija)
                // se re-ejecuta la inserción limpia sin RETURNING
                if (err.code === '42703') {
                    const result = await pool.query(postgresText, params);
                    return [{ insertId: null, affectedRows: result.rowCount }, result.fields];
                }
                // Si es otro tipo de error, propagarlo normalmente
                throw err;
            }
        } else {
            // Caso estándar (SELECT, UPDATE, DELETE)
            const result = await pool.query(postgresText, params);
            return [result.rows, result.fields];
        }
    }
};