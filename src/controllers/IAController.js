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
    },

    curadorVirtual: async (req, res) => {
        try {
            const { pregunta } = req.body;
            const apiKey = process.env.GROQ_API_KEY;

            // 1. Consultamos la base de datos real
            const ObraModel = require('../models/ObraModel');
            const inventario = await ObraModel.obtenerCatalogoParaIA();

            // 2. Preparamos el contexto para la IA
            const listaObras = inventario.map(o => 
                `- "${o.nombre}" (${o.genero}) por ${o.artista_nombre} ${o.artista_apellido}. Precio: $${o.precioObra}`
            ).join('\n');

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.1-8b-instant",
                    messages: [
                        {
                            role: "system",
                            content: `Eres el Curador Virtual del Museo Atrium. Tu objetivo es vender obras de arte. 
                            Este es nuestro catálogo disponible:
                            ${listaObras}
                            
                            Responde de forma elegante, breve y amable. Sugiere máximo 2 obras que encajen con lo que el usuario pide. Si no hay nada que encaje, ofrece las más destacadas.`
                        },
                        {
                            role: "user",
                            content: `El cliente dice: "${pregunta}"`
                        }
                    ],
                    temperature: 0.6
                },
                {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                }
            );

            res.json({ respuesta: response.data.choices[0].message.content });

        } catch (error) {
            console.error("Error Curador:", error);
            res.status(500).json({ error: "El curador está ocupado en una subasta. Intente luego." });
        }
    }


};

module.exports = IAController;