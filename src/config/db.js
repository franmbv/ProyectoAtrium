const mysql = require('mysql2');
require('dotenv').config(); 

// Configuración del Pool de conexiones según el estándar de la cátedra
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME,
    waitForConnections: true, 
    connectionLimit: 10,       
    queueLimit: 0              
});

// Mensaje de consola para saber a dónde te estás conectando realmente
pool.getConnection((error, connection) => {
    if (error) {
        console.error('❌ Error de conexión:', error.message);
    } else {
        console.log('✅ Conectado a la Base de Datos: ' + process.env.DB_NAME);
        connection.release();
    }
});


pool.getConnection((error, connection) => {
    if (error) throw error;
    console.log('Conectado a MySQL exitosamente');
    connection.release();
});

module.exports = pool.promise();