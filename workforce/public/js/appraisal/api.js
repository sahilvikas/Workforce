/* Transport for the appraisal app.
 *
 * Every call is  POST /api/method/<name>  with an urlencoded body carrying a
 * single field, data=<JSON string>. The response envelope is { message: payload }
 * and every endpoint answers with either {ok:1, ...} or
 * {ok:0, reason:'<key>', message:'<sentence>'}.
 *
 * api() never rejects: transport problems are turned into the same failure
 * shape so callers only ever branch on payload.ok. Server messages are passed
 * through verbatim — never reworded here or by any caller.
 */

const GENERIC = 'Something went wrong. Please try again.';

function csrfToken() {
	const t = window.frappe && window.frappe.csrf_token;
	if (!t || t === 'None' || t === 'undefined' || t === 'null') return null;
	return t;
}

// _server_messages is a JSON string holding a list of JSON strings.
function serverMessage(text) {
	if (!text) return null;
	let body;
	try {
		body = JSON.parse(text);
	} catch (e) {
		return null;
	}
	let list = body && body._server_messages;
	if (!list) return null;
	try {
		if (typeof list === 'string') list = JSON.parse(list);
		if (!Array.isArray(list) || !list.length) return null;
		let first = list[0];
		if (typeof first === 'string') first = JSON.parse(first);
		const msg = first && (first.message || first.title);
		return msg ? String(msg).replace(/<[^>]*>/g, '').trim() : null;
	} catch (e) {
		return null;
	}
}

function fail(reason, message) {
	return { ok: 0, reason: reason, message: message || GENERIC };
}

async function once(name, payload, options) {
	const headers = {
		Accept: 'application/json',
		'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
		'Cache-Control': 'no-cache',
	};
	const token = csrfToken();
	if (token) headers['X-Frappe-CSRF-Token'] = token;

	const init = {
		method: 'POST',
		headers: headers,
		credentials: 'same-origin',
		cache: 'no-store',
		body: 'data=' + encodeURIComponent(JSON.stringify(payload || {})),
	};
	if (options && options.keepalive) init.keepalive = true;

	const res = await fetch('/api/method/' + name, init);
	const text = await res.text();

	if (!res.ok) {
		return fail('http_' + res.status, serverMessage(text) || GENERIC);
	}

	let body;
	try {
		body = JSON.parse(text);
	} catch (e) {
		return fail('bad_response', GENERIC);
	}
	const message = body && body.message;
	if (!message || typeof message !== 'object') {
		return fail('bad_response', GENERIC);
	}
	return message;
}

/**
 * api(name, payload, options) -> Promise<payload>
 *   options.retry     retry once on a network failure (reads only)
 *   options.keepalive let the request outlive the page (pagehide)
 */
export async function api(name, payload, options) {
	options = options || {};
	try {
		return await once(name, payload, options);
	} catch (e) {
		if (!options.retry) return fail('network', GENERIC);
	}
	try {
		return await once(name, payload, options);
	} catch (e) {
		return fail('network', GENERIC);
	}
}

export const SESSION_GONE = ['no_session', 'session_expired'];
