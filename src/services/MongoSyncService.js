const axios = require('axios');
const MONGO_API_URL = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';

const MongoSyncService = {

    syncArtista: async (artistaSQL, esActualizacion = false) => {
        try {
            const payload = {
                id_sql: artistaSQL.id || artistaSQL.insertId,
                nombre: artistaSQL.nombre,
                apellido: artistaSQL.apellido,
                fecha_nac: artistaSQL.fechaNac || artistaSQL.fecha_nac || null,
                fecha_fal: artistaSQL.fechaFal || artistaSQL.fecha_fal || null,
                nacionalidad: artistaSQL.nacionalidad || 'Desconocida',
                descripcion: artistaSQL.descripcion || artistaSQL.biografia || null,
                fotografia: artistaSQL.foto || artistaSQL.fotografia || null,
                estado: artistaSQL.estado || 'Activo'
            };

            if (esActualizacion) {
                await axios.put(`${MONGO_API_URL}/artist/${payload.id_sql}`, payload);
            } else {
                await axios.post(`${MONGO_API_URL}/artist/`, payload);
            }
        } catch (error) {
            console.error(`[MongoSync Error] Sincronizando artista:`, error.response?.data || error.message);
            throw error;
        }
    },

    deleteArtista: async (id_sql) => {
        try {
            await axios.delete(`${MONGO_API_URL}/artist/${id_sql}`);
        } catch (error) {
            console.error(`[MongoSync Error] Eliminando artista:`, error.message);
            throw error;
        }
    },

    syncCategoria: async (categoryData) => {
        try {
            const payload = {
                id_sql: categoryData.id_sql,
                nombre_categoria: categoryData.nombre_categoria,
                detalles: categoryData.detalles 
            };
            await axios.post(`${MONGO_API_URL}/category/`, payload);
        } catch (error) {
            console.error(`[MongoSync Error] Sincronizando categoría:`, error.response?.data || error.message);
            throw error;
        }
    },

    // SINCRONIZACIÓN DINÁMICA DE OBRAS
    syncObra: async (obraSQL, esActualizacion = false) => {
        try {
            const generoId = parseInt(obraSQL.genero_id, 10);
            
            // Si viene del formulario, el campo detalles ya es un objeto, si viene de PostgreSQL es un string JSONB
            let detalles = obraSQL.detalles || {};
            if (typeof detalles === 'string') {
                try { detalles = JSON.parse(detalles); } catch(e) { detalles = {}; }
            }

            // Normalización dinámica obligatoria de los valores a String para mantener la compatibilidad con el esquema Pydantic
            const detallesNormalizados = {};
            Object.keys(detalles).forEach(key => {
                detallesNormalizados[key] = String(detalles[key] !== null && detalles[key] !== undefined ? detalles[key] : "").trim();
            });

            const payload = {
                id_sql: obraSQL.id || obraSQL.obra_id,
                genero_id: generoId,
                autor_id: parseInt(obraSQL.autor_id, 10),
                nombre: obraSQL.nombre,
                fecha_creacion: obraSQL.fechaCreacion || obraSQL.fecha_creacion || new Date().toISOString().split('T')[0],
                precio_obra: parseFloat(obraSQL.precioObra || 0),
                porcentaje_ganancia: parseFloat(obraSQL.porcentajeGanancia || 0),
                estatus: obraSQL.estatus || 'Disponible',
                foto: obraSQL.foto || 'default.png',
                detalles: detallesNormalizados
            };

            if (esActualizacion) {
                await axios.put(`${MONGO_API_URL}/artwork/${payload.id_sql}`, payload);
            } else {
                await axios.post(`${MONGO_API_URL}/artwork/`, payload);
            }
        } catch (error) {
            console.error(`[MongoSync Error] Sincronizando obra en MongoDB:`, error.response?.data || error.message);
            throw error;
        }
    },

    deleteObra: async (id_sql) => {
        try {
            await axios.delete(`${MONGO_API_URL}/artwork/${id_sql}`);
        } catch (error) {
            console.error(`[MongoSync Error] Eliminando obra NoSQL:`, error.message);
            throw error;
        }
    }
};

module.exports = MongoSyncService;