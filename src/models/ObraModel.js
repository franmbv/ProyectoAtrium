const db = require('../config/db');

class ObraModel {

    static _toDecimal(value, decimals = 2) {
        if (value === '' || value === null || value === undefined) return null;
        const numberValue = Number(String(value).replace(',', '.'));
        if (!Number.isFinite(numberValue)) return null;
        return Number(numberValue.toFixed(decimals));
    }

    // 1. Obtener Obras para la Galería (con Filtros)
  static async obtenerFiltradas(filtros) {
    let query = `
        SELECT o.id, o.genero_id, o.autor_id, o.nombre, o.fechacreacion AS "fechaCreacion", o.precioobra AS "precioObra", o.porcentajeganancia AS "porcentajeGanancia", o.estatus, o.foto, o.reservado_por, o.fecha_reserva, 
               a.nombre as nombre_artista, a.apellido as apellido_artista, g.nombre as nombre_genero 
        FROM obra o
        INNER JOIN artista a ON o.autor_id = a.id
        INNER JOIN genero g ON o.genero_id = g.id
        WHERE o.estatus = 'Disponible'
    `;
    
    const params = [];
    let paramIdx = 1;

    if (filtros.busqueda && filtros.busqueda !== '') {
        query += ` AND (o.nombre LIKE $${paramIdx} OR a.nombre LIKE $${paramIdx + 1} OR a.apellido LIKE $${paramIdx + 2})`;
        const term = `%${filtros.busqueda}%`;
        params.push(term, term, term);
        paramIdx += 3;
    }

    if (filtros.genero && filtros.genero !== '') {
        query += ` AND o.genero_id = $${paramIdx}`;
        params.push(filtros.genero);
        paramIdx += 1;
    }

    if (filtros.artista && filtros.artista !== '') {
        query += ` AND o.autor_id = $${paramIdx}`;
        params.push(filtros.artista);
        paramIdx += 1;
    }

    if (filtros.precio === 'menor') {
        query += ' ORDER BY o.precioobra ASC';
    } else if (filtros.precio === 'mayor') {
        query += ' ORDER BY o.precioobra DESC';
    } else {
        query += ' ORDER BY o.id DESC';
    }

    const result = await db.query(query, params);
    return result.rows;
}

    // 2. Obtener una Obra por ID con TODOS sus detalles
    static async obtenerPorId(id) {
        const query = `
            SELECT 
                o.id, o.genero_id, o.autor_id, o.nombre, o.fechacreacion AS "fechaCreacion", o.precioobra AS "precioObra", o.porcentajeganancia AS "porcentajeGanancia", o.estatus, o.foto, o.reservado_por, o.fecha_reserva, 
                a.nombre as nombre_artista, a.apellido as apellido_artista, a.nacionalidad,
                g.nombre as nombre_genero,
                -- Datos de Escultura
                e.material, e.peso, e.largo, e.ancho, e.profundidad,
                -- Datos de Pintura
                p.tecnica, p.soporte,
                -- Datos de Fotografia
                f.tipo as tipo_foto, f.papel, f.formato,
                -- Datos de Ceramica
                c.tipoarcilla AS "tipoArcilla", c.temperaturacoccion AS "temperaturaCoccion", c.tipoesmalte AS "tipoEsmalte",
                -- Datos de Orfebreria
                orf.metal, orf.pureza, orf.piedrapreciosa AS "piedraPreciosa"
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.id
            LEFT JOIN escultura e ON o.id = e.obra_id
            LEFT JOIN pintura p ON o.id = p.obra_id
            LEFT JOIN fotografia f ON o.id = f.obra_id
            LEFT JOIN ceramica c ON o.id = c.obra_id
            LEFT JOIN orfebreria orf ON o.id = orf.obra_id
            WHERE o.id = $1
        `;

        const result = await db.query(query, [id]);
        return result.rows[0]; 
    }

