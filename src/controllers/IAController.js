const axios = require('axios');
require('dotenv').config();

const IAController = {
    // Generador de biografías (Gestión Artistas)
    generarBiografia: async (req, res) => {
        try {
            const { nombre, apellido, nacionalidad } = req.body;
            const apiKey = process.env.GROQ_API_KEY;

            if (!apiKey) return res.status(500).json({ error: "Falta API KEY" });

            const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
                model: "llama-3.1-8b-instant",
                messages: [
                    { role: "system", content: "Eres un curador de arte." },
                    { role: "user", content: `Escribe biografía breve (50 palabras) para: ${nombre} ${apellido}, ${nacionalidad}.` }
                ]
            }, { headers: { 'Authorization': `Bearer ${apiKey}` } });

            res.json({ resultado: response.data.choices[0].message.content });
        } catch (e) { res.status(500).json({ error: "Error IA" }); }
    },

    // BUSCADOR INTELIGENTE (Galería)
    curadorVirtual: async (req, res) => {
        try {
            const { pregunta } = req.body;
            const apiKey = process.env.GROQ_API_KEY;

            // Consultar inventario real
            const ObraModel = require('../models/ObraModel');
            const inventario = await ObraModel.obtenerCatalogoParaIA();

            // Preparar el contexto enriquecido (Incluimos Nacionalidad explícitamente)
            const listaObras = inventario.map(o => 
                `- Título: "${o.nombre}", Género: ${o.genero}, Autor: ${o.artista_nombre} ${o.artista_apellido} (Nacionalidad del autor conocida por ti), Precio: $${o.precioObra}`
            ).join('\n');

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.1-8b-instant",
                    messages: [
                        {
                            role: "system",
                            content: `Eres un motor de recomendación de arte inteligente y flexible.
                            
                            TU CATÁLOGO DE OBRAS DISPONIBLES:
                            ${listaObras}

                            TU MISIÓN:
                            Analiza la petición del usuario y devuelve un Array JSON con los títulos de las obras que coincidan.
                            
                            REGLAS DE BÚSQUEDA (IMPORTANTE):
                            1. Si el usuario menciona un PAÍS (ej: "Arte Venezolano"), debes usar tu conocimiento general para identificar si los autores de la lista son de ese país (Ej: Soto, Cruz-Diez, Reverón son venezolanos).
                            2. Si menciona un ESTILO o SENTIMIENTO, asocia las obras por su título o género.
                            3. Si la coincidencia no es exacta, devuelve las obras "más cercanas" o relevantes. ¡Nunca devuelvas un array vacío si puedes sugerir algo bueno!
                            
                            FORMATO DE RESPUESTA ÚNICO:
                            ["Título Exacto 1", "Título Exacto 2"]
                            (Solo el array JSON, sin texto extra).`
                        },
                        {
                            role: "user",
                            content: `Recomiéndame obras para esta petición: "${pregunta}"`
                        }
                    ],
                    temperature: 0.3 // Subimos un poco la temperatura para darle creatividad en la asociación
                },
                {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                }
            );

            let respuestaIA = response.data.choices[0].message.content.trim();
            
            // Extracción segura del JSON
            let arrayNombres = [];
            const jsonMatch = respuestaIA.match(/\[[\s\S]*\]/); 

            if (jsonMatch) {
                try {
                    arrayNombres = JSON.parse(jsonMatch[0]);
                } catch (e) { console.error("Error parsing IA response"); }
            }

            // Fallback de Ingeniería: Si la IA falla y devuelve vacío, devolvemos todo el catálogo (o una selección random)
            // para que la galería no se quede en blanco por error.
            if (arrayNombres.length === 0) {
                // Opcional: Si quieres que siempre muestre algo, descomenta la siguiente línea:
                // arrayNombres = inventario.slice(0, 3).map(o => o.nombre); 
            }

            res.json({ recomendaciones: arrayNombres });

        } catch (error) {
            console.error("Error Curador:", error.message);
            res.status(500).json({ error: "Fallo en la búsqueda semántica" });
        }
    }
};

module.exports = IAController;