const axios = require('axios');

// URL base del microservicio de Python (Neo4j y Recomendaciones)
const NEO4J_API_URL = process.env.NEO4J_API_URL || 'https://neo4j-4g5x.onrender.com';

const Neo4jSyncService = {
    // ==========================================
    // 1. SINCRONIZACIÓN DE ARTISTAS
    // ==========================================
    syncArtista: async (artistaSQL, esActualizacion = false) => {
        try {
            const payload = {
                artista: {
                    id_sql: artistaSQL.id || artistaSQL.insertId || artistaSQL.id_sql,
                    nombre: `${artistaSQL.nombre} ${artistaSQL.apellido || ''}`.trim(),
                    nacionalidad: artistaSQL.nacionalidad || 'Desconocida'
                }
            };

            if (esActualizacion) {
                await axios.put(`${NEO4J_API_URL}/api/v1/graph/artist/${payload.artista.id_sql}`, payload);
                console.log(`[Neo4jSync] Artista ${payload.artista.id_sql} ("${payload.artista.nombre}") actualizado en Neo4j.`);
            } else {
                await axios.post(`${NEO4J_API_URL}/api/v1/graph/artist`, payload);
                console.log(`[Neo4jSync] Artista ${payload.artista.id_sql} ("${payload.artista.nombre}") creado en Neo4j.`);
            }
        } catch (error) {
            if (!esActualizacion && error.response && error.response.status === 409) {
                console.log(`[Neo4jSync] Artista ${artistaSQL.id || artistaSQL.insertId} ya existe en Neo4j.`);
            } else {
                console.error(`[Neo4jSync Error] Sincronizando artista (actualizar=${esActualizacion}):`, error.response?.data || error.message);
            }
        }
    },

    deleteArtista: async (id_sql) => {
        try {
            await axios.delete(`${NEO4J_API_URL}/api/v1/graph/artist/${id_sql}`);
            console.log(`[Neo4jSync] Artista ${id_sql} eliminado de Neo4j.`);
        } catch (error) {
            console.error(`[Neo4jSync Error] Eliminando artista ${id_sql}:`, error.response?.data || error.message);
        }
    },

    // ==========================================
    // 2. SINCRONIZACIÓN DE OBRAS
    // ==========================================
    syncObra: async (obraSQL, esActualizacion = false) => {
        try {
            const id_sql = obraSQL.id || obraSQL.insertId || obraSQL.obra_id;
            const anio = obraSQL.fechaCreacion 
                ? new Date(obraSQL.fechaCreacion).getFullYear() 
                : new Date().getFullYear();

            const payload = {
                obra: {
                    id_sql: parseInt(id_sql, 10),
                    titulo: obraSQL.nombre,
                    precio: parseFloat(obraSQL.precioObra),
                    anio: parseInt(anio, 10)
                },
                artista_id: parseInt(obraSQL.autor_id, 10),
                genero_id: parseInt(obraSQL.genero_id, 10)
            };

            if (esActualizacion) {
                await axios.put(`${NEO4J_API_URL}/api/v1/graph/artwork/${payload.obra.id_sql}`, payload);
                console.log(`[Neo4jSync] Obra ${payload.obra.id_sql} ("${payload.obra.titulo}") actualizada en Neo4j.`);
            } else {
                await axios.post(`${NEO4J_API_URL}/api/v1/graph/artwork`, payload);
                console.log(`[Neo4jSync] Obra ${payload.obra.id_sql} ("${payload.obra.titulo}") creada en Neo4j.`);
            }
        } catch (error) {
            if (!esActualizacion && error.response && error.response.status === 409) {
                console.log(`[Neo4jSync] Obra ${obraSQL.id || obraSQL.insertId} ya existe en Neo4j.`);
            } else {
                console.error(`[Neo4jSync Error] Sincronizando obra (actualizar=${esActualizacion}):`, error.response?.data || error.message);
            }
        }
    },

    deleteObra: async (id_sql) => {
        try {
            await axios.delete(`${NEO4J_API_URL}/api/v1/graph/artwork/${id_sql}`);
            console.log(`[Neo4jSync] Obra ${id_sql} eliminada de Neo4j.`);
        } catch (error) {
            console.error(`[Neo4jSync Error] Eliminando obra ${id_sql}:`, error.response?.data || error.message);
        }
    },

    // ==========================================
    // 3. SINCRONIZACIÓN DE CATEGORÍAS / GÉNEROS
    // ==========================================
    syncCategoria: async (categoryData) => {
        try {
            const payload = {
                genero: {
                    id_sql: parseInt(categoryData.id_sql, 10),
                    nombre: categoryData.nombre_categoria,
                    descripcion: categoryData.descripcion || `Categoría de arte ${categoryData.nombre_categoria}`
                }
            };

            await axios.post(`${NEO4J_API_URL}/api/v1/graph/genero`, payload);
            console.log(`[Neo4jSync] Categoría ${payload.genero.id_sql} ("${payload.genero.nombre}") sincronizada en Neo4j.`);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                console.log(`[Neo4jSync] Categoría ${categoryData.id_sql} ya existe en Neo4j.`);
            } else {
                console.error(`[Neo4jSync Error] Sincronizando categoría:`, error.response?.data || error.message);
            }
        }
    },

    // ==========================================
    // 4. SINCRONIZACIÓN DE COMPRADORES
    // ==========================================
    syncComprador: async (usuarioSQL, esActualizacion = false) => {
        try {
            const payload = {
                comprador: {
                    id_sql: usuarioSQL.id || usuarioSQL.insertId,
                    nombre: `${usuarioSQL.nombre} ${usuarioSQL.apellido || ''}`.trim(),
                    email: usuarioSQL.gmail || usuarioSQL.email,
                    login: usuarioSQL.login || null
                }
            };

            if (esActualizacion) {
                await axios.put(`${NEO4J_API_URL}/api/v1/graph/comprador/${payload.comprador.id_sql}`, payload);
                console.log(`[Neo4jSync] Comprador ${payload.comprador.id_sql} ("${payload.comprador.nombre}") actualizado en Neo4j.`);
            } else {
                await axios.post(`${NEO4J_API_URL}/api/v1/graph/comprador`, payload);
                console.log(`[Neo4jSync] Comprador ${payload.comprador.id_sql} ("${payload.comprador.nombre}") sincronizado en Neo4j.`);
            }
        } catch (error) {
            if (!esActualizacion && error.response && error.response.status === 409) {
                console.log(`[Neo4jSync] Comprador ${usuarioSQL.id || usuarioSQL.insertId} ya existe en Neo4j.`);
            } else {
                console.error(`[Neo4jSync Error] Sincronizando comprador (actualizar=${esActualizacion}):`, error.response?.data || error.message);
            }
        }
    },

    // ==========================================
    // 5. SINCRONIZACIÓN DE COMPRAS (COMPRO)
    // ==========================================
    syncCompra: async (compradorId, obraId, monto, fechaCompra = null) => {
        try {
            const fecha = fechaCompra 
                ? new Date(fechaCompra).toISOString().split('T')[0] 
                : new Date().toISOString().split('T')[0];

            const payload = {
                comprador_id: parseInt(compradorId, 10),
                obra_id: parseInt(obraId, 10),
                fecha_compra: fecha,
                monto: parseFloat(monto)
            };

            await axios.post(`${NEO4J_API_URL}/api/v1/graph/purchase`, payload);
            console.log(`[Neo4jSync] Compra registrada en Neo4j: comprador ${compradorId} -> obra ${obraId}.`);
        } catch (error) {
            console.error(`[Neo4jSync Error] Registrando compra en Neo4j:`, error.response?.data || error.message);
        }
    }
};

module.exports = Neo4jSyncService;
