const db = require('../config/db');

class ObraModel {

    static async _syncConFastAPI(id, isCreate = false, isDelete = false) {
        try {
            if (isDelete) {
                await fetch(`http://localhost:8000/artwork/${id}`, { method: 'DELETE' })
                    .catch(e => console.error(`Error HTTP borrando obra ${id} en FastAPI:`, e.message));
                return;
            }

            const o = await this.obtenerPorId(id);
            if (!o) return;

            const formatFechas = (date) => date ? new Date(date).toISOString().split('T')[0] : null;

            const detalles = {};
            const categoriasConfig = {
                1: ["tecnica", "soporte"],
                2: ["material", "peso", "largo", "ancho", "profundidad"],
                3: ["tipo_foto", "papel", "formato"],
                4: ["tipoArcilla", "temperaturaCoccion", "tipoEsmalte"],
                5: ["metal", "pureza", "piedraPreciosa"]
            };
            
            const camposRequeridos = categoriasConfig[o.genero_id] || [];
            camposRequeridos.forEach(campo => {
                detalles[campo] = (o[campo] !== null && o[campo] !== undefined) ? String(o[campo]) : "";
            });

            const payload = {
                id_sql: o.id,
                genero_id: o.genero_id,
                autor_id: o.autor_id,
                nombre: o.nombre,
                fecha_creacion: formatFechas(o.fechaCreacion),
                precio_obra: Number(o.precioObra),
                porcentaje_ganancia: o.porcentajeGanancia !== null ? Number(o.porcentajeGanancia) : 0,
                estatus: o.estatus,
                foto: o.foto,
                detalles: detalles
            };

            const url = isCreate ? 'http://localhost:8000/artwork/' : `http://localhost:8000/artwork/${id}`;
            const method = isCreate ? 'POST' : 'PUT';

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const text = await response.text();
                console.error(`Error HTTP ${response.status} sincronizando obra ${id} con FastAPI:`, text);
            }
        } catch (error) {
            console.error(`Error interno sincronizando obra ${id} con FastAPI:`, error);
        }
    }

    static _toDecimal(value, decimals = 2) {
        if (value === '' || value === null || value === undefined) return null;
        const numberValue = Number(String(value).replace(',', '.'));
        if (!Number.isFinite(numberValue)) return null;
        return Number(numberValue.toFixed(decimals));
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

    // Buscar obra por nombre
    static async findByNombre(nombre) {
        const query = 'SELECT * FROM obra WHERE LOWER(nombre) = LOWER(?) LIMIT 1';
        const [rows] = await db.execute(query, [nombre]);
        return rows[0]; 
    }

    // Reservar obra
    static async reservarById(id, compradorId) {
        const query = "UPDATE obra SET estatus = 'Reservada', reservado_por = ?, fecha_reserva = CURDATE() WHERE id = ? AND estatus = 'Disponible'";
        const [result] = await db.execute(query, [compradorId, id]);
        if (result.affectedRows > 0) await this._syncConFastAPI(id, false);
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

    static async obtenerReservadas() {
        const sql = `
            SELECT o.id, o.nombre, o.estatus, o.precioObra, o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.id
            WHERE o.estatus = 'Reservada'
            ORDER BY o.id DESC
        `;
        const [rows] = await db.execute(sql);
        return rows;
    }

    // Obtener obras reservadas por un usuario específico
    static async obtenerReservadasPorUsuario(usuarioId) {
        const sql = `
            SELECT o.id, o.nombre, o.estatus, o.precioObra, o.foto,
                   a.nombre AS nombre_artista, a.apellido AS apellido_artista,
                   g.nombre AS nombre_genero, o.reservado_por, o.fecha_reserva
            FROM obra o
            INNER JOIN artista a ON o.autor_id = a.id
            INNER JOIN genero g ON o.genero_id = g.id
            WHERE o.estatus = 'Reservada' AND o.reservado_por = ?
            ORDER BY o.fecha_reserva DESC
        `;
        const [rows] = await db.execute(sql, [usuarioId]);
        return rows;
    }

    // CREAR OBRA 
    static async crear(datos, fotoFilename) {
        const sqlObra = `INSERT INTO obra
            (genero_id, autor_id, nombre, fechaCreacion, precioObra, porcentajeGanancia, estatus, foto)
            VALUES (?, ?, ?, CURDATE(), ?, ?, 'Disponible', ?)`;
        
        const [result] = await db.execute(sqlObra, [
            datos.genero_id, datos.autor_id, datos.nombre, 
            ObraModel._toDecimal(datos.precioObra), ObraModel._toDecimal(datos.porcentajeGanancia), fotoFilename
        ]);
        
        const obraId = result.insertId;
        const generoId = parseInt(datos.genero_id, 10);

        if (generoId === 1) { // Pintura
            await db.execute('INSERT INTO pintura (obra_id, tecnica, soporte) VALUES (?, ?, ?)', 
                [obraId, datos.tecnica, datos.soporte]);
        } 
        else if (generoId === 2) { // Escultura
            await db.execute('INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES (?, ?, ?, ?, ?, ?)',
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
            await db.execute('INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES (?, ?, ?, ?)',
                [obraId, datos.tipo_foto, datos.papel, datos.formato]);
        }
        else if (generoId === 4) { // Ceramica
            await db.execute('INSERT INTO ceramica (obra_id, tipoArcilla, temperaturaCoccion, tipoEsmalte) VALUES (?, ?, ?, ?)',
                [obraId, datos.tipoArcilla, ObraModel._toDecimal(datos.temperaturaCoccion), datos.tipoEsmalte]);
        }
        else if (generoId === 5) { // Orfebreria
            await db.execute('INSERT INTO orfebreria (obra_id, metal, pureza, piedraPreciosa) VALUES (?, ?, ?, ?)',
                [obraId, datos.metal, datos.pureza, datos.piedraPreciosa]);
        }
        
        await this._syncConFastAPI(obraId, true);
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
                ObraModel._toDecimal(datos.precioObra),
                ObraModel._toDecimal(datos.porcentajeGanancia),
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

        await this._syncConFastAPI(id, false);
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

        await this._syncConFastAPI(id, false, true);
        return true;
    }

    static async _insertarSubtipo(obraId, generoId, datos) {
        if (generoId === 1) {
            await db.execute('INSERT INTO pintura (obra_id, tecnica, soporte) VALUES (?, ?, ?)', [
                obraId, datos.tecnica, datos.soporte
            ]);
        } else if (generoId === 2) {
            await db.execute('INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES (?, ?, ?, ?, ?, ?)', [
                obraId,
                datos.material,
                ObraModel._toDecimal(datos.peso),
                ObraModel._toDecimal(datos.largo),
                ObraModel._toDecimal(datos.ancho),
                ObraModel._toDecimal(datos.profundidad)
            ]);
        } else if (generoId === 3) {
            await db.execute('INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES (?, ?, ?, ?)', [
                obraId, datos.tipo_foto, datos.papel, datos.formato
            ]);
        } else if (generoId === 4) {
            await db.execute('INSERT INTO ceramica (obra_id, tipoArcilla, temperaturaCoccion, tipoEsmalte) VALUES (?, ?, ?, ?)', [
                obraId,
                datos.tipoArcilla,
                ObraModel._toDecimal(datos.temperaturaCoccion),
                datos.tipoEsmalte
            ]);
        } else if (generoId === 5) {
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

    // Actualizar estatus a Vendida

    static async marcarComoVendida(id) {
        await db.execute("UPDATE obra SET estatus = 'Vendida', reservado_por = NULL, fecha_reserva = NULL WHERE id = ?", [id]);
        await this._syncConFastAPI(id, false);
    }

    static async marcarComoDisponible(id) {
        const [result] = await db.execute(
            "UPDATE obra SET estatus = 'Disponible', reservado_por = NULL, fecha_reserva = NULL WHERE id = ? AND estatus = 'Reservada'",
            [id]
        );
        if (result.affectedRows > 0) await this._syncConFastAPI(id, false);
        return result.affectedRows > 0;
    }

    // --- NUEVO: OBTENER OBRAS POR AUTOR (Para Biografia) ---
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

    // ESTADÍSTICAS 1: Obras por Género
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