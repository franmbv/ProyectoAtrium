require('dotenv').config(); // Cargar entorno
const db = require('./src/config/db');
const bcrypt = require('bcryptjs');

async function instanciarAdministrador() {
    console.log("====================================================================");
    console.log("🔑 CONFIGURACIÓN AUTOMÁTICA DE CREDENCIALES ADMINISTRATIVAS");
    console.log("====================================================================\n");

    try {
        const passwordPlana = "admin123";
        // Generar el hash nativo usando exactamente su librería instalada
        const hashNativo = await bcrypt.hash(passwordPlana, 10);
        
        console.log(`🔐 Contraseña plana a registrar: "${passwordPlana}"`);
        console.log(`🔒 Hash nativo generado por su sistema: ${hashNativo}`);

        // 1. Verificar si el usuario ya existe en PostgreSQL (Neon.tech)
        const [rows] = await db.execute("SELECT id FROM usuario WHERE login = 'admin_atrium'");

        if (rows.length > 0) {
            console.log("\n🔄 El usuario 'admin_atrium' ya existe físicamente. Actualizando contraseña...");
            await db.execute(
                "UPDATE usuario SET password = $1 WHERE login = 'admin_atrium'",
                [hashNativo]
            );
            console.log("🟢 ÉXITO: Contraseña actualizada con éxito en la nube de Neon.");
        } else {
            console.log("\n➕ El usuario no existe en la nube. Creándolo desde cero...");
            // Asegurar la existencia del rol de Super Administrador (id = 3)
            try {
                await db.execute("INSERT INTO rol (id, nombre) VALUES (3, 'Super Administrador')");
            } catch (e) { /* Ignorar si ya existe el rol */ }

            await db.execute(
                "INSERT INTO usuario (rol_id, nombre, apellido, cedula, gmail, login, password, estado) VALUES (3, 'Admin', 'Atrium', 'V-00000000', 'admin@atrium.com', 'admin_atrium', $1, 'Activo')",
                [hashNativo]
            );
            console.log("🟢 ÉXITO: Administrador creado con éxito en la nube de Neon.");
        }

    } catch (error) {
        console.error("❌ ERROR durante el proceso:", error.message);
    }
    
    console.log("\n====================================================================");
    process.exit(0);
}

instanciarAdministrador();