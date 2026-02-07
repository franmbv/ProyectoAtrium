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
    res.redirect('/galeria'); 
});

// --- 3. IMPORTACIÓN DE RUTAS ---
const authRoutes = require('./src/routes/authRoutes'); 
const pagoRoutes = require('./src/routes/pagoRoutes');
const galeriaRoutes = require('./src/routes/galeriaRoutes'); 
const adminRoutes = require('./src/routes/adminRoutes');

// --- 4. USO DE RUTAS ---
app.use('/auth', authRoutes);  
app.use('/pagos', pagoRoutes);
app.use('/galeria', galeriaRoutes); 
app.use('/admin', adminRoutes);

app.use((req, res) => {
    res.status(404).send('Página no encontrada (404)');
});

// --- LEVANTAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});

module.exports = app;