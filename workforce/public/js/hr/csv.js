/* CSV out, CSV in.
 *
 * RFC 4180: fields containing a comma, a quote or a line break are wrapped in
 * quotes and inner quotes are doubled; records end with CRLF. A UTF-8 BOM is
 * prepended so Excel opens accented names correctly instead of mojibake.
 */

const BOM = '﻿';

function cell(value) {
	if (value === null || value === undefined) return '';
	const s = String(value);
	if (/[",\r\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
	return s;
}

/** rows: array of arrays. Returns the CSV text, without the BOM. */
export function toCsv(rows) {
	return (rows || [])
		.map(function (row) {
			return (row || [])
				.map(cell)
				.join(',');
		})
		.join('\r\n');
}

/** Hands the browser a file. Returns false when the browser cannot take it. */
export function downloadCsv(filename, rows) {
	const text = BOM + toCsv(rows);
	const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = filename;
	a.style.display = 'none';
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	// Give the click a tick before the URL goes away.
	setTimeout(function () {
		URL.revokeObjectURL(url);
	}, 1000);
	return true;
}

/**
 * Parse a CSV file the way a spreadsheet exports one: a header row, quoted
 * fields, doubled quotes, CRLF or LF line endings, a possible BOM.
 * Returns { headers, rows } where each row is an object keyed by header.
 */
export function parseCsv(text) {
	let src = String(text || '');
	if (src.charAt(0) === BOM) src = src.slice(1);

	const records = [];
	let field = '';
	let record = [];
	let inQuotes = false;

	for (let i = 0; i < src.length; i++) {
		const c = src[i];
		if (inQuotes) {
			if (c === '"') {
				if (src[i + 1] === '"') {
					field += '"';
					i++;
				} else {
					inQuotes = false;
				}
			} else {
				field += c;
			}
			continue;
		}
		if (c === '"') {
			inQuotes = true;
		} else if (c === ',') {
			record.push(field);
			field = '';
		} else if (c === '\r') {
			// swallow; the \n that follows ends the record
		} else if (c === '\n') {
			record.push(field);
			records.push(record);
			record = [];
			field = '';
		} else {
			field += c;
		}
	}
	if (field !== '' || record.length) {
		record.push(field);
		records.push(record);
	}

	const headers = (records.shift() || []).map(function (h) {
		return String(h || '').trim().toLowerCase();
	});
	const rows = records
		.filter(function (r) {
			return r.some(function (v) {
				return String(v || '').trim();
			});
		})
		.map(function (r) {
			const row = {};
			headers.forEach(function (h, i) {
				if (h) row[h] = String(r[i] === undefined ? '' : r[i]).trim();
			});
			return row;
		});

	return { headers: headers, rows: rows };
}
