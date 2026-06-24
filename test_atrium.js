const db = require('./src/config/db');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Inicializar Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function diagnosticoEcosistema() {
    console.log("====================================================================");
    console.log("🔍 INICIANDO DIAGNÓSTICO INTEGRADO - PROYECTO ATRIUM");
    console.log("====================================================================\n");

    // 1. PROBAR CONEXIÓN A POSTGRESQL (NEON.TECH)
    console.log("1. Conectando a PostgreSQL en Neon.tech...");
    try {
        const startTime = Date.now();
        const res = await db.query("SELECT NOW() as hora_servidor, version()");
        const latency = Date.now() - startTime;
        console.log(`   🟢 ÉXITO: Base de datos relacional conectada.`);
        console.log(`   ⏱️  Latencia: ${latency}ms`);
        console.log(`   🖥️  Versión: ${res.rows[0].version.split(',')[0]}`);
        console.log(`   🕒 Hora Servidor: ${res.rows[0].hora_servidor}\n`);
    } catch (err) {
        console.error("   ❌ ERROR en PostgreSQL:", err.message, "\n");
    }

    // 2. PROBAR ALMACENAMIENTO DE SUPABASE STORAGE
    console.log("2. Verificando persistencia en Supabase Storage...");
    try {
        // Pixel de prueba blanco 1x1 en base64
        const base64Data = "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
        const buffer = Buffer.from(base64Data, 'base64');
        const testFilename = `test/test-connection-${Date.now()}.gif`;

        const startTime = Date.now();

        // Intentar subir al bucket 'atrium-images'
        const { data, error } = await supabase.storage
            .from('atrium-images')
            .upload(testFilename, buffer, {
                contentType: 'image/gif',
                duplex: 'half'
            });

        if (error) throw error;

        // Recuperar la URL pública
        const { data: publicUrlData } = supabase.storage
            .from('atrium-images')
            .getPublicUrl(testFilename);

        const latency = Date.now() - startTime;

        console.log(`   🟢 ÉXITO: Conexión con Supabase y subida al bucket 'atrium-images' validadas.`);
        console.log(`   ⏱️  Latencia de subida: ${latency}ms`);
        console.log(`   🔗 URL pública generada: ${publicUrlData.publicUrl}\n`);

        // Limpieza: borrar el archivo de prueba de Supabase
        await supabase.storage.from('atrium-images').remove([testFilename]);

    } catch (err) {
        console.error("   ❌ ERROR en Supabase Storage:");
        console.error("      Asegúrese de haber creado un bucket público llamado 'atrium-images' en Supabase.");
        console.error("      Detalles del error:", err.message, "\n");
    }

    // 3. PROBAR CONEXIÓN AL MICROSERVICIO DE MONGODB (RENDER)
    console.log("3. Comprobando estado del Microservicio de MongoDB...");
    try {
        const mongoUrl = process.env.MONGO_API_URL || 'https://mongo-mp55.onrender.com';
        const startTime = Date.now();
        const response = await axios.get(`${mongoUrl}/artwork/`, { timeout: 5000 });
        const latency = Date.now() - startTime;

        console.log(`   🟢 ÉXITO: Conexión establecida con el microservicio.`);
        console.log(`   ⏱️  Latencia: ${latency}ms\n`);
    } catch (err) {
        if (err.code === 'ECONNABORTED' || err.message.includes('timeout')) {
            console.warn("   ⚠️ ADVERTENCIA: El microservicio de MongoDB está dormido (Cold Start en Render). Las peticiones tardarán en cargar la primera vez, pero la tolerancia a fallos del backend Atrium evitará caídas.\n");
        } else {
            console.error("   ❌ ERROR en Microservicio de MongoDB:", err.message, "\n");
        }
    }

    console.log("====================================================================");
    console.log("🏁 FIN DEL DIAGNÓSTICO");
    console.log("====================================================================");
    process.exit(0);
}

diagnosticoEcosistema();