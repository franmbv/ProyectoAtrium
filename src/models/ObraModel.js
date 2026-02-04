const db = require('../config/db');

class ObraModel {

    // 1. Obtener Obras para la Galería (con Filtros)
    static async obtenerFiltradas(filtros) {
        // CORRECCIÓN: Quitamos el WHERE estatus = 'Disponible' para que veas todo por ahora,
        // o asegúrate de haber ejecutado el UPDATE en la base de datos.
        let query = `
            SELECT o.*, a.nombre as nombre_artista, a.apellido as apellido_artista, g.nombre as nombre_genero 
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.Id
            WHERE 1=1 
        `;
        
        // Nota: Puse WHERE 1=1 para poder concatenar los AND fácilmente sin importar el estatus por ahora.

        const params = [];

        // Filtro por Género
        // CORREGIDO: Antes decía filters.genero, ahora dice filtros.genero
        if (filtros.genero && filtros.genero !== '') {
            query += ' AND o.genero_id = ?';
            params.push(filtros.genero);
        }

        // Filtro por Artista
        // CORREGIDO: Antes decía filters.artista, ahora dice filtros.artista
        if (filtros.artista && filtros.artista !== '') {
            query += ' AND o.autor_id = ?';
            params.push(filtros.artista);
        }

        // Ordenamiento por Precio
        if (filtros.precio === 'menor') {
            query += ' ORDER BY o.precioObra ASC';
        } else if (filtros.precio === 'mayor') {
            query += ' ORDER BY o.precioObra DESC';
        } else {
            // Por defecto
            query += ' ORDER BY o.id DESC';
        }

        const [rows] = await db.execute(query, params);
        return rows;
    }

    // 2. Obtener una Obra por ID con TODOS sus detalles
    static async obtenerPorId(id) {
        const query = `
            SELECT 
                o.*, 
                a.nombre as nombre_artista, a.apellido as apellido_artista, a.nacionalidad,
                g.nombre as nombre_genero,
                -- Datos de Escultura
                e.material, e.peso, e.largo, e.ancho, e.profundidad,
                -- Datos de Pintura
                p.tecnica, p.soporte,
                -- Datos de Fotografía
                f.tipo as tipo_foto, f.papel, f.formato,
                -- Datos de Cerámica
                c.tipoArcilla, c.temperaturaCoccion, c.tipoEsmalte,
                -- Datos de Orfebrería
                orf.metal, orf.pureza, orf.piedraPreciosa
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.Id
            LEFT JOIN escultura e ON o.id = e.obra_id
            LEFT JOIN pintura p ON o.id = p.obra_id
            LEFT JOIN fotografia f ON o.id = f.obra_id
            LEFT JOIN ceramica c ON o.id = c.obra_id
            LEFT JOIN orfebreria orf ON o.id = orf.obra_id
            WHERE o.id = ?
        `;

        const [rows] = await db.execute(query, [id]);
        return rows[0]; 
    }

    // 3. Obtener listas para los filtros
    static async obtenerGeneros() {
        const [rows] = await db.execute('SELECT * FROM genero');
        return rows;
    }

    static async obtenerArtistas() {
        const [rows] = await db.execute('SELECT id, nombre, apellido FROM artista ORDER BY nombre ASC');
        return rows;
    }
}

module.exports = ObraModel;