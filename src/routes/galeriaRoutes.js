const express = require('express');
const router = express.Router();
const GaleriaController = require('../controllers/GaleriaController');

// Ruta principal: Listado de obras con filtros
router.get('/', GaleriaController.mostrarGaleria);

// Ruta detalle: Ver una obra específica por su ID
router.get('/detalle/:id', GaleriaController.verFichaTecnica);

// Nota: La ruta de perfil de artista la haremos después o redirigimos por ahora
router.get('/artista/:id', (req, res) => {
    res.send("Perfil del artista en construcción (Persona 3 encargada)");
});

module.exports = router;