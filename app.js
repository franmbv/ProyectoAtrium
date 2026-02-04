const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();

// --- CONFIGURACIÓN DE VISTAS ---
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- MIDDLEWARES BASE ---
app.use(express.static(path.join(__dirname, 'public'))); // Archivos estáticos 
app.use(express.urlencoded({ extended: true })); // Para capturar formularios 
app.use(express.json());

// Registrar rutas (importa el módulo pasándole 'app')
require('./src/models/infoComprador')(app);

// --- RUTAS BASE ---
app.get('/', (req, res) => {
    res.render('index.ejs'); 
});

app.get('/confirmar-reserva', (req, res) => {
    // Renderiza views/confirmar-reserva.ejs
    res.render('confirmar-reserva');
});

// --- LEVANTAR SERVIDOR ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor activo en puerto ${PORT}`);
});

module.exports = app;