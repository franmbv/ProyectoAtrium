const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '..', 'public', 'uploads');
const MET_API = 'https://collectionapi.metmuseum.org/public/collection/v1';
const DEPARTMENTS = [11, 13, 21, 12, 17, 14];
const BATCH_SIZE = 50;
const TARGET = 1000;

function fetchJSON(url) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        const req = proto.get(url, { headers: { 'User-Agent': 'AtriumSeed/1.0' }, timeout: 15000 }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error(`Parse: ${data.substring(0, 100)}`)); }
            });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.on('error', reject);
    });
}

function downloadImage(url, destPath) {
    return new Promise((resolve, reject) => {
        const proto = url.startsWith('https') ? https : http;
        const req = proto.get(url, { headers: { 'User-Agent': 'AtriumSeed/1.0' }, timeout: 20000 }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadImage(res.headers.location, destPath).then(resolve).catch(reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const file = fs.createWriteStream(destPath);
            res.pipe(file);
            file.on('finish', () => { file.close(); resolve(); });
            file.on('error', (err) => { if (fs.existsSync(destPath)) fs.unlinkSync(destPath); reject(err); });
        });
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
        req.on('error', reject);
    });
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
    console.log('=== Descarga por lotes del Met Museum ===\n');
    if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

    // Cargar progreso previo
    const metaPath = path.join(__dirname, 'met_images_metadata.json');
    let metadata = [];
    if (fs.existsSync(metaPath)) {
        metadata = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
        console.log(`Progreso previo: ${metadata.length} imágenes descargadas`);
    }
    const existingIds = new Set(metadata.map(m => m.id));

    // Obtener todos los IDs
    const allObjectIds = [];
    for (const deptId of DEPARTMENTS) {
        try {
            const data = await fetchJSON(`${MET_API}/objects?isPublicDomain=true&departmentIds=${deptId}`);
            if (data.objectIDs) {
                allObjectIds.push(...data.objectIDs.filter(id => !existingIds.has(id)));
                console.log(`Dept ${deptId}: ${data.objectIDs.length} total, ${data.objectIDs.length - existingIds.size} nuevos`);
            }
            await sleep(300);
        } catch (e) {
            console.error(`Error dept ${deptId}: ${e.message}`);
        }
    }

    console.log(`\nIDs disponibles: ${allObjectIds.length}`);
    const shuffled = allObjectIds.sort(() => Math.random() - 0.5);
    const need = TARGET - metadata.length;
    const toTry = shuffled.slice(0, Math.min(need * 2, shuffled.length));
    console.log(`Necesitamos: ${need} más. Intentando: ${toTry.length}\n`);

    let downloaded = 0;
    let failed = 0;

    for (let i = 0; i < toTry.length && (metadata.length + downloaded) < TARGET; i++) {
        const objectId = toTry[i];
        try {
            const detail = await fetchJSON(`${MET_API}/objects/${objectId}`);
            if (!detail.primaryImageSmall && !detail.primaryImage) { failed++; continue; }

            const imageUrl = detail.primaryImageSmall || detail.primaryImage;
            const ext = imageUrl.split('.').pop().split('?')[0] || 'jpg';
            const filename = `met_${objectId}.${ext}`;
            const destPath = path.join(UPLOADS_DIR, filename);

            if (fs.existsSync(destPath)) { failed++; continue; }

            await downloadImage(imageUrl, destPath);
            downloaded++;

            metadata.push({
                id: objectId, filename,
                title: detail.title || 'Untitled',
                artist: detail.artistDisplayName || 'Unknown',
                artistNationality: detail.artistNationality || '',
                objectDate: detail.objectDate || '',
                medium: detail.medium || '',
                classification: detail.classification || ''
            });

            if (downloaded % 10 === 0) {
                console.log(`  OK: ${metadata.length}/${TARGET} (${downloaded} nuevas, ${failed} fallos)`);
            }

            // Pausa cada 5 descargas para no saturar
            if (i % 5 === 0) await sleep(500);

        } catch (e) {
            failed++;
            // Pausa más larga si hay error
            await sleep(1000);
        }
    }

    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    console.log(`\n=== RESUMEN ===`);
    console.log(`Total imágenes: ${metadata.length}`);
    console.log(`Nuevas: ${downloaded} | Fallos: ${failed}`);
}

main().catch(console.error);
