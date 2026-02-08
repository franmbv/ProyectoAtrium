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

    // Buscar obra por nombre (Insensible a mayúsculas/minúsculas)
    static async findByNombre(nombre) {
        const query = 'SELECT * FROM obra WHERE LOWER(nombre) = LOWER(?) LIMIT 1';
        const [rows] = await db.execute(query, [nombre]);
        return rows[0]; // Retorna la obra o undefined
    }

    // Reservar obra (Atómico: Solo si está disponible)
    static async reservarById(id) {
        const query = "UPDATE obra SET estatus = 'Reservada' WHERE id = ? AND estatus = 'Disponible'";
        const [result] = await db.execute(query, [id]);
        
        // Retorna true si se modificó una fila (éxito), false si no (ya estaba reservada)
        return result.affectedRows > 0;
    }

    // DASHBOARD: Contar obras
    static async contarTotal() {
        const [rows] = await db.execute('SELECT COUNT(*) AS total FROM obra');
        return rows[0].total;
    }

    // INVENTARIO: Listar todas con joins
    static async obtenerInventario() {
        const sql = `
            SELECT o.id, o.nombre, o.estatus, o.precioObra, o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.id
            ORDER BY o.id DESC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // CREAR OBRA 
    static async crear(datos, fotoFilename) {
        // 1. Insertar Obra Padre
        const sqlObra = `INSERT INTO obra
            (genero_id, autor_id, nombre, fechaCreacion, precioObra, porcentajeGanancia, estatus, foto)
            VALUES (?, ?, ?, CURDATE(), ?, ?, 'Disponible', ?)`;
        
        const [result] = await db.execute(sqlObra, [
            datos.genero_id, datos.autor_id, datos.nombre, 
            parseFloat(datos.precioObra), parseFloat(datos.porcentajeGanancia), fotoFilename
        ]);
        
        const obraId = result.insertId;
        const generoId = parseInt(datos.genero_id, 10);

        // 2. Insertar Subtipo 
        if (generoId === 1) { // Pintura
            await db.execute('INSERT INTO pintura (obra_id, tecnica, soporte) VALUES (?, ?, ?)', 
                [obraId, datos.tecnica, datos.soporte]);
        } 
        else if (generoId === 2) { // Escultura
            await db.execute('INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES (?, ?, ?, ?, ?, ?)',
                [obraId, datos.material, datos.peso, datos.largo, datos.ancho, datos.profundidad]);
        }
        else if (generoId === 3) { // Fotografía
            await db.execute('INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES (?, ?, ?, ?)',
                [obraId, datos.tipo_foto, datos.papel, datos.formato]);
        }
        else if (generoId === 4) { // Cerámica
            await db.execute('INSERT INTO ceramica (obra_id, tipoArcilla, temperaturaCoccion, tipoEsmalte) VALUES (?, ?, ?, ?)',
                [obraId, datos.tipoArcilla, datos.temperaturaCoccion, datos.tipoEsmalte]);
        }
        else if (generoId === 5) { // Orfebrería
            await db.execute('INSERT INTO orfebreria (obra_id, metal, pureza, piedraPreciosa) VALUES (?, ?, ?, ?)',
                [obraId, datos.metal, datos.pureza, datos.piedraPreciosa]);
        }
        
        return obraId;
    }

    // ACTUALIZAR OBRA
    static async actualizar(id, datos, fotoFilename) {
        const [rows] = await db.execute('SELECT genero_id, foto FROM obra WHERE id = ?', [id]);
        if (rows.length === 0) {
            return false;
        }

        const actual = rows[0];
        const nuevoGeneroId = parseInt(datos.genero_id, 10);
        const nuevaFoto = fotoFilename || actual.foto;

        await db.execute(
            'UPDATE obra SET genero_id = ?, autor_id = ?, nombre = ?, precioObra = ?, porcentajeGanancia = ?, foto = ? WHERE id = ?',
            [
                nuevoGeneroId,
                datos.autor_id,
                datos.nombre,
                parseFloat(datos.precioObra),
                parseFloat(datos.porcentajeGanancia),
                nuevaFoto,
                id
            ]
        );

        if (nuevoGeneroId !== actual.genero_id) {
            await db.execute('DELETE FROM pintura WHERE obra_id = ?', [id]);
            await db.execute('DELETE FROM escultura WHERE obra_id = ?', [id]);
            await db.execute('DELETE FROM fotografia WHERE obra_id = ?', [id]);
            await db.execute('DELETE FROM ceramica WHERE obra_id = ?', [id]);
            await db.execute('DELETE FROM orfebreria WHERE obra_id = ?', [id]);
            await ObraModel._insertarSubtipo(id, nuevoGeneroId, datos);
        } else {
            await ObraModel._actualizarSubtipo(id, nuevoGeneroId, datos);
        }

        return true;
    }

    // ELIMINAR OBRA
    static async eliminar(id) {
        const [rows] = await db.execute('SELECT id FROM obra WHERE id = ?', [id]);
        if (rows.length === 0) {
            return false;
        }

        await db.execute('DELETE FROM pintura WHERE obra_id = ?', [id]);
        await db.execute('DELETE FROM escultura WHERE obra_id = ?', [id]);
        await db.execute('DELETE FROM fotografia WHERE obra_id = ?', [id]);
        await db.execute('DELETE FROM ceramica WHERE obra_id = ?', [id]);
        await db.execute('DELETE FROM orfebreria WHERE obra_id = ?', [id]);
        await db.execute('DELETE FROM obra WHERE id = ?', [id]);

        return true;
    }

    static async _insertarSubtipo(obraId, generoId, datos) {
        if (generoId === 1) {
            await db.execute('INSERT INTO pintura (obra_id, tecnica, soporte) VALUES (?, ?, ?)', [
                obraId, datos.tecnica, datos.soporte
            ]);
        } else if (generoId === 2) {
            await db.execute('INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES (?, ?, ?, ?, ?, ?)', [
                obraId, datos.material, datos.peso, datos.largo, datos.ancho, datos.profundidad
            ]);
        } else if (generoId === 3) {
            await db.execute('INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES (?, ?, ?, ?)', [
                obraId, datos.tipo_foto, datos.papel, datos.formato
            ]);
        } else if (generoId === 4) {
            await db.execute('INSERT INTO ceramica (obra_id, tipoArcilla, temperaturaCoccion, tipoEsmalte) VALUES (?, ?, ?, ?)', [
                obraId, datos.tipoArcilla, datos.temperaturaCoccion, datos.tipoEsmalte
            ]);
        } else if (generoId === 5) {
            await db.execute('INSERT INTO orfebreria (obra_id, metal, pureza, piedraPreciosa) VALUES (?, ?, ?, ?)', [
                obraId, datos.metal, datos.pureza, datos.piedraPreciosa
            ]);
        }
    }

    static async _actualizarSubtipo(obraId, generoId, datos) {
        if (generoId === 1) {
            await db.execute(
                'UPDATE pintura SET tecnica = COALESCE(NULLIF(?, \'\'), tecnica), soporte = COALESCE(NULLIF(?, \'\'), soporte) WHERE obra_id = ?',
                [datos.tecnica, datos.soporte, obraId]
            );
        } else if (generoId === 2) {
            await db.execute(
                'UPDATE escultura SET material = COALESCE(NULLIF(?, \'\'), material), peso = COALESCE(NULLIF(?, \'\'), peso), largo = COALESCE(NULLIF(?, \'\'), largo), ancho = COALESCE(NULLIF(?, \'\'), ancho), profundidad = COALESCE(NULLIF(?, \'\'), profundidad) WHERE obra_id = ?',
                [datos.material, datos.peso, datos.largo, datos.ancho, datos.profundidad, obraId]
            );
        } else if (generoId === 3) {
            await db.execute(
                'UPDATE fotografia SET tipo = COALESCE(NULLIF(?, \'\'), tipo), papel = COALESCE(NULLIF(?, \'\'), papel), formato = COALESCE(NULLIF(?, \'\'), formato) WHERE obra_id = ?',
                [datos.tipo_foto, datos.papel, datos.formato, obraId]
            );
        } else if (generoId === 4) {
            await db.execute(
                'UPDATE ceramica SET tipoArcilla = COALESCE(NULLIF(?, \'\'), tipoArcilla), temperaturaCoccion = COALESCE(NULLIF(?, \'\'), temperaturaCoccion), tipoEsmalte = COALESCE(NULLIF(?, \'\'), tipoEsmalte) WHERE obra_id = ?',
                [datos.tipoArcilla, datos.temperaturaCoccion, datos.tipoEsmalte, obraId]
            );
        } else if (generoId === 5) {
            await db.execute(
                'UPDATE orfebreria SET metal = COALESCE(NULLIF(?, \'\'), metal), pureza = COALESCE(NULLIF(?, \'\'), pureza), piedraPreciosa = COALESCE(NULLIF(?, \'\'), piedraPreciosa) WHERE obra_id = ?',
                [datos.metal, datos.pureza, datos.piedraPreciosa, obraId]
            );
        }
    }

    // Actualizar estatus a Vendida
    static async marcarComoVendida(id) {
        await db.execute("UPDATE obra SET estatus = 'Vendida' WHERE id = ?", [id]);
    }
}

module.exports = ObraModel;