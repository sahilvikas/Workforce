/* State for the HR console.
 *
 * One reactive object, one `call()` that every endpoint goes through, and the
 * dashboard numbers derived from the roster rather than fetched. The roster is
 * the expensive call: it feeds Dashboard, People, Send and Monitor, so it is
 * held here and refreshed after every mutation.
 *
 * Shared with the appraisal app rather than copied: api.js (the transport),
 * ui/*, and store.js's statuses, chip tones and date formatting.
 */

import { reactive } from 'vue';
import { api } from '../appraisal/api.js';
import { statusIndex, statusTone, fmtDate, initials } from '../appraisal/store.js';

export { statusTone, fmtDate, initials };

/* ---------------------------------------------------------------- statuses */

export const HR_STATUSES = [
	'Draft',
	'Ready',
	'Sent',
	'In Progress',
	'Submitted',
	'Manager Review',
	'Manager Submitted',
	'Calibrated',
	'Final Approved',
	'Discussed',
	'Closed',
	'Not Applicable',
];

/** The matrix columns, in order. */
export const SHORT_STATUSES = [
	'Not sent',
	'Sent',
	'In Progress',
	'Submitted',
	'Manager Review',
	'Manager Submitted',
	'Calibrated+',
];

export const STAGE_HINTS = {
	Sent: 'Link and password emailed',
	'In Progress': 'Employee has opened and saved',
	Submitted: 'Locked for the employee; HR checks completeness',
	'Manager Review': 'With the reporting manager',
	'Manager Submitted': 'Ratings and feedback in; HR calibrates',
	Calibrated: 'HR final rating recorded',
	'Final Approved': 'Leadership sign-off recorded',
	Discussed: 'Manager has met the employee',
	Closed: 'Filed',
};

export const STAGE_RAIL = ['Sent', 'In Progress', 'Submitted', 'Manager Review', 'Manager Submitted', 'Calibrated', 'Final Approved', 'Discussed', 'Closed'];

/* The server owns these lists and returns the rows in its own order; a template
   editor renders whatever came back. These are the seed for a brand new
   template only — never a length or an order to validate against. */
export const NEW_TEMPLATE_COMPETENCIES = [
	'Teamwork',
	'Communication',
	'Ownership',
	'Problem-solving',
	'Discipline',
	'Adaptability',
];
export const NEW_TEMPLATE_CONTRIB_AREAS = [
	'Process Improvement',
	'Additional Responsibility',
	'Cost Saving',
	'Cross-Team Support',
	'Initiatives Beyond Regular KRAs',
];

export const CYCLE_WINDOWS = [
	{ key: 'self', label: 'Self-appraisal' },
	{ key: 'hr_review', label: 'HR review' },
	{ key: 'manager', label: 'Manager review' },
	{ key: 'calibration', label: 'Calibration' },
	{ key: 'final_approval', label: 'Final approval' },
	{ key: 'discussion', label: 'Discussions & corrections' },
];

export const VIEWS = [
	{ key: 'dash', label: 'Dashboard' },
	{ key: 'cycle', label: 'Cycle' },
	{ key: 'tpl', label: 'KRA templates', counter: 'templates' },
	{ key: 'people', label: 'People', counter: 'people' },
	{ key: 'send', label: 'Send', counter: 'sendable' },
	{ key: 'mon', label: 'Monitor' },
	{ key: 'exp', label: 'Export' },
];

/* -------------------------------------------------------------------- dates */

/**
 * The appraisal app never Date-parses server strings. This page needs day
 * grouping and day differences, so it parses the date half only — never the
 * time — and treats it as a calendar date in the viewer's timezone.
 */
