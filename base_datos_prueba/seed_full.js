require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ========== CONFIG ==========
const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'museodeartecontemporaneo',
    waitForConnections: true,
    connectionLimit: 20
});

const MONGO_API = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';
const NEO4J_API = process.env.NEO4J_API_URL || 'http://localhost:8000';
const AUDITORIA_API = process.env.AUDITORIA_API_URL || 'https://museoatrium-auditoria.onrender.com';

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
const METADATA_PATH = path.join(__dirname, 'met_images_metadata.json');

const CANT_ARTISTAS = 100;
const CANT_OBRAS = 1000;
const CANT_COMPRADORES = 100;

// ========== DATA GENERATORS ==========
const nombresM = ['Carlos','Miguel','Juan','Pedro','Luis','Andres','Jorge','Antonio','Manuel','Francisco','Ricardo','Fernando','Roberto','Eduardo','Rafael','Sergio','Daniel','Pablo','Javier','Alberto','Alejandro','Diego','Gabriel','Tomas','Hector','Ruben','Oscar','Raul','Saul','Victor','Alfredo','Arturo','Enrique','Ignacio','Leopoldo','Marcelo','Nicolas','Omar','Patricio','Rogelio'];
const nombresF = ['Maria','Ana','Laura','Carmen','Rosa','Isabel','Cristina','Elena','Monica','Sandra','Patricia','Lucia','Sofia','Valentina','Camila','Daniela','Adriana','Beatriz','Claudia','Diana','Eva','Gabriela','Gloria','Irene','Julia','Leticia','Martha','Monica','Natalia','Olga','Paula','Silvia','Teresa','Veronica','Yolanda'];
const apellidos = ['Rodriguez','Garcia','Martinez','Lopez','Hernandez','Gonzalez','Perez','Sanchez','Ramirez','Torres','Flores','Rivera','Gomez','Diaz','Cruz','Morales','Ortiz','Gutierrez','Chavez','Ramos','Ruiz','Alvarez','Mendoza','Castillo','Reyes','Vargas','Castro','Jimenez','Moreno','Romero','Herrera','Medina','Aguilar','Vega','Castro','Fernandez','Soto','Dominguez','Cabrera','Rojas'];
const nacionalidades = ['Venezolana','Mexicana','Colombiana','Argentina','Española','Francesa','Italiana','Brasileña','Chilena','Peruana','Estadounidense','Britanica','Alemana','Japonesa','China','Rusa','Canadiense','Australiana','Cubana','Ecuatoriana','Dominicana','Panameña','Uruguaya','Paraguaya','Boliviana','Guatemalteca','Costarricense','Hondureña','Salvadoreña','Nicaraguense'];
const ciudades = ['Caracas','Maracaibo','Valencia','Barquisimeto','Ciudad de Mexico','Bogota','Buenos Aires','Madrid','Barcelona','Lima','Santiago','Bogota Medellin','Quito','Panama','Montevideo','Asuncion','La Paz','Guatemala','San Jose','Tegucigalpa','Managua','San Salvador','Santo Domingo','Havana','Toronto','New York','Miami','London','Paris','Roma'];
const estadosVE = ['Zulia','Carabobo','Distrito Capital','Miranda','Lara','Aragua','Bolivar','Anzoategui','Sucre','Monagas','Falcon','Merida','Tachira','Trujillo','Cojedes','Yaracuy','Barinas','Portuguesa','Delta Amacuro','Amazonas'];
const municipios = ['Libertador','San Francisco','San Diego','Valencia','Baruta','El Hatillo','Sucre','Guaicaipuro','Liberator','Brimon','Puerto Ordaz','Ciudad Guayana','Punto Fijo','Merida','Barquisimeto','Coro','Puerto La Cruz','Maturin','Cuman','San Cristobal'];
const calles = ['Av. Principal','Calle Norte','Calle Sur','Av. Bolivar','Calle 5','Av. Libertador','Calle Real','Urb. El Parque','Av. Francisco de Miranda','Calle Norte','Av. Urdaneta','Calle 10','Urb. Las Mercedes','Av. Rio Orinoco','Calle 8','Av. Principal','Urb. Los Samanes','Calle Norte','Av. Intercomunal','Urb. Villa Rica'];