    // 3. Obtener listas para los filtros
    static async obtenerGeneros() {
        const result = await db.query('SELECT id as "Id", nombre FROM genero');
        return result.rows;
    }

    static async obtenerArtistas() {
        const result = await db.query('SELECT id, nombre, apellido FROM artista ORDER BY nombre ASC');
        return result.rows;
    }

    // Buscar obra por nombre
    static async findByNombre(nombre) {
        const query = 'SELECT id, genero_id, autor_id, nombre, fechacreacion AS "fechaCreacion", precioobra AS "precioObra", porcentajeganancia AS "porcentajeGanancia", estatus, foto, reservado_por, fecha_reserva FROM obra WHERE LOWER(nombre) = LOWER($1) LIMIT 1';
        const result = await db.query(query, [nombre]);
        return result.rows[0]; 
    }

    // Reservar obra
    static async reservarById(id, compradorId) {
        const query = "UPDATE obra SET estatus = 'Reservada', reservado_por = $1, fecha_reserva = CURRENT_DATE WHERE id = $2 AND estatus = 'Disponible'";
        const result = await db.query(query, [compradorId, id]);
        return result.rowCount > 0;
    }

    // DASHBOARD: Contar obras
    static async contarTotal() {
        const result = await db.query('SELECT COUNT(*)::integer AS total FROM obra');
        return result.rows[0].total;
    }

    // DASHBOARD: Contar inventario activo (Disponible + Reservada)
    static async contarInventarioActivo() {
        const sql = "SELECT COUNT(*)::integer AS total FROM obra WHERE estatus IN ('Disponible', 'Reservada')";
        const result = await db.query(sql);
        return result.rows[0].total;
    }

    // INVENTARIO: Listar todas con joins
    static async obtenerInventario() {
        const sql = `
            SELECT o.id, o.nombre, o.estatus, o.precioobra AS "precioObra", o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.id
            ORDER BY o.id DESC
        `;
        const result = await db.query(sql);
        return result.rows;
    }

    static async obtenerReservadas() {
        const sql = `
            SELECT o.id, o.nombre, o.estatus, o.precioobra AS "precioObra", o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.id
            WHERE o.estatus = 'Reservada'
            ORDER BY o.id DESC
        `;
        const result = await db.query(sql);
        return result.rows;
    }

    // Obtener obras reservadas por un usuario específico
    static async obtenerReservadasPorUsuario(usuarioId) {
        const sql = `
            SELECT o.id, o.nombre, o.estatus, o.precioobra AS "precioObra", o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero, o.reservado_por, o.fecha_reserva
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.id
            WHERE o.estatus = 'Reservada' AND o.reservado_por = $1
            ORDER BY o.fecha_reserva DESC
        `;
        const result = await db.query(sql, [usuarioId]);
        return result.rows;
    }

    // CREAR OBRA 
    static async crear(datos, fotoFilename) {
        const sqlObra = `INSERT INTO obra
            (genero_id, autor_id, nombre, fechacreacion, precioobra, porcentajeganancia, estatus, foto)
            VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, 'Disponible', $6) RETURNING id`;
        
        const result = await db.query(sqlObra, [
            datos.genero_id, datos.autor_id, datos.nombre, 
            ObraModel._toDecimal(datos.precioObra), ObraModel._toDecimal(datos.porcentajeGanancia), fotoFilename
        ]);
        
        const obraId = result.rows[0].id;
        const generoId = parseInt(datos.genero_id, 10);

        if (generoId === 1) { // Pintura
            await db.query('INSERT INTO pintura (obra_id, tecnica, soporte) VALUES ($1, $2, $3)', 
                [obraId, datos.tecnica, datos.soporte]);
        } 
        else if (generoId === 2) { // Escultura
            await db.query('INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES ($1, $2, $3, $4, $5, $6)',
                [
                    obraId,
                    datos.material,
                    ObraModel._toDecimal(datos.peso),
                    ObraModel._toDecimal(datos.largo),
                    ObraModel._toDecimal(datos.ancho),
                    ObraModel._toDecimal(datos.profundidad)
                ]);
        }
        else if (generoId === 3) { // Fotografia
            await db.query('INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES ($1, $2, $3, $4)',
                [obraId, datos.tipo_foto, datos.papel, datos.formato]);
        }
        else if (generoId === 4) { // Ceramica
            await db.query('INSERT INTO ceramica (obra_id, tipoarcilla, temperaturacoccion, tipoesmalte) VALUES ($1, $2, $3, $4)',
                [obraId, datos.tipoArcilla, ObraModel._toDecimal(datos.temperaturaCoccion), datos.tipoEsmalte]);
        }
        else if (generoId === 5) { // Orfebreria
            await db.query('INSERT INTO orfebreria (obra_id, metal, pureza, piedrapreciosa) VALUES ($1, $2, $3, $4)',
                [obraId, datos.metal, datos.pureza, datos.piedraPreciosa]);
        }
        
        return obraId;
    }

