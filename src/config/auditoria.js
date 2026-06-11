const axios = require('axios');

const auditoriaApiUrl = process.env.AUDITORIA_API_URL || 'http://127.0.0.1:8080';

/**
 * Envia un evento de auditoría al microservicio de Python.
 * @param {string} endpoint - La ruta del endpoint (ej. '/seguridad/logs')
 * @param {object} datos - El payload del evento
 */
const enviarAuditoria = async (endpoint, datos) => {
    try {
        await axios.post(`${auditoriaApiUrl}${endpoint}`, datos);
    } catch (error) {
        console.error(`Error enviando auditoría a ${endpoint}:`, error.message);
    }
};

module.exports = { enviarAuditoria };