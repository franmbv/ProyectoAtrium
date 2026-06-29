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
                    id_sql: artistaSQL.id || artistaSQL.insertId,
                    nombre: `${artistaSQL.nombre} ${artistaSQL.apellido || ''}`.trim(),
                    nacionalidad: artistaSQL.nacionalidad || 'Desconocida'
                }
            };

            await axios.post(`${NEO4J_API_URL}/api/v1/graph/artist`, payload);
            console.log(`[Neo4jSync] Artista ${payload.artista.id_sql} ("${payload.artista.nombre}") sincronizado en Neo4j.`);
        } catch (error) {
            // Ignorar errores 409 (Ya existe), pero loguear otros fallos
            if (error.response && error.response.status === 409) {
                console.log(`[Neo4jSync] Artista ${artistaSQL.id || artistaSQL.insertId} ya existe en Neo4j.`);
            } else {
                console.error(`[Neo4jSync Error] Sincronizando artista:`, error.response?.data || error.message);
            }
        }
    },

    // ==========================================
    // 2. SINCRONIZACIÓN DE OBRAS
    // ==========================================
    syncObra: async (obraSQL) => {
        try {
            const anio = obraSQL.fechaCreacion 
                ? new Date(obraSQL.fechaCreacion).getFullYear() 
                : new Date().getFullYear();

            const payload = {
                obra: {
                    id_sql: obraSQL.id || obraSQL.insertId,
                    titulo: obraSQL.nombre,
                    precio: parseFloat(obraSQL.precioObra),
                    anio: parseInt(anio, 10)
                },
                artista_id: parseInt(obraSQL.autor_id, 10),
                genero_id: parseInt(obraSQL.genero_id, 10)
            };

            await axios.post(`${NEO4J_API_URL}/api/v1/graph/artwork`, payload);
            console.log(`[Neo4jSync] Obra ${payload.obra.id_sql} ("${payload.obra.titulo}") sincronizada en Neo4j.`);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                console.log(`[Neo4jSync] Obra ${obraSQL.id || obraSQL.insertId} ya existe en Neo4j.`);
            } else {
                console.error(`[Neo4jSync Error] Sincronizando obra:`, error.response?.data || error.message);
            }
        }
    },

    // ==========================================
    // 3. SINCRONIZACIÓN DE COMPRADORES (NUEVO)
    // ==========================================
    syncComprador: async (usuarioSQL) => {
        try {
            const payload = {
                comprador: {
                    id_sql: usuarioSQL.id || usuarioSQL.insertId,
                    nombre: `${usuarioSQL.nombre} ${usuarioSQL.apellido || ''}`.trim(),
                    email: usuarioSQL.gmail || usuarioSQL.email
                }
            };

            await axios.post(`${NEO4J_API_URL}/api/v1/graph/comprador`, payload);
            console.log(`[Neo4jSync] Comprador ${payload.comprador.id_sql} ("${payload.comprador.nombre}") sincronizado en Neo4j.`);
        } catch (error) {
            if (error.response && error.response.status === 409) {
                console.log(`[Neo4jSync] Comprador ${usuarioSQL.id || usuarioSQL.insertId} ya existe en Neo4j.`);
            } else {
                console.error(`[Neo4jSync Error] Sincronizando comprador:`, error.response?.data || error.message);
            }
        }
    },

    // ==========================================
    // 4. SINCRONIZACIÓN DE COMPRAS (COMPRO)
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
