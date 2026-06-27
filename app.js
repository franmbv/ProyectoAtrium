const express = require('express');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE VISTAS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES BASE ---
app.use(express.static(path.join(__dirname, 'public'))); 
app.use(express.urlencoded({ extended: true })); 
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

// ====================================================================
// 📊 SISTEMA DE LOGS TÉCNICOS EN TIEMPO REAL (MONITOR DE TRANSACCIONES)
// ====================================================================
app.use((req, res, next) => {
    const hora = new Date().toLocaleTimeString('es-ES');
    console.log(`🌐 [${hora}] ${req.method} ${req.url}`);
    next();
});

// --- RUTA RAÍZ ---
app.get('/', (req, res) => {
    res.render('home'); 
});

// --- 2. LANDING DE MARKETING / COMERCIAL ---
app.get('/descubrir', async (req, res) => {
    try {
        const ObraModel = require('./src/models/ObraModel');
        const disponibles = await ObraModel.obtenerFiltradas({ precio: 'mayor' });
        const obraSemana = disponibles[0] || null;
        res.render('landing', { obraSemana });
    } catch (error) {
        console.error("Fallo al cargar la landing de marketing:", error.message);
        res.render('landing', { obraSemana: null });
    }
});

// --- 3. LANDING TÉCNICO (Defensa Académica con el Jurado) ---
app.get('/defensa', async (req, res) => {
    try {
        const ObraModel = require('./src/models/ObraModel');
        const disponibles = await ObraModel.obtenerFiltradas({ precio: 'mayor' });
        const obraSemana = disponibles[0] || null;
        res.render('landingTecnico', { obraSemana }); // Renderiza views/LandingTecnico.ejs
    } catch (error) {
        console.error("Fallo al cargar la landing técnica:", error.message);
        res.render('landingTecnico', { obraSemana: null });
    }
});


// --- IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./src/routes/authRoutes'); 
const pagoRoutes = require('./src/routes/pagoRoutes');
const galeriaRoutes = require('./src/routes/galeriaRoutes'); 
const adminRoutes = require('./src/routes/adminRoutes');
const usuarioRoutes = require('./src/routes/usuarioRoutes'); 

// --- USO DE RUTAS ---
app.use('/auth', authRoutes);  
app.use('/pagos', pagoRoutes);
app.use('/galeria', galeriaRoutes); 
app.use('/admin', adminRoutes);
app.use('/usuario', usuarioRoutes); 

app.use((req, res) => {
    console.warn(`⚠️ [404 NOT FOUND] Ruta no localizada: ${req.method} ${req.url}`);
    res.status(404).send('Página no encontrada (404)');
});

// ====================================================================
// ❌ MANEJADOR DE ERRORES GLOBAL (EVITA CAÍDAS Y MUESTRA LOGS EN CONSOLA)
// ====================================================================
app.use((err, req, res, next) => {
    const hora = new Date().toLocaleTimeString('es-ES');
    console.error(`\n❌ [${hora}] [CRITICAL SERVER ERROR]:`);
    console.error(err.stack);
    console.error("====================================================================\n");
    res.status(500).send('Error interno del servidor (500)');
});

// --- LEVANTAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`\n====================================================================`);
    console.log(`🚀 SERVIDOR ATRIUM INICIADO EXITOSAMENTE`);
    console.log(`📡 Escuchando en el puerto: ${PORT}`);
    console.log(`====================================================================\n`);
});

module.exports = app;