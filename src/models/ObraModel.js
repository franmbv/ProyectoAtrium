const db = require('../config/db');

class ObraModel {

    static _toDecimal(value, decimals = 2) {
        if (value === '' || value === null || value === undefined) return null;
        const numberValue = Number(String(value).replace(',', '.'));
        if (!Number.isFinite(numberValue)) return null;
        return Number(numberValue.toFixed(decimals));
    }

    // Método de consulta plana optimizado para alimentar el contexto de Groq/Llama-3.1
    static async obtenerCatalogoParaIA() {
        const sql = `
            SELECT o.nombre, o.precioObra,
                   g.nombre as genero,
                   a.nombre as artista_nombre, a.apellido as artista_apellido
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.Id
            WHERE o.estatus = 'Disponible'
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // 1. Obtener Obras para la Galería con Filtros (Corregido 'genero' singular)
    static async obtenerFiltradas(filtros) {
        let query = `
            SELECT o.*, a.nombre as nombre_artista, a.apellido as apellido_artista, g.nombre as nombre_genero 
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.Id
            WHERE o.estatus = 'Disponible'
        `;
        
        const params = [];

        if (filtros.busqueda && filtros.busqueda !== '') {
            query += ' AND (LOWER(o.nombre) LIKE ? OR LOWER(a.nombre) LIKE ? OR LOWER(a.apellido) LIKE ?)';
            const term = `%${filtros.busqueda.toLowerCase()}%`;
            params.push(term, term, term);
        }

        if (filtros.genero && filtros.genero !== '') {
            query += ' AND o.genero_id = ?';
            params.push(filtros.genero);
        }

        if (filtros.artista && filtros.artista !== '') {
            query += ' AND o.autor_id = ?';
            params.push(filtros.artista);
        }

        if (filtros.precio === 'menor') {
            query += ' ORDER BY o.precioObra ASC';
        } else if (filtros.precio === 'mayor') {
            query += ' ORDER BY o.precioObra DESC';
        } else {
            query += ' ORDER BY o.id DESC';
        }

        const [rows] = await db.execute(query, params);
        return rows;
    }

    // 2. Obtener una Obra por ID con sus detalles polimórficos de forma desacoplada
    static async obtenerPorId(id) {
        const query = `
            SELECT 
                o.*, 
                a.nombre as nombre_artista, a.apellido as apellido_artista, a.nacionalidad,
                g.nombre as nombre_genero
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.Id
            WHERE o.id = ?
        `;

        const [rows] = await db.execute(query, [id]);
        if (!rows[0]) return null;

        const obra = rows[0];
        
        // Mapeo transparente: Mueve los campos del JSONB de detalles al nivel raíz
        if (obra.detalles && typeof obra.detalles === 'object') {
            Object.keys(obra.detalles).forEach(key => {
                if (obra[key] === undefined || obra[key] === null) {
                    obra[key] = obra.detalles[key];
                }
            });
        }
        return obra; 
    }

    // 3. Obtener listas de géneros para los filtros (Corregido 'genero' singular)
    static async obtenerGeneros() {
        const [rows] = await db.execute('SELECT Id as id, nombre FROM genero ORDER BY nombre ASC');
        return rows;
    }

    static async obtenerArtistas() {
        const [rows] = await db.execute('SELECT id, nombre, apellido FROM artista WHERE estado = \'Activo\' ORDER BY nombre ASC');
        return rows;
    }

    // Buscar obra por nombre
    static async findByNombre(nombre) {
        const query = 'SELECT * FROM obra WHERE LOWER(nombre) = LOWER(?) LIMIT 1';
        const [rows] = await db.execute(query, [nombre]);
        return rows[0]; 
    }

    // Reservar obra
    static async reservarById(id, compradorId) {
        const query = "UPDATE obra SET estatus = 'Reservada', reservado_por = ?, fecha_reserva = CURRENT_DATE WHERE id = ? AND estatus = 'Disponible'";
        const [result] = await db.execute(query, [compradorId, id]);
        return result.affectedRows > 0;
    }

    // DASHBOARD: Contar obras
    static async contarTotal() {
        const [rows] = await db.execute('SELECT COUNT(*) AS total FROM obra');
        return rows[0].total;
    }

    // DASHBOARD: Contar inventario activo (Disponible + Reservada)
    static async contarInventarioActivo() {
        const sql = "SELECT COUNT(*) AS total FROM obra WHERE estatus IN ('Disponible', 'Reservada')";
        const [rows] = await db.execute(sql);
        return rows[0].total;
    }

    // INVENTARIO: Listar todas con joins (Corregido 'genero' singular)
    static async obtenerInventario() {
        const sql = `
            SELECT o.id, o.nombre, o.estatus, o.precioObra, o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.Id
            ORDER BY o.id DESC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // Obtener Reservadas (Corregido 'genero' singular)
    static async obtenerReservadas() {
        const sql = `
            SELECT o.id, o.nombre, o.estatus, o.precioObra, o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.Id
            WHERE o.estatus = 'Reservada'
            ORDER BY o.id DESC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // Obtener obras reservadas por un usuario específico (Corregido 'genero' singular)
    static async obtenerReservadasPorUsuario(usuarioId) {
        const sql = `
            SELECT o.id, o.nombre, o.estatus, o.precioObra, o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero, o.reservado_por, o.fecha_reserva
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.Id
            WHERE o.estatus = 'Reservada' AND o.reservado_por = ?
            ORDER BY o.fecha_reserva DESC
        `;
        const [rows] = await db.execute(sql, [usuarioId]);
        return rows;
    }

    // CREAR OBRA DINÁMICA POLIMÓRFICA
    static async crear(datos, fotoFilename) {
        // Recolectar atributos dinámicos que no pertenecen al esquema plano de base de la obra
        const detalles = {};
        const baseKeys = ['genero_id', 'autor_id', 'nombre', 'precioObra', 'porcentajeGanancia', 'foto', 'obra_id', 'foto_actual'];
        Object.keys(datos).forEach(key => {
            if (!baseKeys.includes(key)) {
                detalles[key] = String(datos[key]).trim();
            }
        });

        const sqlObra = `INSERT INTO obra
            (genero_id, autor_id, nombre, fechaCreacion, precioObra, porcentajeGanancia, estatus, foto, detalles)
            VALUES (?, ?, ?, CURRENT_DATE, ?, ?, 'Disponible', ?, ?)`;
        
        const [result] = await db.execute(sqlObra, [
            parseInt(datos.genero_id, 10), 
            parseInt(datos.autor_id, 10), 
            datos.nombre, 
            ObraModel._toDecimal(datos.precioObra), 
            ObraModel._toDecimal(datos.porcentajeGanancia), 
            fotoFilename,
            JSON.stringify(detalles)
        ]);
        
        const obraId = result.insertId;
        const generoId = parseInt(datos.genero_id, 10);

        // Si es una de las 5 categorías tradicionales, inserta también en su subtabla para redundancia física
        if (generoId >= 1 && generoId <= 5) {
            await ObraModel._insertarSubtipo(obraId, generoId, datos);
        }
        
        return obraId;
    }

    // ACTUALIZAR OBRA DINÁMICA POLIMÓRFICA
    static async actualizar(id, datos, fotoFilename) {
        const [rows] = await db.execute('SELECT genero_id, foto FROM obra WHERE id = ?', [id]);
        if (rows.length === 0) {
            return false;
        }

        const actual = rows[0];
        const nuevoGeneroId = parseInt(datos.genero_id, 10);
        const nuevaFoto = fotoFilename || actual.foto;

        // Recolectar atributos dinámicos
        const detalles = {};
        const baseKeys = ['genero_id', 'autor_id', 'nombre', 'precioObra', 'porcentajeGanancia', 'foto', 'obra_id', 'foto_actual'];
        Object.keys(datos).forEach(key => {
            if (!baseKeys.includes(key)) {
                detalles[key] = String(datos[key]).trim();
            }
        });

        await db.execute(
            'UPDATE obra SET genero_id = ?, autor_id = ?, nombre = ?, precioObra = ?, porcentajeGanancia = ?, foto = ?, detalles = ? WHERE id = ?',
            [
                nuevoGeneroId,
                parseInt(datos.autor_id, 10),
                datos.nombre,
                ObraModel._toDecimal(datos.precioObra),
                ObraModel._toDecimal(datos.porcentajeGanancia),
                nuevaFoto,
                JSON.stringify(detalles),
                id
            ]
        );

        // Control de subtipos físicos tradicionales
        if (nuevoGeneroId !== actual.genero_id) {
            await db.execute('DELETE FROM pintura WHERE obra_id = ?', [id]);
            await db.execute('DELETE FROM escultura WHERE obra_id = ?', [id]);
            await db.execute('DELETE FROM fotografia WHERE obra_id = ?', [id]);
            await db.execute('DELETE FROM ceramica WHERE obra_id = ?', [id]);
            await db.execute('DELETE FROM orfebreria WHERE obra_id = ?', [id]);
            if (nuevoGeneroId >= 1 && nuevoGeneroId <= 5) {
                await ObraModel._insertarSubtipo(id, nuevoGeneroId, datos);
            }
        } else {
            if (nuevoGeneroId >= 1 && nuevoGeneroId <= 5) {
                await ObraModel._actualizarSubtipo(id, nuevoGeneroId, datos);
            }
        }

        return true;
    }

    // ELIMINAR OBRA FÍSICA
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
        if (generoId === 1) { // Pintura
            await db.execute('INSERT INTO pintura (obra_id, tecnica, soporte) VALUES (?, ?, ?)', [
                obraId, datos.tecnica, datos.soporte
            ]);
        } else if (generoId === 2) { // Escultura
            await db.execute('INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES (?, ?, ?, ?, ?, ?)', [
                obraId,
                datos.material,
                ObraModel._toDecimal(datos.peso),
                ObraModel._toDecimal(datos.largo),
                ObraModel._toDecimal(datos.ancho),
                ObraModel._toDecimal(datos.profundidad)
            ]);
        } else if (generoId === 3) { // Fotografia
            await db.execute('INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES (?, ?, ?, ?)', [
                obraId, datos.tipo_foto, datos.papel, datos.formato
            ]);
        } else if (generoId === 4) { // Ceramica
            await db.execute('INSERT INTO ceramica (obra_id, tipoArcilla, temperaturaCoccion, tipoEsmalte) VALUES (?, ?, ?, ?)', [
                obraId,
                datos.tipoArcilla,
                ObraModel._toDecimal(datos.temperaturaCoccion),
                datos.tipoEsmalte
            ]);
        } else if (generoId === 5) { // Orfebreria
            await db.execute('INSERT INTO orfebreria (obra_id, metal, pureza, piedraPreciosa) VALUES (?, ?, ?, ?)', [
                obraId, datos.metal, datos.pureza, datos.piedraPreciosa
            ]);
        }
    }

    static async _actualizarSubtipo(obraId, generoId, datos) {
        const normalize = (value) => (value === '' || value === undefined ? null : value);

        if (generoId === 1) {
            const [rows] = await db.execute('SELECT obra_id FROM pintura WHERE obra_id = ?', [obraId]);
            if (rows.length === 0) {
                await db.execute(
                    'INSERT INTO pintura (obra_id, tecnica, soporte) VALUES (?, ?, ?)',
                    [obraId, normalize(datos.tecnica), normalize(datos.soporte)]
                );
            } else {
                await db.execute(
                    'UPDATE pintura SET tecnica = COALESCE(NULLIF(?, \'\'), tecnica), soporte = COALESCE(NULLIF(?, \'\'), soporte) WHERE obra_id = ?',
                    [datos.tecnica, datos.soporte, obraId]
                );
            }
        } else if (generoId === 2) {
            const [rows] = await db.execute('SELECT obra_id FROM escultura WHERE obra_id = ?', [obraId]);
            if (rows.length === 0) {
                await db.execute(
                    'INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES (?, ?, ?, ?, ?, ?)',
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
                await db.execute(
                    'UPDATE escultura SET material = COALESCE(NULLIF(?, \'\'), material), peso = COALESCE(NULLIF(?, \'\'), peso), largo = COALESCE(NULLIF(?, \'\'), largo), ancho = COALESCE(NULLIF(?, \'\'), ancho), profundidad = COALESCE(NULLIF(?, \'\'), profundidad) WHERE obra_id = ?',
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
            const [rows] = await db.execute('SELECT obra_id FROM fotografia WHERE obra_id = ?', [obraId]);
            if (rows.length === 0) {
                await db.execute(
                    'INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES (?, ?, ?, ?)',
                    [
                        obraId,
                        normalize(datos.tipo_foto),
                        normalize(datos.papel),
                        normalize(datos.formato)
                    ]
                );
            } else {
                await db.execute(
                    'UPDATE fotografia SET tipo = COALESCE(NULLIF(?, \'\'), tipo), papel = COALESCE(NULLIF(?, \'\'), papel), formato = COALESCE(NULLIF(?, \'\'), formato) WHERE obra_id = ?',
                    [datos.tipo_foto, datos.papel, datos.formato, obraId]
                );
            }
        } else if (generoId === 4) {
            const [rows] = await db.execute('SELECT obra_id FROM ceramica WHERE obra_id = ?', [obraId]);
            if (rows.length === 0) {
                await db.execute(
                    'INSERT INTO ceramica (obra_id, tipoArcilla, temperaturaCoccion, tipoEsmalte) VALUES (?, ?, ?, ?)',
                    [
                        obraId,
                        normalize(datos.tipoArcilla),
                        ObraModel._toDecimal(datos.temperaturaCoccion),
                        normalize(datos.tipoEsmalte)
                    ]
                );
            } else {
                await db.execute(
                    'UPDATE ceramica SET tipoArcilla = COALESCE(NULLIF(?, \'\'), tipoArcilla), temperaturaCoccion = COALESCE(NULLIF(?, \'\'), temperaturaCoccion), tipoEsmalte = COALESCE(NULLIF(?, \'\'), tipoEsmalte) WHERE obra_id = ?',
                    [datos.tipoArcilla, ObraModel._toDecimal(datos.temperaturaCoccion), datos.tipoEsmalte, obraId]
                );
            }
        } else if (generoId === 5) {
            const [rows] = await db.execute('SELECT obra_id FROM orfebreria WHERE obra_id = ?', [obraId]);
            if (rows.length === 0) {
                await db.execute(
                    'INSERT INTO orfebreria (obra_id, metal, pureza, piedraPreciosa) VALUES (?, ?, ?, ?)',
                    [
                        obraId,
                        normalize(datos.metal),
                        normalize(datos.pureza),
                        normalize(datos.piedraPreciosa)
                    ]
                );
            } else {
                await db.execute(
                    'UPDATE orfebreria SET metal = COALESCE(NULLIF(?, \'\'), metal), pureza = COALESCE(NULLIF(?, \'\'), pureza), piedraPreciosa = COALESCE(NULLIF(?, \'\'), piedraPreciosa) WHERE obra_id = ?',
                    [datos.metal, datos.pureza, datos.piedraPreciosa, obraId]
                );
            }
        }
    }

    // --- NUEVO: OBTENER OBRAS POR AUTOR (Para Biografia - Corregido 'genero' singular) ---
    static async obtenerPorAutor(autorId) {
        const sql = `
            SELECT o.*, g.nombre as nombre_genero 
            FROM obra o
            INNER JOIN genero g ON o.genero_id = g.Id
            WHERE o.autor_id = ?
            ORDER BY o.fechaCreacion DESC
        `;
        const [rows] = await db.execute(sql, [autorId]);
        return rows;
    }

    // ESTADÍSTICAS 1: Obras por Género (Corregido 'genero' singular)
    static async obtenerEstadisticasGeneros() {
        const sql = `
            SELECT g.nombre, COUNT(o.id) as total 
            FROM genero g
            LEFT JOIN obra o ON o.genero_id = g.Id
            GROUP BY g.nombre
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // ESTADÍSTICAS 2: Obras por Estatus
    static async obtenerEstadisticasEstatus() {
        const sql = `
            SELECT estatus, COUNT(id) as total 
            FROM obra 
            GROUP BY estatus
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

}

module.exports = ObraModel;