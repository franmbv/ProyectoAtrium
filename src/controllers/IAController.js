const axios = require('axios');
require('dotenv').config();

const IAController = {
    generarBiografia: async (req, res) => {
        try {
            const { nombre, apellido, nacionalidad } = req.body;
            const apiKey = process.env.GROQ_API_KEY;

            if (!apiKey) return res.status(500).json({ error: "Falta la API KEY de Groq." });

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.1-8b-instant", // Modelo ultra rápido y estable
                    messages: [
                        {
                            role: "system",
                            content: "Eres un experto curador de arte. Escribe biografías elegantes, breves y profesionales."
                        },
                        {
                            role: "user",
                            content: `Escribe una biografía de máximo 50 palabras para el artista ${nombre} ${apellido} de nacionalidad ${nacionalidad}. Solo devuelve el texto de la biografía, sin saludos.`
                        }
                    ],
                    temperature: 0.7
                },
                {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            if (response.data && response.data.choices[0]) {
                const biografia = response.data.choices[0].message.content;
                res.json({ resultado: biografia.trim() });
            } else {
                throw new Error("Respuesta inesperada de la IA");
            }

        } catch (error) {
            console.error("--- ERROR EN GROQ ---");
            if (error.response) {
                console.error(error.response.data);
            } else {
                console.error(error.message);
            }
            res.status(500).json({ error: "La IA de Groq no respondió correctamente." });
        }
    }
};

module.exports = IAController;