export function dayOf(value) {
	const m = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (!m) return null;
	return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export function today() {
	const n = new Date();
	return new Date(n.getFullYear(), n.getMonth(), n.getDate());
}

/** Whole calendar days from a to b; positive when b is later. */
export function daysBetween(a, b) {
	const from = a instanceof Date ? a : dayOf(a);
	const to = b instanceof Date ? b : dayOf(b);
	if (!from || !to) return null;
	return Math.round((to - from) / 86400000);
}

export function isoDay(d) {
	const p = function (n) {
		return (n < 10 ? '0' : '') + n;
	};
	return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** d MMM yyyy, HH:mm — for timestamps. Falls back to the date alone. */
export function fmtDateTime(value) {
	const s = String(value || '');
	const d = dayOf(s);
	if (!d) return '';
	const t = s.match(/\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})/);
	const date = d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
	return t ? date + ', ' + t[1] + ':' + t[2] : date;
}

/** d MMM, HH:mm — the compact form the activity list uses. */
export function fmtShort(value) {
	const s = String(value || '');
	const d = dayOf(s);
	if (!d) return '';
	const t = s.match(/\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})/);
	const date = d.getDate() + ' ' + MONTHS[d.getMonth()];
	return t ? date + ', ' + t[1] + ':' + t[2] : date;
}

/* -------------------------------------------------------------------- state */

function stored(key, value) {
	try {
		if (value === undefined) return window.sessionStorage.getItem(key) || '';
		if (value) window.sessionStorage.setItem(key, value);
		else window.sessionStorage.removeItem(key);
	} catch (e) {
		/* private mode: the choice just does not survive a reload */
	}
	return '';
}

export const hr = reactive({
	ctx: { user: '', full_name: '', has_access: 0 },
	// ok | denied | expired
	door: 'ok',

	view: 'dash',
	booted: false,

	cycles: [],
	cycleName: '',
	cycle: null,
	cycleLoading: false,
	cycleError: '',

	people: [],
	departments: [],
	rosterLoading: false,
	rosterError: '',

	templates: [],
	template: null,
	templateLoading: false,
	templateError: '',
	kraWeight: 0,
	competencyWeight: 0,

	// filters, shared by People and Monitor
	q: '',
	fDept: '',
	fStatus: '',
	fMgr: '',

	// send
	sel: [],
	sendDept: '',
	sending: false,
	sendResults: null,

	// drawer
	drawer: null, // { name, loading, error, data }
	drawerRead: false,

	modal: null, // { kind, … }

	exporting: '',
	toasts: [],
	busy: '',
});

/* ------------------------------------------------------------------- toasts */

let toastId = 0;
export function toast(message, action, sticky) {
	const id = ++toastId;
	hr.toasts.push({ id: id, message: message, action: action || null });
	while (hr.toasts.length > 3) hr.toasts.shift();
	if (!sticky) {
		setTimeout(function () {
			dismissToast(id);
		}, 2600);
	}
	return id;
}

export function dismissToast(id) {
	const i = hr.toasts.findIndex(function (t) {
		return t.id === id;
	});
	if (i >= 0) hr.toasts.splice(i, 1);
}

/* ---------------------------------------------------------------- transport */

/**
 * Every HR endpoint goes through here so the two door failures are handled in
 * one place: a role that was revoked mid-session, and a session that died.
 */
export async function call(name, payload, options) {
	const r = await api('wfa_hr_' + name, payload || {}, options);
	if (r && !r.ok) {
		if (r.reason === 'not_allowed') hr.door = 'denied';
		else if (r.reason === 'http_401' || r.reason === 'http_403') hr.door = 'expired';
	}
	return r;
}

const READ = { retry: true };

/* -------------------------------------------------------------------- loads */

export async function loadCycles(cycleName) {
	hr.cycleLoading = true;
	hr.cycleError = '';
	const r = await call('get_cycles', cycleName ? { cycle: cycleName } : {}, READ);
	hr.cycleLoading = false;
	if (!r || !r.ok) {
		hr.cycleError = (r && r.message) || '';
		return r;
	}
	hr.cycles = r.cycles || [];
	hr.cycle = r.cycle || null;
	hr.cycleName = (r.cycle && r.cycle.name) || '';
	if (hr.cycleName) stored('wfa_hr_cycle', hr.cycleName);
	return r;
}

