const db = require('../config/db');

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
		if (!/^\d+$/.test(codigoRaw)) {
			return res.render('confirmar-reserva', {
				message: 'Su código de seguridad es incorrecto por favor reintente',
				success: false
			}, (err, html) => {
				if (err) { console.error('Render error:', err.message); return res.status(500).send('Error al renderizar.'); }
				res.send(html);
			});
		}

		console.log('Iniciando consulta DB para codigo:', codigoRaw);
		try {
			const results = await queryWithTimeout('SELECT * FROM info_comprador WHERE codigoSeguridad = ?', [codigoRaw], 5000);

			// Normalizar: si el driver devuelve [rows, fields], tomar rows en índice 0
			let rows = results;
			if (Array.isArray(results) && Array.isArray(results[0])) {
				rows = results[0];
			}

			console.log('Resultado consulta DB (filas encontradas):', rows && rows.length ? `${rows.length} filas` : '0 filas');

			if (rows && rows.length > 0) {
				return res.render('confirmar-reserva', {
					message: 'Su código de seguridad ha sido validado',
					success: true,
					info: rows
				}, (err, html) => {
					if (err) { console.error('Render error:', err.message); return res.status(500).send('Error al renderizar.'); }
					res.send(html);
				});
			}

			return res.render('confirmar-reserva', {
				message: 'Su código de seguridad es incorrecto por favor reintente',
				success: false
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
};