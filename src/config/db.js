const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Helper de Ingeniería: Normaliza y mapea claves de PostgreSQL (minúsculas) a MySQL (CamelCase)
const normalizarClavesPostgres = (rows) => {
    if (!Array.isArray(rows)) return rows;

    // Mapa de traducción de minúsculas de Postgres a CamelCase original de su proyecto
    const camelCaseMap = {
        'id': 'Id',
        'precioobra': 'precioObra',
        'porcentajeganancia': 'porcentajeGanancia',
        'fechanac': 'fechaNac',
        'fechafal': 'fechaFal',
        'tipoarcilla': 'tipoArcilla',
        'temperaturacoccion': 'temperaturaCoccion',
        'tipoesmalte': 'tipoEsmalte',
        'piedrapreciosa': 'piedraPreciosa'
    };

    return rows.map(row => {
        // Clonar el objeto original
        const rowNormalizado = { ...row };
        
        // Inyectar de forma transparente las propiedades en mayúsculas para compatibilidad total con EJS
        Object.keys(row).forEach(key => {
            const claveCamel = camelCaseMap[key];
            if (claveCamel && row[claveCamel] === undefined) {
                rowNormalizado[claveCamel] = row[key]; // Ejemplo: rowNormalizado['precioObra'] = row['precioobra']
            }
        });
        return rowNormalizado;
    });
};

module.exports = {
    query: (text, params) => pool.query(text, params),
    connect: async () => {
        const client = await pool.connect();
        
        // Sobreescribir el método query del cliente de transacción para que también normalice las claves
        const originalQuery = client.query;
        client.query = async function(...args) {
            const res = await originalQuery.apply(client, args);
            if (res && res.rows) {
                res.rows = normalizarClavesPostgres(res.rows);
            }
            return res;
        };
        return client;
    },
    
    // ADAPTADOR PREMIUM CON TRADUCTOR DE DIALECTO Y NORMALIZADOR DE CLAVES DINÁMICO
    execute: async (text, params = []) => {
        let index = 1;
        let postgresText = text.replace(/\?/g, () => `$${index++}`);
        
        const esInsercion = postgresText.trim().toUpperCase().startsWith('INSERT');
        
        if (esInsercion) {
            try {
                const textWithReturning = postgresText + ' RETURNING id';
                const result = await pool.query(textWithReturning, params);
                const rows = normalizarClavesPostgres(result.rows);
                
                const insertId = rows.length > 0 ? (rows[0].id || rows[0].Id) : null;
                
                return [{ insertId, affectedRows: result.rowCount }, result.fields];
            } catch (err) {
                if (err.code === '42703') {
                    const result = await pool.query(postgresText, params);
                    return [{ insertId: null, affectedRows: result.rowCount }, result.fields];
                }
                throw err;
            }
        } else {
            // Caso estándar (SELECT, UPDATE, DELETE): Normalizamos todas las filas antes de retornarlas
            const result = await pool.query(postgresText, params);
            const rowsNormalizadas = normalizarClavesPostgres(result.rows);
            // Para UPDATE/DELETE sin RETURNING: no hay filas, pero sí affectedRows
            if (rowsNormalizadas.length === 0 && result.rowCount > 0) {
                return [{ affectedRows: result.rowCount }, result.fields];
            }
            return [rowsNormalizadas, result.fields];
        }
    }
};