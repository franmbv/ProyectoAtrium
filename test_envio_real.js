// test_envio_real.js
const axios = require('axios');
const PIPEDREAM_WEBHOOK_URL = 'https://eohrdn5fy55jqme.m.pipedream.net';

async function testEmail() {
    console.log("Intentando enviar correo de prueba...");
    try {
        const payload = {
            email: "t46846570@gmail.com", // El email verificado en Resend/Gmail
            subject: "PRUEBA DE DIAGNÓSTICO ATRIUM",
            html: "<h1>Si lees esto, el puente de Pipedream funciona.</h1>"
        };
        
        const response = await axios.post(PIPEDREAM_WEBHOOK_URL, payload);
        console.log("Respuesta de Pipedream:", response.status, response.data);
    } catch (error) {
        console.error("Error en el envío:", error.response ? error.response.data : error.message);
    }
}
testEmail();