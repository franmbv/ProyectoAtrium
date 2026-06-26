require('dotenv').config();
const axios = require('axios');

async function diagnosticoIA() {
    console.log("====================================================================");
    console.log("🔍 INICIANDO DIAGNÓSTICO DE IA (GROQ) - PROYECTO ATRIUM");
    console.log("====================================================================\n");

    const apiKey = process.env.GROQ_API_KEY;
    console.log("   [DEBUG env] ¿GROQ_API_KEY definida?:", apiKey ? "Sí" : "No");

    if (!apiKey) {
        console.error("   ❌ ERROR: No se ha detectado la variable GROQ_API_KEY en tu archivo .env");
        process.exit(1);
    }

    try {
        const startTime = Date.now();
        const response = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: "llama-3.1-8b-instant",
            messages: [
                { role: "system", content: "Eres el curador virtual de Museo Atrium." },
                { role: "user", content: "Valida la conexión respondiendo únicamente con la palabra: ONLINE" }
            ],
            temperature: 0.1
        }, {
            headers: { 'Authorization': `Bearer ${apiKey}` }
        });

        const result = response.data.choices[0].message.content.trim();
        const latency = Date.now() - startTime;

        console.log(`   🟢 ÉXITO: Puente de comunicación con Groq validado.`);
        console.log(`   ⏱️  Latencia de respuesta: ${latency}ms`);
        console.log(`   🤖 Respuesta de Llama-3.1: "${result}"\n`);
    } catch (error) {
        console.error("   ❌ ERROR de comunicación con Groq:");
        console.error("      Mensaje:", error.response ? JSON.stringify(error.response.data) : error.message, "\n");
    }
    process.exit(0);
}

// Invocación corregida
diagnosticoIA();