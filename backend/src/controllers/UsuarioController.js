const UsuarioModel = require('../models/UsuarioModel');
const InfoCompradorModel = require('../models/InfoCompradorModel');
const bcrypt = require('bcryptjs');

const UsuarioController = {

    // 1. Ver Perfil
    obtenerPerfil: async (req, res) => {
        try {
            const idUsuario = req.session.usuario.id;
            
            const perfil = await UsuarioModel.obtenerPerfilCompleto(idUsuario);
            
            if (!perfil) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            res.status(200).json({ success: true, data: { usuario: perfil } });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al cargar el perfil.' });
        }
    },

    // 2. Actualizar Perfil
    actualizarPerfil: async (req, res) => {
        const idUsuario = req.session.usuario.id;
        const rolUsuario = req.session.usuario.rol; 
        const { nombre, apellido, gmail, login, oldPassword, password, pais, estado_residencia, ciudad, municipio, calle } = req.body;

        try {
            const usuarioDB = await UsuarioModel.obtenerPerfilCompleto(idUsuario);
            
            if (!usuarioDB) {
                return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
            }

            const datosUsuario = { nombre, apellido, gmail, login };

            // Lógica de cambio de contraseña
            if (password && password.trim() !== '') {
                if (!oldPassword || oldPassword.trim() === '') {
                    return res.status(400).json({ success: false, message: 'Debes introducir tu contraseña actual para poder crear una nueva.' });
                }

                const coinciden = await bcrypt.compare(oldPassword, usuarioDB.password);

                if (!coinciden) {
                    return res.status(401).json({ success: false, message: 'La contraseña actual no es correcta.' });
                }
                
                datosUsuario.password = await bcrypt.hash(password, 10);
            }

            // Actualizar en DB
            await UsuarioModel.actualizarDatosBasicos(idUsuario, datosUsuario);

            // Si NO es Admin (1) ni SuperAdmin (3), actualizamos su dirección de comprador
            if (rolUsuario !== 1 && rolUsuario !== 3) {
                const datosDireccion = { pais, estado_residencia, ciudad, municipio, calle };
                await InfoCompradorModel.actualizarDireccion(idUsuario, datosDireccion);
            }

            // Actualizar sesión actual
            req.session.usuario.nombre = nombre;
            req.session.usuario.login = login;

            // Obtener datos frescos para devolver al frontend
            const perfilActualizado = await UsuarioModel.obtenerPerfilCompleto(idUsuario);

            res.status(200).json({ 
                success: true,
                message: '¡Perfil actualizado correctamente!', 
                data: { usuario: perfilActualizado } 
            });

        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: 'Error al actualizar. Posiblemente el correo o usuario ya existen.' });
        }
    }
};

module.exports = UsuarioController;