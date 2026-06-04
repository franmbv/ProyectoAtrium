const db = require('./src/config/db');
const ObraModel = require('./src/models/ObraModel');

const FASTAPI_URL = 'http://localhost:8000';

const formatFechas = (date) => {
    if (!date) return null;
    return new Date(date).toISOString().split('T')[0];
};

async function migrar() {
    try {
        console.log('--- Iniciando migración a MongoDB ---');
        
        // 1. Migrar Categorías
        console.log('\nMigrando Categorías...');
        const categories = [
            { id_sql: 1, detalles: ["tecnica", "soporte"] },
            { id_sql: 2, detalles: ["material", "peso", "largo", "ancho", "profundidad"] },
            { id_sql: 3, detalles: ["tipo_foto", "papel", "formato"] },
            { id_sql: 4, detalles: ["tipoArcilla", "temperaturaCoccion", "tipoEsmalte"] },
            { id_sql: 5, detalles: ["metal", "pureza", "piedraPreciosa"] }
        ];

        for (const cat of categories) {
            const r = await fetch(`${FASTAPI_URL}/category/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(cat)
            });
            if (!r.ok) {
                const text = await r.text();
                try {
                    const data = JSON.parse(text);
                    console.log(`Error JSON Categoría ${cat.id_sql}: ${JSON.stringify(data)}`);
                } catch(e) {
                    console.log(`Error Servidor Categoría ${cat.id_sql} (HTTP ${r.status}): ${text}`);
                }
            } else {
                console.log(`Categoría ${cat.id_sql} migrada.`);
            }
        }

        // 2. Migrar Artistas
        console.log('\nMigrando Artistas...');
        const [artistas] = await db.execute('SELECT * FROM artista');
        for (const a of artistas) {
            const payload = {
                id_sql: a.id,
                nombre: a.nombre,
                apellido: a.apellido,
                fecha_nac: formatFechas(a.fechaNac),
                fecha_fal: formatFechas(a.fechaFal),
                nacionalidad: a.nacionalidad,
                descripcion: a.descripcion,
                fotografia: a.fotografia,
                estado: a.estado || 'Activo'
            };

            const r = await fetch(`${FASTAPI_URL}/artist/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!r.ok) {
                const text = await r.text();
                try {
                    const data = JSON.parse(text);
                    console.log(`Error JSON Artista ${a.id}: ${JSON.stringify(data)}`);
                } catch(e) {
                    console.log(`Error Servidor Artista ${a.id} (HTTP ${r.status}): ${text}`);
                }
            } else {
                console.log(`Artista ${a.id} migrado.`);
            }
        }

        // 3. Migrar Obras
        console.log('\nMigrando Obras...');
        const [obras] = await db.execute('SELECT id FROM obra');
        for (const { id } of obras) {
            const o = await ObraModel.obtenerPorId(id);
            if (!o) continue;

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

            const r = await fetch(`${FASTAPI_URL}/artwork/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!r.ok) {
                const text = await r.text();
                try {
                    const data = JSON.parse(text);
                    console.log(`Error JSON Obra ${o.id}: ${JSON.stringify(data)}`);
                } catch(e) {
                    console.log(`Error Servidor Obra ${o.id} (HTTP ${r.status}): ${text}`);
                }
            } else {
                console.log(`Obra ${o.id} migrada.`);
            }
        }
        
        console.log('\n--- Migración completada ---');
    } catch (error) {
        console.error('Error durante la migración:', error);
    } finally {
        process.exit(0);
    }
}

migrar();