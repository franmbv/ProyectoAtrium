require('dotenv').config();
const db = require('./src/config/db');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL || 'https://placeholder.supabase.co', 
    process.env.SUPABASE_KEY || 'placeholder'
);

async function diagnosticoEcosistema() {
    console.log("====================================================================");
    console.log("🔍 INICIANDO DIAGNÓSTICO INTEGRADO - PROYECTO ATRIUM");
    console.log("====================================================================\n");

    // 1. PostgreSQL (Neon.tech)
    console.log("1. Conectando a PostgreSQL en Neon.tech...");
    try {
        const startTime = Date.now();
        const [rows] = await db.execute("SELECT NOW() as hora_servidor, version() as version");
        console.log(`   🟢 ÉXITO: Base de datos relacional conectada.`);
        console.log(`   ⏱️  Latencia: ${Date.now() - startTime}ms\n`);
    } catch (err) {
        console.error("   ❌ ERROR en PostgreSQL:", err.message, "\n");
    }

    // 2. Supabase Storage (CDN de imágenes)
    console.log("2. Verificando persistencia en Supabase Storage...");
    try {
        const base64Data = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        const buffer = Buffer.from(base64Data, 'base64');
        const testFilename = `test/test-connection-${Date.now()}.gif`;
        const startTime = Date.now();

        const { data, error } = await supabase.storage
            .from('atrium-images')
            .upload(testFilename, buffer, {
                contentType: 'image/gif',
                duplex: 'half'
            });

        if (error) throw error;
        console.log(`   🟢 ÉXITO: Supabase conectado y bucket validado.`);
        console.log(`   ⏱️  Latencia de subida: ${Date.now() - startTime}ms\n`);
        await supabase.storage.from('atrium-images').remove([testFilename]);
    } catch (err) {
        console.error("   ❌ ERROR en Supabase Storage:", err.message, "\n");
    }

    // 3. MongoDB (Microservicio FastAPI)
    console.log("3. Comprobando estado del Microservicio de MongoDB...");
    try {
        const mongoUrl = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';
        const startTime = Date.now();
        await axios.get(`${mongoUrl}/artwork/`, { timeout: 5000 });
        console.log(`   🟢 ÉXITO: Microservicio MongoDB online.`);
        console.log(`   ⏱️  Latencia: ${Date.now() - startTime}ms\n`);
    } catch (err) {
        console.error("   ❌ ERROR en MongoDB:", err.message, "\n");
    }

    // 4. Neo4j (Microservicio de Recomendaciones)
    console.log("4. Comprobando estado del Microservicio de Neo4j...");
    try {
        const neo4jUrl = process.env.NEO4J_API_URL || 'https://neo4j-4g5x.onrender.com';
        const startTime = Date.now();
        await axios.get(`${neo4jUrl}/`, { timeout: 5000 });
        console.log(`   🟢 ÉXITO: Microservicio Neo4j online.`);
        console.log(`   ⏱️  Latencia: ${Date.now() - startTime}ms\n`);
    } catch (err) {
        console.error("   ❌ ERROR en Neo4j:", err.message, "\n");
    }

    console.log("====================================================================");
    console.log("🏁 FIN DEL DIAGNÓSTICO");
    console.log("====================================================================");
    process.exit(0);
}

diagnosticoEcosistema();