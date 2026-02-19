const { GoogleGenerativeAI } = require("@google/generative-ai");
require('dotenv').config();

async function listModels() {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY.trim());
    try {
        const models = await genAI.getGenerativeModel({ model: "gemini-pro" }); // Intenta el básico
        console.log("Conexión exitosa. Tu cuenta acepta 'gemini-pro'");
    } catch (e) {
        console.error("Tu API KEY no soporta los modelos actuales o está mal configurada.");
        console.error("Mensaje de Google:", e.message);
    }
}
listModels();