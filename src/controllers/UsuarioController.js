const UsuarioModel = require('../models/UsuarioModel');
const InfoCompradorModel = require('../models/InfoCompradorModel');
const bcrypt = require('bcryptjs');

const UsuarioController = {

    // 1. Ver Perfil (Renderizar la vista con los datos del usuario)
    verPerfil: async (req, res) => {
        try {
            const idUsuario = req.session.usuario.id;
            
            const perfil = await UsuarioModel.obtenerPerfilCompleto(idUsuario);
            
            if (!perfil) {
                return res.redirect('/auth/login');
            }

            res.render('usuarios/perfil', { usuario: perfil, mensaje: null, error: null });
        } catch (error) {
            console.error(error);
            res.render('usuarios/perfil', { usuario: {}, mensaje: null, error: 'Error al cargar perfil.' });
        }
    },

    // 2. Actualizar Perfil (Recibir datos del formulario, actualizar en la DB y recargar la vista)
    actualizar: async (req, res) => {
        const idUsuario = req.session.usuario.id;
        const rolUsuario = req.session.usuario.rol; 
        const { nombre, apellido, gmail, login, oldPassword, password, pais, estado_residencia, ciudad, municipio, calle } = req.body;

        try {
            const usuarioDB = await UsuarioModel.obtenerPerfilCompleto(idUsuario);
            const datosUsuario = { nombre, apellido, gmail, login };

            if (password && password.trim() !== '') {
                if (!oldPassword || oldPassword.trim() === '') {
                    return res.render('usuarios/perfil', { 
                        usuario: usuarioDB, 
                        mensaje: null, 
                        error: 'Debes introducir tu contraseña actual para poder crear una nueva.' 
                    });
                }

                const coinciden = await bcrypt.compare(oldPassword, usuarioDB.password);

                if (!coinciden) {
                    return res.render('usuarios/perfil', { 
                        usuario: usuarioDB, 
                        mensaje: null, 
                        error: 'La contraseña actual no es correcta.' 
                    });
                }
                datosUsuario.password = await bcrypt.hash(password, 10);
            }

            await UsuarioModel.actualizarDatosBasicos(idUsuario, datosUsuario);

            if (rolUsuario !== 1 && rolUsuario !== 3) {
                const datosDireccion = { pais, estado_residencia, ciudad, municipio, calle };
                await InfoCompradorModel.actualizarDireccion(idUsuario, datosDireccion);
            }

            req.session.usuario.nombre = nombre;
            req.session.usuario.login = login;

            const perfilActualizado = await UsuarioModel.obtenerPerfilCompleto(idUsuario);

            res.render('usuarios/perfil', { 
                usuario: perfilActualizado, 
                mensaje: '¡Perfil actualizado correctamente!', 
                error: null 
            });

        } catch (error) {
            console.error(error);
            const perfilAntiguo = await UsuarioModel.obtenerPerfilCompleto(idUsuario);
            res.render('usuarios/perfil', { 
                usuario: perfilAntiguo, 
                mensaje: null, 
                error: 'Error al actualizar. Posiblemente el correo o usuario ya existen.' 
            });
        }
    }
};

module.exports = UsuarioController;