    // ACTUALIZAR OBRA
    static async actualizar(id, datos, fotoFilename) {
        const result = await db.query('SELECT genero_id, foto FROM obra WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return false;
        }

        const actual = result.rows[0];
        const nuevoGeneroId = parseInt(datos.genero_id, 10);
        const nuevaFoto = fotoFilename || actual.foto;

        await db.query(
            'UPDATE obra SET genero_id = $1, autor_id = $2, nombre = $3, precioobra = $4, porcentajeganancia = $5, foto = $6 WHERE id = $7',
            [
                nuevoGeneroId,
                datos.autor_id,
                datos.nombre,
                ObraModel._toDecimal(datos.precioObra),
                ObraModel._toDecimal(datos.porcentajeGanancia),
                nuevaFoto,
                id
            ]
        );

        if (nuevoGeneroId !== actual.genero_id) {
            await db.query('DELETE FROM pintura WHERE obra_id = $1', [id]);
            await db.query('DELETE FROM escultura WHERE obra_id = $1', [id]);
            await db.query('DELETE FROM fotografia WHERE obra_id = $1', [id]);
            await db.query('DELETE FROM ceramica WHERE obra_id = $1', [id]);
            await db.query('DELETE FROM orfebreria WHERE obra_id = $1', [id]);
            await ObraModel._insertarSubtipo(id, nuevoGeneroId, datos);
        } else {
            await ObraModel._actualizarSubtipo(id, nuevoGeneroId, datos);
        }

        return true;
    }

    // ELIMINAR OBRA
    static async eliminar(id) {
        const result = await db.query('SELECT id FROM obra WHERE id = $1', [id]);
        if (result.rows.length === 0) {
            return false;
        }

        await db.query('DELETE FROM pintura WHERE obra_id = $1', [id]);
        await db.query('DELETE FROM escultura WHERE obra_id = $1', [id]);
        await db.query('DELETE FROM fotografia WHERE obra_id = $1', [id]);
        await db.query('DELETE FROM ceramica WHERE obra_id = $1', [id]);
        await db.query('DELETE FROM orfebreria WHERE obra_id = $1', [id]);
        await db.query('DELETE FROM obra WHERE id = $1', [id]);

        return true;
    }

