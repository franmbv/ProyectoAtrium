const axios = require('axios');
require('dotenv').config();

const IAController = {
    // BUSCADOR INTELIGENTE EN EL CATÁLOGO (Curador Virtual)
    curadorVirtual: async (req, res) => {
        try {
            const { pregunta } = req.body;
            const apiKey = process.env.GROQ_API_KEY;

            if (!apiKey) {
                console.error("❌ [IA ERROR]: GROQ_API_KEY no se encuentra definida en el entorno (.env).");
                return res.status(500).json({ error: "Falta API KEY de Groq" });
            }

            // Consultar catálogo real disponible
            const ObraModel = require('../models/ObraModel');
            const inventario = await ObraModel.obtenerCatalogoParaIA();

            // Preparar el contexto estructurado de obras
            const listaObras = inventario.map(o => 
                `- Título: "${o.nombre}", Género: ${o.genero}, Autor: ${o.artista_nombre} ${o.artista_apellido}, Precio: $${o.precioObra}`
            ).join('\n');

            const response = await axios.post(
                'https://api.groq.com/openai/v1/chat/completions',
                {
                    model: "llama-3.1-8b-instant",
                    messages: [
                        {
                            role: "system",
                            content: `Eres el Curador Virtual de la Galería del Museo Atrium.
                            
                            CATÁLOGO DE OBRAS DISPONIBLES REALES EN EL MUSEO:
                            ${listaObras}

                            TU REGLA DE SEGURIDAD ABSOLUTA:
                            1. Tu única función es recomendar obras de este catálogo que tengan relación semántica con la petición del usuario.
                            2. Si el usuario te hace preguntas que no tienen que ver con el arte, el museo, o la adquisición de las obras de esta lista, debes ignorar el tema y retornar un array vacío: []. No converses sobre temas ajenos al Museo Atrium.
                            3. Si menciona un país (ej: "Venezuela"), asócialo de inmediato con los autores venezolanos que conozcas del catálogo (como Cruz-Diez, Soto, Reverón, etc.).
                            
                            FORMATO DE RESPUESTA EXCLUSIVO:
                            Devuelve únicamente el array JSON de strings con los títulos exactos correspondientes. Sin explicaciones ni markdown.
                            Ejemplo: ["Título de Obra 1", "Título de Obra 2"]`
                        },
                        {
                            role: "user",
                            content: `Recomiéndame obras para esta petición: "${pregunta}"`
                        }
                    ],
                    temperature: 0.1
                },
                {
                    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }
                }
            );

            const respuestaIA = response.data.choices[0].message.content.trim();
            let arrayNombres = [];
            const jsonMatch = respuestaIA.match(/\[[\s\S]*\]/); 

            if (jsonMatch) {
                try {
                    arrayNombres = JSON.parse(jsonMatch[0]);
                } catch (e) { console.error("Error parsing IA response"); }
            }

            res.json({ recomendaciones: arrayNombres });

        } catch (error) {
            console.error("❌ [IAController Error] Fallo en curaduría virtual:", error.message);
            res.status(500).json({ error: "Fallo en la búsqueda semántica inteligente" });
        }
    }
};

module.exports = IAController;