const tecnicas = ['Oleo sobre lienzo','Acuarela','Acrilico sobre tela','Temple sobre tabla','Gouache','Pastel','Mixed media','Impasto','Puntillismo','Tecnica mixta'];
const soportes = ['Lienzo','Tabla','Carton','Madera','Papel','Tela','Panel','Fibra de vidrio'];
const materiales = ['Bronce','Marmol','Madera','Hierro','Cobre','Alabastro','Granito','Arcilla','Resina','Piedra'];
const tiposFoto = ['Retrato','Paisaje','Naturaleza muerta','Abstracta','Documental','Artistica','Blanco y negro','Vintage','Macro','Arquitectura'];
const papeles = ['Fotografico mate','Fotografico brillante','Fibra','Baryta','Hahnemuhle','Canson','Ilford','Kodak','Fuji','Artisan'];
const formatos = ['Cuadrado','Rectangular','Panoramico','Vertical','Horizontal','1:1','4:3','3:2','16:9','5:4'];
const arcillas = ['Porcelana','Gres','Terracota','Barro cocido','Arcilla blanca','Arcilla roja','Majolica','Estuco','Fayenza','Ceramica vidriada'];
const esmaltes = ['Transparente','Opaco','Mate','Brillante','Cristalino','Satino','Metalizado','Aperlado','Relleno','Veladura'];
const metales = ['Oro','Plata','Cobre','Bronce','Oro blanco','Platino','Laton','Alpaca','Paladio','Acero inox'];
const preciosRange = [500, 150000];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function randFloat(min, max, dec = 2) { return parseFloat((Math.random() * (max - min) + min).toFixed(dec)); }
function randDate(startYear, endYear) {
    const y = randInt(startYear, endYear);
    const m = String(randInt(1, 12)).padStart(2, '0');
    const d = String(randInt(1, 28)).padStart(2, '0');
    return `${y}-${m}-${d}`;
}
function limpiarString(s) { return s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').substring(0, 100) : ''; }

// ========== METADATA DE IMÁGENES ==========
let imagenesMeta = [];
function cargarMetadata() {
    if (fs.existsSync(METADATA_PATH)) {
        imagenesMeta = JSON.parse(fs.readFileSync(METADATA_PATH, 'utf8'));
        console.log(`[IMG] ${imagenesMeta.length} imágenes cargadas desde metadata`);
    } else {
        console.error('[IMG] No se encontró met_images_metadata.json');
    }
}

function getRandomImage(index) {
    if (imagenesMeta.length === 0) return 'default.png';
    const meta = imagenesMeta[index % imagenesMeta.length];
    return meta ? meta.filename : 'default.png';
}

// ========== SYNC FUNCTIONS ==========
async function syncArtistaMongo(artista) {
    try {
        await axios.post(`${MONGO_API}/artist/`, {
            id_sql: artista.id,
            nombre: artista.nombre,
            apellido: artista.apellido,
            nacionalidad: artista.nacionalidad || 'Desconocida',
            foto: artista.fotografia || 'default.png',
            estado_activo: true
        });
    } catch (e) {
        if (e.response && e.response.status === 400) return; // ya existe
        console.error(`  [Mongo] Error sync artista ${artista.id}: ${e.message}`);
    }
}

async function syncArtistaNeo4j(artista) {
    try {
        await axios.post(`${NEO4J_API}/api/v1/graph/artist`, {
            artista: {
                id_sql: artista.id,
                nombre: `${artista.nombre} ${artista.apellido}`,
                nacionalidad: artista.nacionalidad || 'Desconocida'
            }
        });
    } catch (e) {
        if (e.response && e.response.status === 409) return;
        console.error(`  [Neo4j] Error sync artista ${artista.id}: ${e.message}`);
    }
}

async function syncObraMongo(obra) {
    try {
        const detalles = {};
        if (obra.genero_id === 1) { detalles.tecnica = obra.tecnica || ''; detalles.soporte = obra.soporte || ''; }
        else if (obra.genero_id === 2) { detalles.material = obra.material || ''; detalles.peso = String(obra.peso || ''); detalles.largo = String(obra.largo || ''); detalles.ancho = String(obra.ancho || ''); detalles.profundidad = String(obra.profundidad || ''); }
        else if (obra.genero_id === 3) { detalles.tipo_foto = obra.tipo_foto || ''; detalles.papel = obra.papel || ''; detalles.formato = obra.formato || ''; }
        else if (obra.genero_id === 4) { detalles.tipoArcilla = obra.tipoArcilla || ''; detalles.temperaturaCoccion = String(obra.temperaturaCoccion || ''); detalles.tipoEsmalte = obra.tipoEsmalte || ''; }
        else if (obra.genero_id === 5) { detalles.metal = obra.metal || ''; detalles.pureza = String(obra.pureza || ''); detalles.piedraPreciosa = String(obra.piedraPreciosa || ''); }

        await axios.post(`${MONGO_API}/artwork/`, {
            id_sql: obra.id,
            genero_id: obra.genero_id,
            autor_id: obra.autor_id,
            nombre: obra.nombre,
            precio_obra: obra.precioObra,
            porcentaje_ganancia: obra.porcentajeGanancia,
            estatus: 'Disponible',
            foto: obra.foto || 'default.png',
            detalles
        });
    } catch (e) {
        if (e.response && e.response.status === 400) return;
        console.error(`  [Mongo] Error sync obra ${obra.id}: ${e.message}`);
    }
}

async function syncObraNeo4j(obra) {
    try {
        const anio = obra.fechaCreacion ? new Date(obra.fechaCreacion).getFullYear() : new Date().getFullYear();
        await axios.post(`${NEO4J_API}/api/v1/graph/artwork`, {
            obra: { id_sql: obra.id, titulo: obra.nombre, precio: obra.precioObra, anio },
            artista_id: obra.autor_id,
            genero_id: obra.genero_id
        });
    } catch (e) {
        if (e.response && e.response.status === 409) return;
        console.error(`  [Neo4j] Error sync obra ${obra.id}: ${e.message}`);
    }
}

async function syncCompradorNeo4j(usuario) {
    try {
        await axios.post(`${NEO4J_API}/api/v1/graph/comprador`, {
            comprador: { id_sql: usuario.id, nombre: `${usuario.nombre} ${usuario.apellido}`, email: usuario.gmail }
        });
    } catch (e) {
        if (e.response && e.response.status === 409) return;
        console.error(`  [Neo4j] Error sync comprador ${usuario.id}: ${e.message}`);
    }
}

async function enviarAuditoria(endpoint, data) {
    try {
        await axios.post(`${AUDITORIA_API}${endpoint}`, data);
    } catch (e) {
        // silencioso
    }
}

// ========== MAIN ==========
async function main() {
    console.log('========================================');
    console.log('  SEED COMPLETO - Museo Atrium');
    console.log('========================================\n');

    cargarMetadata();
    const conn = await db.getConnection();

    try {
        // ==================== PASO 0: VERIFICAR PREREQUISITOS ====================
        console.log('[0] Verificando prerequisitos...');
        const [generos] = await conn.execute('SELECT Id, nombre FROM genero');
        const [roles] = await conn.execute('SELECT Id, nombre FROM rol');
        const [preguntas] = await conn.execute('SELECT Id FROM catalogopreguntas');
        console.log(`  Géneros: ${generos.length} | Roles: ${roles.length} | Preguntas: ${preguntas.length}`);

        if (generos.length < 5 || roles.length < 3 || preguntas.length < 3) {
            throw new Error('Faltan datos seed (generos/roles/preguntas). Ejecuta el SQL dump primero.');
        }

        // ==================== PASO 1: ARTISTAS ====================
        console.log(`\n[1] Insertando ${CANT_ARTISTAS} artistas...`);
        const artistasCreados = [];
        const artistasUsados = new Set();

        for (let i = 0; i < CANT_ARTISTAS; i++) {
            let nombre, apellido;
            do {
                nombre = pick(nombresM.concat(nombresF));
                apellido = pick(apellidos);
            } while (artistasUsados.has(`${nombre.toLowerCase()}_${apellido.toLowerCase()}`));
            artistasUsados.add(`${nombre.toLowerCase()}_${apellido.toLowerCase()}`);

            const fechaNac = randDate(1920, 1995);
            const fechaFal = Math.random() > 0.7 ? randDate(1996, 2025) : null;
            const nacionalidad = pick(nacionalidades);
            const descripcion = `Artista ${nacionalidad} reconocido/a por su contribución al arte contemporáneo.`;
            const fotografia = getRandomImage(i);

            const [result] = await conn.execute(
                `INSERT INTO artista (nombre, apellido, fechaNac, fechaFal, nacionalidad, descripcion, fotografia, estado)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Activo')`,
                [limpiarString(nombre), limpiarString(apellido), fechaNac, fechaFal, limpiarString(nacionalidad), limpiarString(descripcion), fotografia]
            );

            const artista = { id: result.insertId, nombre, apellido, nacionalidad, fotografia };
            artistasCreados.push(artista);

            // Sync a MongoDB y Neo4j
            await syncArtistaMongo(artista);
            await syncArtistaNeo4j(artista);

            if ((i + 1) % 20 === 0) console.log(`  [1] ${i + 1}/${CANT_ARTISTAS} artistas creados`);
        }
        console.log(`  ✓ ${artistasCreados.length} artistas insertados y sincronizados\n`);

        // ==================== PASO 2: OBRAS ====================
        console.log(`[2] Insertando ${CANT_OBRAS} obras...`);
        const obrasCreadas = [];
        const nombreObrasUsados = new Set();

        for (let i = 0; i < CANT_OBRAS; i++) {
            const generoId = (i % 5) + 1; // Distribución均匀: 1-5
            const artista = pick(artistasCreados);
            const precio = randFloat(500, 50000);
            const porcentaje = randInt(5, 10);
            const foto = getRandomImage(i);

            // Nombre único de obra
            let nombreObra;
            let intentos = 0;
            do {
                const prefijos = ['Sin título','Composición','Estudio','Paisaje','Retrato','Naturaleza','Abstracción','Reflexión','Visión','Esperanza','Silencio','Memoria','Sueño','Viaje','Horizonte','Luz','Sombra','Tiempo','Espacio','Movimiento'];
                const sufijos = ['I','II','III','IV','V','en azul','en rojo','abstracto','contemporáneo','moderno','minimalista','figurativo','expresionista','surrealista','impresionista'];
                nombreObra = `${pick(prefijos)} ${pick(sufijos)} ${randInt(1, 999)}`;
                intentos++;
            } while (nombreObrasUsados.has(nombreObra) && intentos < 50);
            if (nombreObrasUsados.has(nombreObra)) nombreObra += ` - ${i}`;
            nombreObrasUsados.add(nombreObra);

            const fechaCreacion = randDate(1950, 2025);

            const [result] = await conn.execute(
                `INSERT INTO obra (genero_id, autor_id, nombre, fechaCreacion, precioObra, porcentajeGanancia, estatus, foto)
                 VALUES (?, ?, ?, ?, ?, ?, 'Disponible', ?)`,
                [generoId, artista.id, limpiarString(nombreObra), fechaCreacion, precio, porcentaje, foto]
            );

            const obraId = result.insertId;
            const obraData = { id: obraId, genero_id: generoId, autor_id: artista.id, nombre: nombreObra, precioObra: precio, porcentajeGanancia: porcentaje, foto, fechaCreacion };

            // Insertar subtipo
            if (generoId === 1) { // Pintura
                const tecnica = pick(tecnicas);
                const soporte = pick(soportes);
                await conn.execute('INSERT INTO pintura (obra_id, tecnica, soporte) VALUES (?, ?, ?)', [obraId, tecnica, soporte]);
                obraData.tecnica = tecnica; obraData.soporte = soporte;
            } else if (generoId === 2) { // Escultura
                const material = pick(materiales);
                const peso = randFloat(0.5, 500); const largo = randFloat(10, 300); const ancho = randFloat(10, 200); const prof = randFloat(5, 150);
                await conn.execute('INSERT INTO escultura (obra_id, material, peso, largo, ancho, profundidad) VALUES (?, ?, ?, ?, ?, ?)', [obraId, material, peso, largo, ancho, prof]);
                obraData.material = material; obraData.peso = peso; obraData.largo = largo; obraData.ancho = ancho; obraData.profundidad = prof;
            } else if (generoId === 3) { // Fotografía
                const tipo = pick(tiposFoto); const papel = pick(papeles); const formato = pick(formatos);
                await conn.execute('INSERT INTO fotografia (obra_id, tipo, papel, formato) VALUES (?, ?, ?, ?)', [obraId, tipo, papel, formato]);
                obraData.tipo_foto = tipo; obraData.papel = papel; obraData.formato = formato;
            } else if (generoId === 4) { // Cerámica
                const tipoArcilla = pick(arcillas); const temp = randInt(800, 1300); const esmalte = pick(esmaltes);
                await conn.execute('INSERT INTO ceramica (obra_id, tipoArcilla, temperaturaCoccion, tipoEsmalte) VALUES (?, ?, ?, ?)', [obraId, tipoArcilla, temp, esmalte]);
                obraData.tipoArcilla = tipoArcilla; obraData.temperaturaCoccion = temp; obraData.tipoEsmalte = esmalte;
            } else if (generoId === 5) { // Orfebrería
                const metal = pick(metales); const pureza = randFloat(0.5, 1); const piedra = Math.random() > 0.5 ? 1 : 0;
                await conn.execute('INSERT INTO orfebreria (obra_id, metal, pureza, piedraPreciosa) VALUES (?, ?, ?, ?)', [obraId, metal, pureza, piedra]);
                obraData.metal = metal; obraData.pureza = pureza; obraData.piedraPreciosa = piedra;
            }

            obrasCreadas.push(obraData);

            // Sync a MongoDB y Neo4j
            await syncObraMongo(obraData);
            await syncObraNeo4j(obraData);

            // Auditoría de creación en Cassandra
            await enviarAuditoria('/obras/historico', {
                id_obra: obraId, estatus_anterior: null, estatus_nuevo: 'Disponible',
                usuario_id: 1, ip_origen: '127.0.0.1', fecha_evento: new Date().toISOString()
            });

            if ((i + 1) % 100 === 0) console.log(`  [2] ${i + 1}/${CANT_OBRAS} obras creadas`);
        }
        console.log(`  ✓ ${obrasCreadas.length} obras insertadas y sincronizadas\n`);

        // ==================== PASO 3: COMPRADORES ====================
        console.log(`[3] Insertando ${CANT_COMPRADORES} compradores...`);
        const passwordHash = await bcrypt.hash('Comprador123!', 10);
        const compradoresCreados = [];
        const loginsUsados = new Set();
        const cedulasUsadas = new Set();
        const emailsUsados = new Set();

        for (let i = 0; i < CANT_COMPRADORES; i++) {
            let nombre, apellido, login, cedula, gmail;
            let intentos = 0;

            // Generar login único
            do {
                nombre = pick(nombresM.concat(nombresF));
                apellido = pick(apellidos);
                login = `${nombre.toLowerCase()}${apellido.toLowerCase()}${randInt(1, 9999)}`;
                intentos++;
            } while (loginsUsados.has(login) && intentos < 100);
            if (loginsUsados.has(login)) login += `_${i}`;
            loginsUsados.add(login);

            // Cédula única
            do { cedula = `V-${randInt(10000000, 29999999)}`; } while (cedulasUsadas.has(cedula));
            cedulasUsadas.add(cedula);

            // Email único
            do { gmail = `${nombre.toLowerCase()}.${apellido.toLowerCase()}${randInt(1, 9999)}@gmail.com`; } while (emailsUsados.has(gmail));
            emailsUsados.add(gmail);

            const fechaRegistro = randDate(2023, 2025);
            const ciudad = pick(ciudades);
            const estado = pick(estadosVE);
            const municipio = pick(municipios);
            const calle = pick(calles);

            // 1. Crear usuario (rol_id=2 = Comprador)
            const [result] = await conn.execute(
                `INSERT INTO usuario (rol_id, nombre, apellido, cedula, gmail, login, password, fechaRegistro)
                 VALUES (2, ?, ?, ?, ?, ?, ?, ?)`,
                [limpiarString(nombre), limpiarString(apellido), cedula, gmail, login, passwordHash, fechaRegistro]
            );

            const usuarioId = result.insertId;
            const codigoSeguridad = String(randInt(100, 999));
            const nroTarjeta = `${randInt(1000, 9999)} ${randInt(1000, 9999)} ${randInt(1000, 9999)} ${randInt(1000, 9999)}`;

            // 2. Crear info_comprador + membresía (en transacción)
            await conn.execute(
                `INSERT INTO info_comprador (comprador_id, codigoSeguridad, nroTarjeta, estado, fechaGeneracion, pais, estado_residencia, ciudad, municipio, calle)
                 VALUES (?, ?, ?, 'Activo', CURDATE(), 'Venezuela', ?, ?, ?, ?)`,
                [usuarioId, codigoSeguridad, nroTarjeta.slice(-4), estado, ciudad, municipio, calle]
            );

            await conn.execute(
                `INSERT INTO membresia (comprador_id, montoPagado, fechaPago, estadoMembresia) VALUES (?, 10, CURDATE(), 1)`,
                [usuarioId]
            );

            // 3. Asignar 3 preguntas de seguridad (IDs 1, 2, 3)
            for (let p = 1; p <= 3; p++) {
                const respuestaHash = await bcrypt.hash(`respuesta${i}_${p}`, 10);
                await conn.execute(
                    `INSERT INTO asignacion_q_comprador (pregunta_id, comprador_id, respuesta) VALUES (?, ?, ?)`,
                    [p, usuarioId, respuestaHash]
                );
            }

            compradoresCreados.push({ id: usuarioId, nombre, apellido, gmail });

            // Sync a Neo4j
            await syncCompradorNeo4j({ id: usuarioId, nombre, apellido, gmail });

            // Auditoría de membresía en Cassandra
            const ahora = new Date();
            await enviarAuditoria('/reportes/membresias', {
                anio: ahora.getFullYear(), mes: ahora.getMonth() + 1,
                id_membresia: usuarioId, fecha_registro: ahora.toISOString(),
                id_comprador: usuarioId, codigo_membresia: codigoSeguridad,
                monto_cobrado: "10.00", estado: "ACTIVA"
            });

            if ((i + 1) % 20 === 0) console.log(`  [3] ${i + 1}/${CANT_COMPRADORES} compradores creados`);
        }
        console.log(`  ✓ ${compradoresCreados.length} compradores insertados y sincronizados\n`);

        // ==================== RESUMEN ====================
        console.log('========================================');
        console.log('  SEED COMPLETADO EXITOSAMENTE');
        console.log('========================================');
        console.log(`  Artistas:  ${artistasCreados.length} → MySQL + MongoDB + Neo4j`);
        console.log(`  Obras:     ${obrasCreadas.length}  → MySQL + MongoDB + Neo4j + Cassandra`);
        console.log(`  Compradores: ${compradoresCreados.length} → MySQL + Neo4j + Cassandra`);
        console.log(`  Contraseña universal: Comprador123!`);
        console.log(`  Login admin existente: (usa los que ya tienes)`);
        console.log('========================================');

    } catch (error) {
        console.error('\n[ERROR FATAL]', error.message);
        console.error(error.stack);
    } finally {
        conn.release();
        await db.end();
    }
}

main();
