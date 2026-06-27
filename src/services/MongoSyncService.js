const axios = require('axios');
const MONGO_API_URL = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';

const MongoSyncService = {
    // 1. SINCRONIZACIÓN DE ARTISTAS
    syncArtista: async (artistaSQL, esActualizacion = false) => {
        try {
            const payload = {
                id_sql: artistaSQL.id || artistaSQL.Id || artistaSQL.insertId,
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
                console.log(`[MongoSync] Artista ${payload.id_sql} actualizado en MongoDB.`);
            } else {
                await axios.post(`${MONGO_API_URL}/artist/`, payload);
                console.log(`[MongoSync] Artista ${payload.id_sql} creado en MongoDB.`);
            }
        } catch (error) {
            console.error(`[MongoSync Error] Sincronizando artista:`, error.response?.data || error.message);
            throw error;
        }
    },

    deleteArtista: async (id_sql) => {
        try {
            await axios.delete(`${MONGO_API_URL}/artist/${id_sql}`);
            console.log(`[MongoSync] Artista ${id_sql} eliminado de MongoDB.`);
        } catch (error) {
            console.error(`[MongoSync Error] Eliminando artista ${id_sql}:`, error.message);
            throw error;
        }
    },

    // 2. SINCRONIZACIÓN DE CATEGORÍAS (GÉNEROS)
    syncCategoria: async (categoryData) => {
        try {
            const payload = {
                id_sql: categoryData.id_sql,
                nombre_categoria: categoryData.nombre_categoria,
                detalles: categoryData.detalles 
            };

            await axios.post(`${MONGO_API_URL}/category/`, payload);
            console.log(`[MongoSync] Categoría '${payload.nombre_categoria}' sincronizada en MongoDB.`);
        } catch (error) {
            console.error(`[MongoSync Error] Sincronizando categoría:`, error.response?.data || error.message);
            throw error;
        }
    },

    // 3. SINCRONIZACIÓN DE OBRAS
    syncObra: async (obraSQL, esActualizacion = false) => {
        try {
            const id_sql = obraSQL.id || obraSQL.Id || obraSQL.obra_id;
            let detalles = obraSQL.detalles || {};
            if (typeof detalles === 'string') {
                try { detalles = JSON.parse(detalles); } catch(e) { detalles = {}; }
            }

            const payload = {
                id_sql: parseInt(id_sql, 10),
                genero_id: parseInt(obraSQL.genero_id, 10),
                autor_id: parseInt(obraSQL.autor_id, 10),
                nombre: obraSQL.nombre,
                fecha_creacion: obraSQL.fechaCreacion || new Date().toISOString().split('T')[0],
                precio_obra: parseFloat(obraSQL.precioObra || 0),
                porcentaje_ganancia: parseFloat(obraSQL.porcentajeGanancia || 0),
                estatus: obraSQL.estatus || 'Disponible',
                foto: obraSQL.foto || 'default.png',
                detalles: detalles
            };

            if (esActualizacion) {
                await axios.put(`${MONGO_API_URL}/artwork/${payload.id_sql}`, payload);
                console.log(`✅ [MongoSync] OK: Obra ${payload.id_sql} actualizada en MongoDB.`);
            } else {
                await axios.post(`${MONGO_API_URL}/artwork/`, payload);
                console.log(`✅ [MongoSync] OK: Obra ${payload.id_sql} creada en MongoDB.`);
            }
        } catch (error) {
            console.error(`❌ [MongoSync Error] Sync fallido:`, error.message);
            throw error;
        }
    },

    deleteObra: async (id_sql) => {
        try {
            await axios.delete(`${MONGO_API_URL}/artwork/${id_sql}`);
            console.log(`[MongoSync] Obra ${id_sql} eliminada de MongoDB.`);
        } catch (error) {
            console.error(`[MongoSync Error] Eliminando obra ${id_sql}:`, error.message);
            throw error;
        }
    }
};

module.exports = MongoSyncService;