export async function loadRoster() {
	if (!hr.cycleName) return null;
	hr.rosterLoading = true;
	hr.rosterError = '';
	const r = await call('get_roster', { cycle: hr.cycleName }, READ);
	hr.rosterLoading = false;
	if (!r || !r.ok) {
		hr.rosterError = (r && r.message) || '';
		return r;
	}
	hr.people = r.people || [];
	hr.departments = r.departments || [];
	return r;
}

export async function loadTemplates(templateName) {
	hr.templateLoading = true;
	hr.templateError = '';
	const payload = { cycle: hr.cycleName };
	if (templateName) payload.template = templateName;
	const r = await call('get_templates', payload, READ);
	hr.templateLoading = false;
	if (!r || !r.ok) {
		hr.templateError = (r && r.message) || '';
		return r;
	}
	hr.templates = r.templates || [];
	if (templateName) hr.template = r.template || null;
	hr.kraWeight = Number(r.kra_weight || 0);
	hr.competencyWeight = Number(r.competency_weight || 0);
	return r;
}

/** Everything the console needs for one cycle. */
export async function loadAll(cycleName) {
	const c = await loadCycles(cycleName);
	if (!c || !c.ok) return c;
	await Promise.all([loadRoster(), loadTemplates()]);
	return c;
}

export async function refreshRoster() {
	return loadRoster();
}

export async function selectCycle(name) {
	if (!name || name === hr.cycleName) return;
	hr.sel = [];
	hr.sendResults = null;
	hr.template = null;
	await loadAll(name);
}

export function setView(view) {
	hr.view = view;
	stored('wfa_hr_view', view);
}

export function boot(ctx) {
	hr.ctx = ctx || { user: '', full_name: '', has_access: 0 };
	if (!Number(hr.ctx.has_access)) {
		hr.door = 'denied';
		hr.booted = true;
		return Promise.resolve();
	}
	const view = stored('wfa_hr_view');
	if (VIEWS.some(function (v) {
		return v.key === view;
	})) {
		hr.view = view;
	}
	const cycle = stored('wfa_hr_cycle');
	return loadAll(cycle || undefined).then(function () {
		hr.booted = true;
	});
}

/* ------------------------------------------------------------------- scope */

/**
 * The CEO / manager-only row is in the roster but is not being appraised: it is
 * excluded from every count, the matrix and the exports.
 */
export function inScope(p) {
	return !Number(p.is_ceo) && p.appraisal_status !== 'Not Applicable';
}

export function scopePeople() {
	return hr.people.filter(inScope);
}

/** A person with no appraisal yet reads as "Not sent". */
export function statusOf(p) {
	return p.appraisal_status || 'Not sent';
}

export function notYetSent(p) {
	const s = statusOf(p);
	return s === 'Not sent' || s === 'Draft' || s === 'Ready';
}

export function countBy(status) {
	return scopePeople().filter(function (p) {
		return statusOf(p) === status;
	}).length;
}

export function countAtLeast(status) {
	const floor = statusIndex(status);
	return scopePeople().filter(function (p) {
		const i = statusIndex(statusOf(p));
		return i >= 0 && i >= floor;
	}).length;
}

/* --------------------------------------------------------------- dashboard */

export function daysLeft() {
	if (!hr.cycle || !hr.cycle.self_end) return null;
	return daysBetween(today(), dayOf(hr.cycle.self_end));
}

export function submissionRate() {
	const scope = scopePeople();
	if (!scope.length) return 0;
	return Math.round((countAtLeast('Submitted') / scope.length) * 100);
}

/** Submitted or with the manager for more than three days. */
export function overdueManager() {
	const now = today();
	return scopePeople().filter(function (p) {
		const s = statusOf(p);
		if (s !== 'Submitted' && s !== 'Manager Review') return false;
		const d = daysBetween(dayOf(p.submitted_on), now);
		return d !== null && d > 3;
	});
}

/** Invited but never opened the link. */
export function neverOpened() {
	return scopePeople().filter(function (p) {
		return statusOf(p) === 'Sent' && !p.first_opened_on;
	});
}

