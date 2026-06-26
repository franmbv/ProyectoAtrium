const axios = require('axios');

const AIService = {
    /**
     * Genera automáticamente una reseña profesional para una obra basándose en su ficha técnica.
     */
    autogenerarDescripcionArtica: async (obraData) => {
        try {
            const MONGO_API_URL = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';
            const res = await axios.post(`${MONGO_API_URL}/nlp/generar-descripcion`, {
                nombre_obra: obraData.nombre,
                artista: obraData.artista,
                genero: obraData.genero,
                detalles: obraData.detalles
            });
            return res.data?.descripcion || "Reseña no generada.";
        } catch (error) {
            console.error("❌ [AIService Error] Falló la descripción:", error.message);
            return "La reseña se encuentra temporalmente suspendida.";
        }
    },

    /**
     * Genera una biografía real o ficticia de un artista en base a sus metadatos básicos.
     */
    generarBiografiaArtista: async (nombre, apellido, nacionalidad) => {
        try {
            const MONGO_API_URL = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';
            
            // Hacemos el llamado al microservicio de Python para procesar el prompt generativo
            const res = await axios.post(`${MONGO_API_URL}/nlp/generar-biografia`, {
                nombre: nombre,
                apellido: apellido,
                nacionalidad: nacionalidad
            });

            return res.data?.biografia || "Información biográfica no disponible.";
        } catch (error) {
            console.error("❌ [AIService Error] Falló la biografía generativa:", error.message);
            // Fallback local en caso de que el microservicio esté en frío o sin conexión externa
            return `Artista contemporáneo de nacionalidad ${nacionalidad || 'desconocida'}, enfocado en la exploración estética de formas y conceptos contemporáneos en el siglo XXI. Su trabajo se integra a la colección del Museo Atrium.`;
        }
    }
};

module.exports = AIService;