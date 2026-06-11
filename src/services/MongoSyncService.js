const axios = require('axios');

// URL base del microservicio de Python (Catálogo MongoDB)
const MONGO_API_URL = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';

const MongoSyncService = {
    // ==========================================
    // 1. SINCRONIZACIÓN DE ARTISTAS
    // ==========================================
    
    syncArtista: async (artistaSQL, esActualizacion = false) => {
        try {
            const payload = {
                id_sql: artistaSQL.id || artistaSQL.insertId,
                nombre: artistaSQL.nombre,
                apellido: artistaSQL.apellido,
                nacionalidad: artistaSQL.nacionalidad || 'Desconocida',
                foto: artistaSQL.foto || 'default.png',
                estado_activo: true // Por defecto lo creamos activo
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
        }
    },

    deleteArtista: async (id_sql) => {
        try {
            await axios.delete(`${MONGO_API_URL}/artist/${id_sql}`);
            console.log(`[MongoSync] Artista ${id_sql} eliminado de MongoDB.`);
        } catch (error) {
            console.error(`[MongoSync Error] Eliminando artista ${id_sql}:`, error.response?.data || error.message);
        }
    },

    // ==========================================
    // 2. SINCRONIZACIÓN DE CATEGORÍAS (GÉNEROS)
    // ==========================================

    syncCategoria: async (generoSQL) => {
        try {
            let detallesObligatorios = [];
            const nombreNormalizado = generoSQL.nombre.toLowerCase();
            
            if (nombreNormalizado === 'pintura') detallesObligatorios = ['tecnica', 'soporte'];
            else if (nombreNormalizado === 'escultura') detallesObligatorios = ['material', 'peso', 'largo', 'ancho', 'profundidad'];
            else if (nombreNormalizado === 'fotografia' || nombreNormalizado === 'fotografía') detallesObligatorios = ['tipo_foto', 'papel', 'formato'];
            else if (nombreNormalizado === 'ceramica' || nombreNormalizado === 'cerámica') detallesObligatorios = ['tipoArcilla', 'temperaturaCoccion', 'tipoEsmalte'];
            else if (nombreNormalizado === 'orfebreria' || nombreNormalizado === 'orfebrería') detallesObligatorios = ['metal', 'pureza', 'piedraPreciosa'];

            const payload = {
                id_sql: generoSQL.id || generoSQL.Id,
                nombre_categoria: generoSQL.nombre,
                detalles: detallesObligatorios
            };

            try {
                 await axios.post(`${MONGO_API_URL}/category/`, payload);
                 console.log(`[MongoSync] Categoría ${generoSQL.nombre} sincronizada en MongoDB.`);
            } catch(e) {
                 if(e.response && e.response.status === 400) {
                     console.log(`[MongoSync] Categoría ${generoSQL.nombre} ya existe en MongoDB.`);
                 } else {
                     throw e;
                 }
            }
        } catch (error) {
            console.error(`[MongoSync Error] Sincronizando categoría:`, error.response?.data || error.message);
        }
    },

    // ==========================================
    // 3. SINCRONIZACIÓN DE OBRAS (POLIMORFISMO)
    // ==========================================

    syncObra: async (obraSQL, esActualizacion = false) => {
        try {
            const generoId = parseInt(obraSQL.genero_id, 10);
            
            // Construimos el diccionario dinámico de "detalles" basado en los campos que vengan en obraSQL
            const detalles = {};
            
            if (generoId === 1) { // Pintura
                if (obraSQL.tecnica) detalles.tecnica = String(obraSQL.tecnica);
                if (obraSQL.soporte) detalles.soporte = String(obraSQL.soporte);
            } else if (generoId === 2) { // Escultura
                if (obraSQL.material) detalles.material = String(obraSQL.material);
                if (obraSQL.peso !== undefined && obraSQL.peso !== null) detalles.peso = String(obraSQL.peso);
                if (obraSQL.largo !== undefined && obraSQL.largo !== null) detalles.largo = String(obraSQL.largo);
                if (obraSQL.ancho !== undefined && obraSQL.ancho !== null) detalles.ancho = String(obraSQL.ancho);
                if (obraSQL.profundidad !== undefined && obraSQL.profundidad !== null) detalles.profundidad = String(obraSQL.profundidad);
            } else if (generoId === 3) { // Fotografia
                if (obraSQL.tipo_foto) detalles.tipo_foto = String(obraSQL.tipo_foto);
                if (obraSQL.papel) detalles.papel = String(obraSQL.papel);
                if (obraSQL.formato) detalles.formato = String(obraSQL.formato);
            } else if (generoId === 4) { // Ceramica
                if (obraSQL.tipoArcilla) detalles.tipoArcilla = String(obraSQL.tipoArcilla);
                if (obraSQL.temperaturaCoccion !== undefined && obraSQL.temperaturaCoccion !== null) detalles.temperaturaCoccion = String(obraSQL.temperaturaCoccion);
                if (obraSQL.tipoEsmalte) detalles.tipoEsmalte = String(obraSQL.tipoEsmalte);
            } else if (generoId === 5) { // Orfebreria
                if (obraSQL.metal) detalles.metal = String(obraSQL.metal);
                if (obraSQL.pureza) detalles.pureza = String(obraSQL.pureza);
                if (obraSQL.piedraPreciosa) detalles.piedraPreciosa = String(obraSQL.piedraPreciosa);
            }

            const payload = {
                id_sql: obraSQL.id || obraSQL.obra_id, // Puede venir como 'id' (crear) o 'obra_id' (actualizar de req.body)
                genero_id: generoId,
                autor_id: parseInt(obraSQL.autor_id, 10),
                nombre: obraSQL.nombre,
                precio_obra: parseFloat(obraSQL.precioObra),
                porcentaje_ganancia: parseFloat(obraSQL.porcentajeGanancia || 0),
                estatus: obraSQL.estatus || 'Disponible',
                foto: obraSQL.foto || 'default.png',
                detalles: detalles
            };

            // Aseguramos que el id_sql esté presente
            if (!payload.id_sql) {
                console.error("[MongoSync Error] No se proporcionó ID de la obra para sincronizar.");
                return;
            }

            if (esActualizacion) {
                await axios.put(`${MONGO_API_URL}/artwork/${payload.id_sql}`, payload);
                console.log(`[MongoSync] Obra ${payload.id_sql} actualizada en MongoDB.`);
            } else {
                await axios.post(`${MONGO_API_URL}/artwork/`, payload);
                console.log(`[MongoSync] Obra ${payload.id_sql} creada en MongoDB.`);
            }
        } catch (error) {
            console.error(`[MongoSync Error] Sincronizando obra:`, error.response?.data || error.message);
        }
    },

    deleteObra: async (id_sql) => {
        try {
            await axios.delete(`${MONGO_API_URL}/artwork/${id_sql}`);
            console.log(`[MongoSync] Obra ${id_sql} eliminada de MongoDB.`);
        } catch (error) {
            console.error(`[MongoSync Error] Eliminando obra ${id_sql}:`, error.response?.data || error.message);
        }
    },

    // Para cuando solo queremos cambiar el estado (Reservar, Vender)
    // Nota: Como el endpoint PUT /artwork/ requiere el ArtworkCreate completo, lo ideal
    // es que desde el controlador traigamos la obra completa SQL y la pasemos por syncObra(obraCompleta, true).
};

module.exports = MongoSyncService;