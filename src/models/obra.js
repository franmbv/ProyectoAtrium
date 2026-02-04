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

module.exports = { findByNombre, reservarById };
