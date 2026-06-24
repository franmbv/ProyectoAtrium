const axios = require('axios');
const MONGO_API_URL = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';

const MongoSyncService = {
    // 1. SINCRONIZACIÓN DE ARTISTAS (CORREGIDO PARA EVITAR VALORES NULL)
    syncArtista: async (artistaSQL, esActualizacion = false) => {
        try {
            // Saneamiento y mapeo exacto al esquema de Pydantic de Python
            const payload = {
                id_sql: artistaSQL.id || artistaSQL.insertId,
                nombre: artistaSQL.nombre,
                apellido: artistaSQL.apellido,
                // Mapear campos de fecha de forma tolerante a Postgres/MySQL
                fecha_nac: artistaSQL.fechaNac || artistaSQL.fecha_nac || null,
                fecha_fal: artistaSQL.fechaFal || artistaSQL.fecha_fal || null,
                nacionalidad: artistaSQL.nacionalidad || 'Desconocida',
                // Mapear descripción de biografía
                descripcion: artistaSQL.descripcion || artistaSQL.biografia || null,
                // Mapear de forma correcta la columna fotografia
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
            throw error; // Propagar error para el rollback de PostgreSQL
        }
    },

    deleteArtista: async (id_sql) => {
        try {
            await axios.delete(`${MONGO_API_URL}/artist/${id_sql}`);
            console.log(`[MongoSync] Artista ${id_sql} eliminado de MongoDB.`);
        } catch (error) {
            console.error(`[MongoSync Error] Eliminando artista ${id_sql}:`, error.response?.data || error.message);
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

    // 3. SINCRONIZACIÓN DE OBRAS (CORREGIDO PARA EVITAR ERRORES DE SPLIT UNICODE)
    // 3. SINCRONIZACIÓN DE OBRAS (ESTANDARIZACIÓN PARA VALIDACIÓN DE PYDANTIC)
    syncObra: async (obraSQL, esActualizacion = false) => {
        try {
            const generoId = parseInt(obraSQL.genero_id, 10);
            const detalles = {};

            const parseValue = (val) => {
                if (val === undefined || val === null) return "";
                return String(val).trim();
            };

            // Estandarización de nombres según sus requisitos de validación en Python:
            if (generoId === 1) { // Pintura
                detalles.tecnica = String(obraSQL.tecnica || "");
                detalles.soporte = String(obraSQL.soporte || "");
            } 
            else if (generoId === 2) { // Escultura
                detalles.material = String(obraSQL.material || "");
                detalles.peso = parseValue(obraSQL.peso || "0");
                detalles.largo = parseValue(obraSQL.largo || "0");
                detalles.ancho = parseValue(obraSQL.ancho || "0");
                detalles.profundidad = parseValue(obraSQL.profundidad || "0");
            } 
            else if (generoId === 3) { // Fotografia
                detalles.tipo_foto = String(obraSQL.tipo_foto || "digital");
                detalles.papel = String(obraSQL.papel || "mate");
                detalles.formato = String(obraSQL.formato || "20x30");
            } 
            else if (generoId === 4) { // Ceramica
                detalles.tipoArcilla = String(obraSQL.tipoArcilla || "");
                detalles.temperaturaCoccion = parseValue(obraSQL.temperaturaCoccion || "0");
                detalles.tipoEsmalte = String(obraSQL.tipoEsmalte || "");
            } 
            else if (generoId === 5) { // Orfebreria
                detalles.metal = String(obraSQL.metal || "");
                detalles.pureza = String(obraSQL.pureza || "");
                detalles.piedraPreciosa = String(obraSQL.piedraPreciosa || "0");
            }

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
                detalles: detalles
            };

            if (esActualizacion) {
                const response = await axios.put(`${MONGO_API_URL}/artwork/${payload.id_sql}`, payload);
                console.log(`[MongoSync] Obra ${payload.id_sql} actualizada en MongoDB.`);
            } else {
                const response = await axios.post(`${MONGO_API_URL}/artwork/`, payload);
                console.log("📥 [DEBUG] Respuesta del Servidor de Python:", response.data);
                console.log(`[MongoSync] Obra ${payload.id_sql} creada en MongoDB.`);
            }
        } catch (error) {
            console.error(`[MongoSync Error] Sincronizando obra:`, error.response?.data || error.message);
            throw error; // Re-lanzar error para ejecutar el rollback en la base relacional
        }
    },


    deleteObra: async (id_sql) => {
        try {
            await axios.delete(`${MONGO_API_URL}/artwork/${id_sql}`);
            console.log(`[MongoSync] Obra ${id_sql} eliminada de MongoDB.`);
        } catch (error) {
            console.error(`[MongoSync Error] Eliminando obra ${id_sql}:`, error.response?.data || error.message);
            throw error;
        }
    }
};

module.exports = MongoSyncService;