const multer = require('multer');

// Configuración de almacenamiento en memoria RAM (MemoryStorage)
// Evita escribir archivos temporales en el disco local y los procesa como Buffers en la memoria.
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // Ampliación del límite máximo a 10MB para evitar el error 'File too large'
});

// Exportamos el middleware ya configurado para un solo archivo (campo: "foto")
module.exports = upload.single('foto');