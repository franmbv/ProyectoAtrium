const { Pool } = require('pg');
require('dotenv').config();

let pool;

// Si existe DATABASE_URL (en Render), se conecta a Postgres en la nube
if (process.env.DATABASE_URL) {
    pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: {
            rejectUnauthorized: false // Obligatorio para que Render y Neon conecten seguro
        }
    });
} else {
    // Tu configuración local por si sigues desarrollando en tu PC
    pool = new Pool({
        user: 'tu_usuario_local',
        host: 'localhost',
        database: 'tu_bd_local',
        password: 'tu_password_local',
        port: 5432, 
    });
}

// Exportas el pool para usar .query() en tus controladores
module.exports = {
    query: (text, params) => pool.query(text, params),
};