    static async _insertarSubtipo(obraId, generoId, datos) {
        if (generoId === 1) {
            await db.query('INSERT INTO pintura (obra_id, tecnica, soporte) VALUES ($1, $2, $3)', [
                obraId, datos.tecnica, datos.soporte
            ]);
        } else if (generoId === 2) {
            await db.query('INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES ($1, $2, $3, $4, $5, $6)', [
                obraId,
                datos.material,
                ObraModel._toDecimal(datos.peso),
                ObraModel._toDecimal(datos.largo),
                ObraModel._toDecimal(datos.ancho),
                ObraModel._toDecimal(datos.profundidad)
            ]);
        } else if (generoId === 3) {
            await db.query('INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES ($1, $2, $3, $4)', [
                obraId, datos.tipo_foto, datos.papel, datos.formato
            ]);
        } else if (generoId === 4) {
            await db.query('INSERT INTO ceramica (obra_id, tipoarcilla, temperaturacoccion, tipoesmalte) VALUES ($1, $2, $3, $4)', [
                obraId,
                datos.tipoArcilla,
                ObraModel._toDecimal(datos.temperaturaCoccion),
                datos.tipoEsmalte
            ]);
        } else if (generoId === 5) {
            await db.query('INSERT INTO orfebreria (obra_id, metal, pureza, piedrapreciosa) VALUES ($1, $2, $3, $4)', [
                obraId, datos.metal, datos.pureza, datos.piedraPreciosa
            ]);
        }
    }

    static async _actualizarSubtipo(obraId, generoId, datos) {
        const normalize = (value) => (value === '' || value === undefined ? null : value);

        if (generoId === 1) {
            const result = await db.query('SELECT obra_id FROM pintura WHERE obra_id = $1', [obraId]);
            if (result.rows.length === 0) {
                await db.query(
                    'INSERT INTO pintura (obra_id, tecnica, soporte) VALUES ($1, $2, $3)',
                    [obraId, normalize(datos.tecnica), normalize(datos.soporte)]
                );
            } else {
                await db.query(
                    'UPDATE pintura SET tecnica = COALESCE(NULLIF($1, \'\'), tecnica), soporte = COALESCE(NULLIF($2, \'\'), soporte) WHERE obra_id = $3',
                    [datos.tecnica, datos.soporte, obraId]
                );
            }
        } else if (generoId === 2) {
            const result = await db.query('SELECT obra_id FROM escultura WHERE obra_id = $1', [obraId]);
            if (result.rows.length === 0) {
                await db.query(
                    'INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES ($1, $2, $3, $4, $5, $6)',
                    [
                        obraId,
                        normalize(datos.material),
                        ObraModel._toDecimal(datos.peso),
                        ObraModel._toDecimal(datos.largo),
                        ObraModel._toDecimal(datos.ancho),
                        ObraModel._toDecimal(datos.profundidad)
                    ]
                );
            } else {
                await db.query(
                    'UPDATE escultura SET material = COALESCE(NULLIF($1, \'\'), material), peso = COALESCE(NULLIF($2, \'\'), peso), largo = COALESCE(NULLIF($3, \'\'), largo), ancho = COALESCE(NULLIF($4, \'\'), ancho), profundidad = COALESCE(NULLIF($5, \'\'), profundidad) WHERE obra_id = $6',
                    [
                        datos.material,
                        ObraModel._toDecimal(datos.peso),
                        ObraModel._toDecimal(datos.largo),
                        ObraModel._toDecimal(datos.ancho),
                        ObraModel._toDecimal(datos.profundidad),
                        obraId
                    ]
                );
            }
        } else if (generoId === 3) {
            const result = await db.query('SELECT obra_id FROM fotografia WHERE obra_id = $1', [obraId]);
            if (result.rows.length === 0) {
                await db.query(
                    'INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES ($1, $2, $3, $4)',
                    [
                        obraId,
                        normalize(datos.tipo_foto),
                        normalize(datos.papel),
                        normalize(datos.formato)
                    ]
                );
            } else {
                await db.query(
                    'UPDATE fotografia SET tipo = COALESCE(NULLIF($1, \'\'), tipo), papel = COALESCE(NULLIF($2, \'\'), papel), formato = COALESCE(NULLIF($3, \'\'), formato) WHERE obra_id = $4',
                    [datos.tipo_foto, datos.papel, datos.formato, obraId]
                );
            }
        } else if (generoId === 4) {
            const result = await db.query('SELECT obra_id FROM ceramica WHERE obra_id = $1', [obraId]);
            if (result.rows.length === 0) {
                await db.query(
                    'INSERT INTO ceramica (obra_id, tipoarcilla, temperaturacoccion, tipoesmalte) VALUES ($1, $2, $3, $4)',
                    [
                        obraId,
                        normalize(datos.tipoArcilla),
                        ObraModel._toDecimal(datos.temperaturaCoccion),
                        normalize(datos.tipoEsmalte)
                    ]
                );
            } else {
                await db.query(
                    'UPDATE ceramica SET tipoarcilla = COALESCE(NULLIF($1, \'\'), tipoarcilla), temperaturacoccion = COALESCE(NULLIF($2, \'\'), temperaturacoccion), tipoesmalte = COALESCE(NULLIF($3, \'\'), tipoesmalte) WHERE obra_id = $4',
                    [datos.tipoArcilla, ObraModel._toDecimal(datos.temperaturaCoccion), datos.tipoEsmalte, obraId]
                );
            }
        } else if (generoId === 5) {
            const result = await db.query('SELECT obra_id FROM orfebreria WHERE obra_id = $1', [obraId]);
            if (result.rows.length === 0) {
                await db.query(
                    'INSERT INTO orfebreria (obra_id, metal, pureza, piedrapreciosa) VALUES ($1, $2, $3, $4)',
                    [
                        obraId,
                        normalize(datos.metal),
                        normalize(datos.pureza),
                        normalize(datos.piedraPreciosa)
                    ]
                );
            } else {
                await db.query(
                    'UPDATE orfebreria SET metal = COALESCE(NULLIF($1, \'\'), metal), pureza = COALESCE(NULLIF($2, \'\'), pureza), piedrapreciosa = COALESCE(NULLIF($3, \'\'), piedrapreciosa) WHERE obra_id = $4',
                    [datos.metal, datos.pureza, datos.piedraPreciosa, obraId]
                );
            }
        }
    }