export function notSubmitted() {
	return scopePeople().filter(function (p) {
		const s = statusOf(p);
		return s === 'Sent' || s === 'In Progress';
	});
}

export function daysWaiting(p) {
	const d = daysBetween(dayOf(p.submitted_on), today());
	return d === null ? 0 : d;
}

/** Which matrix column a person sits in. */
export function matrixColumn(p) {
	const s = statusOf(p);
	if (s === 'Not sent' || s === 'Draft' || s === 'Ready') return 'Not sent';
	if (statusIndex(s) >= statusIndex('Calibrated')) return 'Calibrated+';
	return s;
}

export function cellPeople(dept, column) {
	return scopePeople().filter(function (p) {
		return p.department === dept && matrixColumn(p) === column;
	});
}

export function heat(n) {
	return n === 0 ? 'h0' : n === 1 ? 'h1' : n === 2 ? 'h2' : n <= 3 ? 'h3' : 'h4';
}

/** Submissions per calendar day for the last `days` days, oldest first. */
export function submissionsPerDay(days) {
	const span = days || 14;
	const end = today();
	const out = [];
	for (let i = span - 1; i >= 0; i--) {
		const d = new Date(end.getFullYear(), end.getMonth(), end.getDate() - i);
		out.push({ day: d, iso: isoDay(d), n: 0 });
	}
	const index = {};
	out.forEach(function (b) {
		index[b.iso] = b;
	});
	scopePeople().forEach(function (p) {
		const iso = String(p.submitted_on || '').slice(0, 10);
		if (index[iso]) index[iso].n++;
	});
	return out;
}

/* ------------------------------------------------------------------ people */

export function managers() {
	const seen = {};
	hr.people.forEach(function (p) {
		if (Number(p.is_manager) || Number(p.is_ceo)) seen[p.name] = p.employee_name;
	});
	return Object.keys(seen).map(function (name) {
		return { name: name, label: seen[name] };
	});
}

export function managerNameOf(p) {
	return p.manager_name || '';
}

export function roleOf(p) {
	if (Number(p.is_ceo)) return 'CEO';
	if (Number(p.is_manager)) return 'Manager';
	return 'Employee';
}

/** Search + department + status + manager, shared by People and Monitor. */
export function filteredPeople(options) {
	const opts = options || {};
	const q = String(hr.q || '').toLowerCase();
	return hr.people.filter(function (p) {
		if (opts.scopeOnly && !inScope(p)) return false;
		if (q) {
			const hay = (p.employee_name + ' ' + p.employee_id + ' ' + (p.email || '')).toLowerCase();
			if (hay.indexOf(q) < 0) return false;
		}
		if (hr.fDept && p.department !== hr.fDept) return false;
		if (hr.fStatus && statusOf(p) !== hr.fStatus) return false;
		if (hr.fMgr && p.reporting_manager !== hr.fMgr) return false;
		return true;
	});
}

/**
 * Who can still be invited. Besides people with a form to fill in, this covers
 * the token holders who only ever review: a manager or the CEO gets a
 * Not Applicable record and a reviews-only link, so they stay sendable until
 * that link has actually gone out.
 */
export function isSendable(p) {
	const s = statusOf(p);
	if (s === 'Not Applicable') return !p.sent_on;
	return s === 'Not sent' || s === 'Draft' || s === 'Ready';
}

/** Only people who fill in a form of their own need a template. */
export function needsTemplate(p) {
	return !Number(p.is_manager) && !Number(p.is_ceo);
}

/** A reviews-only row is a manager or CEO with no template of their own. */
export function reviewsOnly(p) {
	return !needsTemplate(p) && !p.template;
}

export function sendablePeople() {
	return hr.people.filter(function (p) {
		if (hr.sendDept && p.department !== hr.sendDept) return false;
		return isSendable(p);
	});
}

export function sendableCount() {
	return hr.people.filter(isSendable).length;
}

