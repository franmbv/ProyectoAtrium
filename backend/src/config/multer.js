const multer = require('multer');
const path = require('path');

// Configuramos dónde se guardan los archivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Carpeta de destino
    },
    filename: (req, file, cb) => {
        // Le ponemos un nombre único: fecha + nombre original
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });
// Exportamos el middleware ya configurado para un solo archivo (campo: "foto")
module.exports = upload.single('foto');