    // Actualizar estatus a Vendida

    static async marcarComoVendida(id) {
        await db.query("UPDATE obra SET estatus = 'Vendida', reservado_por = NULL, fecha_reserva = NULL WHERE id = $1", [id]);
    }

    static async marcarComoDisponible(id) {
        const result = await db.query(
            "UPDATE obra SET estatus = 'Disponible', reservado_por = NULL, fecha_reserva = NULL WHERE id = $1 AND estatus = 'Reservada'",
            [id]
        );
        return result.rowCount > 0;
    }

    // --- NUEVO: OBTENER OBRAS POR AUTOR (Para Biografia) ---
    static async obtenerPorAutor(autorId) {
        const sql = `
            SELECT o.id, o.genero_id, o.autor_id, o.nombre, o.fechacreacion AS "fechaCreacion", o.precioobra AS "precioObra", o.porcentajeganancia AS "porcentajeGanancia", o.estatus, o.foto, o.reservado_por, o.fecha_reserva, g.nombre as nombre_genero 
            FROM obra o
            INNER JOIN genero g ON o.genero_id = g.id
            WHERE o.autor_id = $1
            ORDER BY o.fechacreacion DESC
        `;
        const result = await db.query(sql, [autorId]);
        return result.rows;
    }

    // ESTADÍSTICAS 1: Obras por Género
    static async obtenerEstadisticasGeneros() {
        const sql = `
            SELECT g.nombre, COUNT(o.id)::integer as total 
            FROM genero g
            LEFT JOIN obra o ON o.genero_id = g.id
            GROUP BY g.nombre
        `;
        const result = await db.query(sql);
        return result.rows;
    }

    // ESTADÍSTICAS 2: Obras por Estatus
    static async obtenerEstadisticasEstatus() {
        const sql = `
            SELECT estatus, COUNT(id)::integer as total 
            FROM obra 
            GROUP BY estatus
        `;
        const result = await db.query(sql);
        return result.rows;
    }

}

module.exports = ObraModel;