export function navCount(counter) {
	if (counter === 'templates') return hr.templates.length;
	if (counter === 'people') return hr.people.length;
	if (counter === 'sendable') return sendableCount();
	return undefined;
}

export function personByName(name) {
	return hr.people.filter(function (p) {
		return p.name === name;
	})[0];
}

/* ------------------------------------------------------------------ writes */

export async function saveCycle(name, values) {
	const payload = { values: values };
	if (name) payload.name = name;
	const r = await call('save_cycle', payload);
	if (r && r.ok) await loadCycles(r.name);
	return r;
}

export async function saveTemplate(name, values) {
	const payload = { values: values };
	if (name) payload.name = name;
	const r = await call('save_template', payload);
	if (r && r.ok) await loadTemplates(r.name);
	return r;
}

export async function saveEmployee(employeeId, values) {
	const r = await call('save_employee', { employee_id: employeeId, values: values });
	if (r && r.ok) await loadRoster();
	return r;
}

export async function importRoster(rows, dry) {
	return call('import_roster', { rows: rows, dry: dry ? 1 : 0 });
}

export async function prepare(employees, template, forceTemplate) {
	const payload = { cycle: hr.cycleName, employees: employees };
	if (template) payload.template = template;
	if (forceTemplate) payload.force_template = 1;
	return call('prepare', payload);
}

export async function send(appraisals) {
	return call('send', { appraisals: appraisals });
}

export async function resend(appraisal) {
	const r = await call('resend', { appraisal: appraisal });
	if (r && r.ok) await loadRoster();
	return r;
}

export async function unlock(appraisal) {
	const r = await call('unlock', { appraisal: appraisal });
	if (r && r.ok) await loadRoster();
	return r;
}

export async function advance(appraisal, to, extra) {
	const payload = Object.assign({ appraisal: appraisal, to: to }, extra || {});
	const r = await call('advance', payload);
	if (r && r.ok) await loadRoster();
	return r;
}

export async function reopen(appraisal, reason, target) {
	const r = await call('reopen', { appraisal: appraisal, reason: reason, target: target });
	if (r && r.ok) await loadRoster();
	return r;
}

export async function remind(who, payload) {
	return call('remind', Object.assign({ who: who }, payload || {}));
}

export async function saveDefinitions(name, tables) {
	const r = await call('save_definitions', Object.assign({ name: name }, tables));
	if (r && r.ok) await loadRoster();
	return r;
}

/** What wfa_hr_send would mail this person: renders, writes nothing, sends nothing. */
export async function previewMail(employee) {
	return call('preview', { employee: employee, cycle: hr.cycleName }, READ);
}

export async function exportRows(shape) {
	return call('export', { cycle: hr.cycleName, shape: shape }, READ);
}

/* ------------------------------------------------------------------ drawer */

export async function openDrawer(appraisalName) {
	hr.drawer = { name: appraisalName, loading: true, error: '', data: null };
	hr.drawerRead = false;
	const r = await call('get_appraisal', { name: appraisalName }, READ);
	if (!hr.drawer || hr.drawer.name !== appraisalName) return r;
	hr.drawer.loading = false;
	if (!r || !r.ok) {
		hr.drawer.error = (r && r.message) || '';
		return r;
	}
	hr.drawer.data = r.appraisal || null;
	return r;
}

export async function refreshDrawer() {
	if (!hr.drawer) return null;
	const name = hr.drawer.name;
	const r = await call('get_appraisal', { name: name }, READ);
	if (hr.drawer && hr.drawer.name === name && r && r.ok) hr.drawer.data = r.appraisal;
	return r;
}

export function closeDrawer() {
	hr.drawer = null;
	hr.drawerRead = false;
}

/** Every drawer action ends the same way: refresh the row and the roster. */
export async function afterAction(r, fallbackMessage) {
	if (r && r.ok) {
		await refreshDrawer();
		toast((r.message || fallbackMessage || 'Done').toString());
		return true;
	}
	if (r && r.message) toast(r.message);
	return false;
}
