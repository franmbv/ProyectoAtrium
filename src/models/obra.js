const db = require('../config/db');

function queryWithTimeout(sql, params = [], timeoutMs = 5000) {
	const q = db.query(sql, params); // Promise
	let timeoutId;
	const timeout = new Promise((_, reject) => {
		timeoutId = setTimeout(() => {
			const err = new Error('DB query timeout');
			err.code = 'DB_TIMEOUT';
			reject(err);
		}, timeoutMs);
	});
	return Promise.race([q.finally(() => clearTimeout(timeoutId)), timeout]);
}

async function findByNombre(nombre) {
	// Búsqueda insensible a mayúsculas
	const results = await queryWithTimeout(
		'SELECT * FROM obra WHERE LOWER(nombre) = LOWER(?) LIMIT 1',
		[nombre],
		5000
	);
	let rows = results;
	if (Array.isArray(results) && Array.isArray(results[0])) rows = results[0];
	return (rows && rows.length) ? rows[0] : null;
}

async function reservarById(id) {
	// Reserva atómica: solo cambia si estaba 'Disponible'
	const results = await queryWithTimeout(
		"UPDATE obra SET estatus = 'Reservada' WHERE id = ? AND estatus = 'Disponible'",
		[id],
		5000
	);
	// Normalizar driver result (mysql2: result[0] may be rows, or result is OkPacket)
	const res = Array.isArray(results) && results[0] && typeof results[0].affectedRows !== 'undefined'
		? results[0]
		: results;
	return (res && (res.affectedRows || res.affected_rows || res.affected_rows === 0) && (res.affectedRows > 0 || res.affected_rows > 0));
}

// Registrar rutas relacionadas con obra (check)
function init(app) {
	app.post('/obra/check', async (req, res) => {
		const obraNombreRaw = (req.body && req.body.obraNombre) ? String(req.body.obraNombre).trim() : '';
		// Validación: letras, espacios, números, paréntesis y otros caracteres comunes
		if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ0-9().,\- ]+$/.test(obraNombreRaw)) {
			return res.status(400).json({ found: false, message: 'Nombre de obra inválido' });
		}
		try {
			const obraRow = await findByNombre(obraNombreRaw);
			if (!obraRow) {
				return res.status(404).json({ found: false, message: `Obra "${obraNombreRaw}" no encontrada` });
			}
			return res.status(200).json({ found: true, estatus: obraRow.estatus || null });
		} catch (err) {
			console.error('Error en /obra/check:', err);
			if (err && err.code === 'DB_TIMEOUT') {
				return res.status(503).json({ found: false, message: 'Tiempo de respuesta de la base de datos agotado. Intente de nuevo.' });
			}
			return res.status(500).json({ found: false, message: 'Ocurrió un error al verificar la obra. Intente más tarde.' });
		}
	});

	// Nuevo: comprar una obra verificando codigoSeguridad del comprador
	app.post('/obra/comprar', async (req, res) => {
		// Verificar sesión del usuario
		if (!req.session || !req.session.usuario || !req.session.usuario.id) {
			req.session.message = { type: 'error', text: 'Debe iniciar sesión para comprar una obra' };
			return res.redirect('/auth/login');
		}

		const usuarioId = req.session.usuario.id;
		const obraNombreRaw = (req.body && req.body.obraNombre) ? String(req.body.obraNombre).trim() : '';
		const codigoRaw = (req.body && req.body.codigoSeguridad) ? String(req.body.codigoSeguridad).trim() : '';

		// Validaciones básicas
		if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñüÜ0-9().,\- ]+$/.test(obraNombreRaw)) {
			req.session.message = { type: 'error', text: 'Nombre de obra inválido' };
			return res.redirect('/galeria/');
		}
		if (!/^\d+$/.test(codigoRaw)) {
			req.session.message = { type: 'error', text: 'Código de seguridad inválido' };
			return res.redirect('/galeria/');
		}

		try {
			// Buscar obra
			const obraRow = await findByNombre(obraNombreRaw);
			if (!obraRow) {
				req.session.message = { type: 'error', text: `Obra "${obraNombreRaw}" no encontrada` };
				return res.redirect('/galeria/');
			}
			if (!obraRow.estatus || String(obraRow.estatus).toLowerCase() !== 'disponible') {
				req.session.message = { type: 'error', text: `Obra "${obraNombreRaw}" ya ha sido vendida o reservada` };
				return res.redirect('/galeria/');
			}

			// Verificar comprador / codigo - Solo para el usuario logueado
			const results = await queryWithTimeout(
				'SELECT estado FROM info_comprador WHERE comprador_id = ? AND codigoSeguridad = ? LIMIT 1',
				[usuarioId, codigoRaw],
				5000
			);
			let rows = results;
			if (Array.isArray(results) && Array.isArray(results[0])) rows = results[0];

			if (!rows || rows.length === 0) {
				req.session.message = { type: 'error', text: 'Código de seguridad incorrecto' };
				return res.redirect('/galeria/');
			}
			const estadoRaw = rows[0].estado ? String(rows[0].estado).trim() : '';
			if (estadoRaw.toLowerCase() !== 'activo') {
				req.session.message = { type: 'error', text: 'Licencia Vencida' };
				return res.redirect('/galeria/');
			}

			// Intentar reservar (atómico)
			const reservado = await reservarById(obraRow.id);
			if (reservado) {
				req.session.message = { type: 'success', text: `La obra "${obraNombreRaw}" ha sido reservada con éxito y está a la espera de la aprobación de un administrador` };
				return res.redirect('/galeria/');
			}

			// Si no afectó filas, probablemente ya fue cambiada por concurrencia
			req.session.message = { type: 'error', text: `Obra "${obraNombreRaw}" ya ha sido vendida o reservada` };
			return res.redirect('/galeria/');
		} catch (err) {
			console.error('Error en /obra/comprar:', err);
			if (err && err.code === 'DB_TIMEOUT') {
				req.session.message = { type: 'error', text: 'Tiempo de respuesta de la base de datos agotado. Intente de nuevo.' };
			} else {
				req.session.message = { type: 'error', text: 'Ocurrió un error al procesar la compra. Intente más tarde.' };
			}
			return res.redirect('/galeria/');
		}
	});
}

module.exports = { init, findByNombre, reservarById };
