const express = require('express');
const path = require('path');
const session = require('express-session'); // ¡VITAL para ti (Persona 2)!
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE VISTAS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES BASE ---
app.use(express.static(path.join(__dirname, 'public'))); // Archivos estáticos 
app.use(express.urlencoded({ extended: true })); // Para capturar formularios 
app.use(express.json());

// CONFIGURACIÓN DE SESIÓN 
app.use(session({
    secret: process.env.SESSION_SECRET || 'secreto_museo_uneg',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
}));


// Exponer la sesión a todas las vistas
app.use((req, res, next) => {
    res.locals.usuario = req.session?.usuario || null;
    next();
});


// --- RUTA RAÍZ ---
app.get('/', (req, res) => {
    //res.redirect('/galeria'); 
    res.render('landing'); // Renderiza la nueva portada
});

// --- 3. IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./src/routes/authRoutes'); 
const pagoRoutes = require('./src/routes/pagoRoutes');
const galeriaRoutes = require('./src/routes/galeriaRoutes'); 
const adminRoutes = require('./src/routes/adminRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes'); // Importamos tus rutas de usuario

// --- 4. USO DE RUTAS ---
app.use('/auth', authRoutes);  
app.use('/pagos', pagoRoutes);
app.use('/galeria', galeriaRoutes); 
app.use('/admin', adminRoutes);
app.use('/usuario', usuarioRoutes); 

app.use((req, res) => {
    res.status(404).send('Página no encontrada (404)');
});

// --- LEVANTAR SERVIDOR ---
const db = require('./src/config/db'); // Ajusta la ruta a tu db.js si es otra
const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
    console.log(`Servidor activo en puerto ${PORT}`);
    
    try {
        // Le pedimos a la BD el nombre de la base de datos actual y la versión
        const res = await db.query("SELECT current_database(), version();");
        console.log("==========================================");
        console.log(`¡CONEXIÓN DE DIAGNÓSTICO EXITOSA!`);
        console.log(`Conectado a la base de datos: ${res.rows[0].current_database}`);
        console.log(`Versión del motor: ${res.rows[0].version}`);
        console.log("==========================================");
    } catch (error) {
        console.error("❌ Error conectando a la base de datos:", error.message);
    }
});

module.exports = app;