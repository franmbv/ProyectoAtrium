const db = require('../config/db');
const obraModel = require('./obra');

module.exports = function(app) {
	// helper: ejecutar query con timeout para detectar queries colgadas ***NECESARIA***
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
		// Si la query termina, cancelamos el timeout
		return Promise.race([q.finally(() => clearTimeout(timeoutId)), timeout]);
	}

	// Ruta de comprobación rápida de BD (más detallada que /db-check)
	app.get('/db-status', async (req, res) => {
		try {
			const conn = await db.getConnection();
			conn.release();
			return res.send('DB connection OK');
		} catch (err) {
			console.error('DB status error:', err);
			return res.status(500).send('DB status error: ' + err.message);
		}
	});

	// GET: mostrar formulario
	app.get('/confirmar-reserva', (req, res) => {
		console.log('GET /confirmar-reserva recibido');
		res.render('confirmar-reserva', { message: null, success: null }, (err, html) => {
			if (err) {
				console.error('Error al renderizar confirmar-reserva:', err.message);
				return res.status(500).send('Vista confirmar-reserva no encontrada o error al renderizar.');
			}
			res.send(html);
		});
	});

	// POST: validar código usando queryWithTimeout para evitar bloqueos
	app.post('/confirmar-reserva', async (req, res) => {
		console.log('POST /confirmar-reserva recibido, body:', req.body);
		const codigoRaw = (req.body && req.body.codigoSeguridad) ? String(req.body.codigoSeguridad).trim() : '';
		const obraNombreRaw = (req.body && req.body.obraNombre) ? String(req.body.obraNombre).trim() : '';
		if (!/^\d+$/.test(codigoRaw)) {
			return res.render('confirmar-reserva', {
				message: 'Su código de seguridad es incorrecto por favor reintente',
				success: false
			}, (err, html) => {
				if (err) { console.error('Render error:', err.message); return res.status(500).send('Error al renderizar.'); }
				res.send(html);
			});
		}

		console.log('Iniciando consulta DB (estado) para codigo:', codigoRaw);
		try {
			const results = await queryWithTimeout('SELECT estado FROM info_comprador WHERE codigoSeguridad = ? LIMIT 1', [codigoRaw], 5000);

			// Normalizar: si el driver devuelve [rows, fields], tomar rows en índice 0
			let rows = results;
			if (Array.isArray(results) && Array.isArray(results[0])) {
				rows = results[0];
			}

			if (!rows || rows.length === 0) {
				return res.render('confirmar-reserva', {
					message: 'Su código de seguridad es incorrecto por favor reintente',
					success: false
				}, (err, html) => {
					if (err) { console.error('Render error:', err.message); return res.status(500).send('Error al renderizar.'); }
					res.send(html);
				});
			}

			const estadoRaw = rows[0].estado ? String(rows[0].estado).trim() : '';
			if (estadoRaw.toLowerCase() === 'activo') {
				// Usuario activo: buscar la obra y reservarla si está disponible
				const obraRow = await obraModel.findByNombre(obraNombreRaw);
				if (!obraRow) {
					return res.render('confirmar-reserva', {
						message: `Obra "${obraNombreRaw}" no encontrada`,
						success: false
					}, (err, html) => {
						if (err) { console.error('Render error:', err.message); return res.status(500).send('Error al renderizar.'); }
						res.send(html);
					});
				}

				if (!obraRow.estatus || String(obraRow.estatus).toLowerCase() !== 'disponible') {
					return res.render('confirmar-reserva', {
						message: `Obra "${obraNombreRaw}" ya a sido vendida o reservada`,
						success: false,
						info: rows
					}, (err, html) => {
						if (err) { console.error('Render error:', err.message); return res.status(500).send('Error al renderizar.'); }
						res.send(html);
					});
				}

				// Intentar reservar (operación atómica)
				const reservado = await obraModel.reservarById(obraRow.id);
				if (reservado) {
					return res.render('confirmar-reserva', {
						message: `Su código ha sido validado y la obra "${obraNombreRaw}" ha sido reservada`,
						success: true,
						info: rows
					}, (err, html) => {
						if (err) { console.error('Render error:', err.message); return res.status(500).send('Error al renderizar.'); }
						res.send(html);
					});
				}
			}

			// Estado no activo
			return res.render('confirmar-reserva', {
				message: 'Licencia Vencida',
				success: false,
				info: rows
			}, (err, html) => {
				if (err) { console.error('Render error:', err.message); return res.status(500).send('Error al renderizar.'); }
				res.send(html);
			});
		} catch (err) {
			console.error('Error al consultar codigoSeguridad:', err);
			const msg = err.code === 'DB_TIMEOUT'
				? 'Tiempo de respuesta de la base de datos agotado. Intente de nuevo.'
				: 'Ocurrió un error en el servidor. Por favor intente más tarde.';
			return res.render('confirmar-reserva', {
				message: msg,
				success: false
			}, (renderErr, html) => {
				if (renderErr) { console.error('Render error:', renderErr.message); return res.status(500).send('Error al renderizar.'); }
				res.send(html);
			});
		}
	});

	app.post('/info-comprador', async (req, res) => {
		console.log('POST /info-comprador recibido, body:', req.body);
		const codigoRaw = (req.body && req.body.codigoSeguridad) ? String(req.body.codigoSeguridad).trim() : '';

		// Validación básica: debe ser numérico (igual que en confirmar-reserva)
		if (!/^\d+$/.test(codigoRaw)) {
			console.warn('Código de seguridad inválido:', codigoRaw);
			return res.status(400).json({ message: 'Código de seguridad inválido' });
		}

		try {
			const results = await queryWithTimeout(
				'SELECT estado FROM info_comprador WHERE codigoSeguridad = ? LIMIT 1',
				[codigoRaw],
				5000
			);

			// Normalizar: si el driver devuelve [rows, fields], tomar rows en índice 0
			let rows = results;
			if (Array.isArray(results) && Array.isArray(results[0])) {
				rows = results[0];
			}

			if (!rows || rows.length === 0) {
				console.info('Comprador no encontrado para codigo:', codigoRaw);
				return res.status(404).json({ message: 'Comprador no encontrado' });
			}

			const estadoRaw = rows[0].estado ? String(rows[0].estado).trim() : '';
			if (estadoRaw.toLowerCase() === 'activo') {
				console.log(`Estado Activo para codigo ${codigoRaw}`);
				return res.status(200).json({ success: true, message: 'Código validado', estado: 'Activo' });
			}

			console.log(`Estado no activo para codigo ${codigoRaw}:`, estadoRaw);
			return res.status(200).json({ success: false, message: 'licencia vencida', estado: estadoRaw || 'Inactivo' });
		} catch (err) {
			console.error('Error al consultar estado de membresía:', err);
			if (err && err.code === 'DB_TIMEOUT') {
				return res.status(503).json({ message: 'Tiempo de respuesta de la base de datos agotado. Intente de nuevo.' });
			}
			return res.status(500).json({ message: 'Ocurrió un error en el servidor. Por favor intente más tarde.' });
		}
	});
};