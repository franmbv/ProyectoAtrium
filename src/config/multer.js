const multer = require('multer');

// Guardamos el archivo temporalmente en la memoria RAM (Buffer)
// Esto evita usar el disco efímero de Render y nos permite enviar los bytes directos a Supabase
const storage = multer.memoryStorage();

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        // Validamos que sea una imagen para evitar archivos maliciosos
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('El archivo debe ser una imagen válida (jpg, png, jpeg, webp)'), false);
        }
    }
});

// Exportamos el middleware configurado para procesar un solo archivo del campo "foto"
module.exports = upload.single('foto');