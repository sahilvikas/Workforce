/* Single source of truth for the employee appraisal app.
 *
 * Owns: the session token, the loaded cycle/definitions, the draft, the current
 * step, and the one and only save queue. Components import { state, ... } and
 * mutate the draft through v-model; a deep watcher turns any change into a
 * markDirty(), so no field can be forgotten.
 */

import { reactive, watch } from 'vue';
import { api, SESSION_GONE } from './api.js';

/* ------------------------------------------------------------------ steps */

export const STEPS = [
	{ key: 'details', label: 'Your details' },
	{ key: 'kras', label: 'KRAs and KPIs' },
	{ key: 'comps', label: 'Competencies' },
	{ key: 'contrib', label: 'Additional contribution' },
	{ key: 'ach', label: 'Achievements' },
	{ key: 'chal', label: 'Challenges' },
	{ key: 'goals', label: 'Development goals' },
	{ key: 'overall', label: 'Overall self-assessment' },
	{ key: 'sugg', label: 'Organisational development', optional: true },
	{ key: 'ahead', label: 'Looking ahead' },
	{ key: 'summary', label: 'Rating summary' },
	{ key: 'decl', label: 'Declaration' },
];

export const RATING_WORDS = {
	1: 'Unsatisfactory',
	2: 'Needs improvement',
	3: 'Meets expectations',
	4: 'Exceeds expectations',
	5: 'Exceptional',
};

export function ratingWord(n) {
	return RATING_WORDS[n] || '';
}

export const OVERALL_QUESTIONS = [
	{ key: 'contributions', q: 'What are your three most significant contributions during the appraisal period?' },
	{ key: 'handled_well', q: 'What responsibilities or areas do you believe you handled particularly well?' },
	{ key: 'improve', q: 'What would you like to improve in the next appraisal cycle?' },
	{ key: 'additional_resp', q: 'What additional responsibilities would you like to take up?' },
	{ key: 'support', q: 'What support, resources or training would help you perform better?' },
];

export const AHEAD_QUESTIONS = [
	{ key: 'outcomes', q: 'Top three outcomes you want to achieve in the next cycle' },
	{ key: 'responsibility', q: 'Additional responsibility or leadership opportunity you would like to take up' },
	{ key: 'support', q: 'Skills, resources or organisational support that would enable greater impact' },
	{ key: 'value', q: 'If given additional responsibility, what measurable value can you create?' },
];

export const SUGGESTION_CARDS = [
	{ key: 'gap', title: 'Organisational gap', q1: 'What gap or improvement opportunity have you observed?', q2: 'What solution do you suggest?', q3: 'What positive impact can it create?' },
	{ key: 'inefficiency', title: 'Process inefficiency', q1: 'What inefficiency, delay or recurring issue have you observed?', q2: 'What practical improvement would you recommend?', q3: 'How does it improve efficiency, quality or turnaround?' },
	{ key: 'people', title: 'Team / cross-functional', q1: 'What employee, team or cross-functional challenge have you observed?', q2: 'What solution could address it?', q3: 'What benefit would it bring?' },
	{ key: 'waste', title: 'Cost, errors, wastage', q1: 'What opportunity exists to reduce cost, errors or wastage?', q2: 'What change would you propose?', q3: 'What measurable benefit could result?' },
	{ key: 'automation', title: 'Simplify / automate', q1: 'What area could be simplified, standardised or automated?', q2: 'What approach would you recommend?', q3: 'What improvement would you expect?' },
	{ key: 'one_change', title: 'One change', q1: 'What one change would make the organisation or your function more effective?', q2: 'What action would you recommend?', q3: 'What outcome do you expect?' },
];

/* ------------------------------------------------------------------ dates */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(value) {
	if (!value) return null;
	if (value instanceof Date) return value;
	const m = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
	if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
	const d = new Date(value);
	return isNaN(d.getTime()) ? null : d;
}

/** d MMM yyyy — the only date format the app shows. */
export function fmtDate(value) {
	const d = parseDate(value);
	if (!d) return '';
	return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
}

export function fmtTime(value) {
	if (!value) return '';
	const d = new Date(String(value).replace(' ', 'T'));
	if (isNaN(d.getTime())) return '';
	return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function fmtRange(from, to) {
	const a = fmtDate(from);
	const b = fmtDate(to);
	if (a && b) return a + ' – ' + b;
	return a || b || '';
}

export function todayLong() {
	return fmtDate(new Date());
}

/* ------------------------------------------------------------------ draft */

export function emptyDraft(definitions) {
	const defs = definitions || {};
	const kras = defs.kras || [];
	const comps = defs.comps || [];
	const contribs = defs.contribs || [];
	const overall = {};
	OVERALL_QUESTIONS.forEach(function (q) {
		overall[q.key] = '';
	});
	const ahead = {};
	AHEAD_QUESTIONS.forEach(function (q) {
		ahead[q.key] = '';
	});
	return {
		kras: kras.map(function () {
			return { actual: '', self: 0, evidence: '' };
		}),
		comps: comps.map(function (c) {
			return { competency: c.competency || '', self: 0, evidence: '' };
		}),
		contribs: contribs.map(function (c) {
			return { area: c.area || '', contribution: '', impact: '', self: 0 };
		}),
		achievements: [0, 1, 2, 3].map(function () {
			return { what: '', impact: '' };
		}),
		challenges: [0, 1, 2].map(function () {
			return { area: '', what: '', action: '', support: '' };
		}),
		goals: [0, 1, 2].map(function () {
			return { area: '', action: '', outcome: '' };
		}),
		overall: overall,
		suggestions: SUGGESTION_CARDS.map(function (s) {
			return { key: s.key, observation: '', solution: '', impact: '' };
		}),
		ahead: ahead,
		sec: { kra: 0, comp: 0, add: 0, comment: '' },
		decl: { name: '', accepted: 0 },
	};
}

function mergeRow(target, saved) {
	if (!saved || typeof saved !== 'object') return target;
	Object.keys(target).forEach(function (k) {
		const v = saved[k];
		if (v === undefined || v === null) return;
		if (typeof target[k] === 'number') {
			const n = Number(v);
			target[k] = isNaN(n) ? target[k] : n;
		} else {
			target[k] = typeof v === 'string' ? v : String(v);
		}
	});
	return target;
}

/**
 * Deep-merge a saved draft over a freshly built empty one. Rows beyond the
 * current definitions are dropped, so a draft saved before HR edited the KRAs
 * still opens.
 */
export function mergeDraft(base, saved) {
	if (!saved || typeof saved !== 'object') return base;
	['kras', 'comps', 'contribs', 'achievements', 'challenges', 'goals'].forEach(function (list) {
		const rows = saved[list];
		if (!Array.isArray(rows)) return;
		base[list].forEach(function (row, i) {
			mergeRow(row, rows[i]);
		});
	});
	if (Array.isArray(saved.suggestions)) {
		base.suggestions.forEach(function (row) {
			const found = saved.suggestions.filter(function (s) {
				return s && s.key === row.key;
			})[0];
			mergeRow(row, found);
		});
	}
	mergeRow(base.overall, saved.overall);
	mergeRow(base.ahead, saved.ahead);
	mergeRow(base.sec, saved.sec);
	mergeRow(base.decl, saved.decl);
	return base;
}

/* ------------------------------------------------------------------ state */

export const state = reactive({
	token: '',
	session: '',

	// boot | nolink | login | locked | closed | welcome | wizard | done | readonly | print | error
	screen: 'boot',
	loading: false,
	loadError: '',

	header: {},
	cycle: {},
	definitions: { kras: [], comps: [], contribs: [] },
	draft: emptyDraft(null),

	status: '',
	editable: 1,
	windowOpen: 1,
	windowNote: '',
	reopenCount: 0,
	reopenReason: '',
	lastSavedOn: '',
	submittedOn: '',
	hasDraft: false,

	step: 0,
	dir: 'slide',
	showErr: false,
	submitErrors: [],
	submitting: false,
	result: null,

	// save queue
	seq: 0,
	savedSeq: 0,
	saveState: 'idle', // idle | saving | saved | retrying | stopped
	saveMessage: '',
	savedAt: 0,

	loginOverlay: false,
	loginMessage: '',

	toasts: [],
	now: Date.now(),
});

export function stepKey() {
	return STEPS[state.step] ? STEPS[state.step].key : 'details';
}

function resolveStep(value) {
	if (value === undefined || value === null || value === '') return 0;
	if (typeof value === 'number') return Math.max(0, Math.min(STEPS.length - 1, value));
	const i = STEPS.map(function (s) {
		return s.key;
	}).indexOf(String(value));
	if (i >= 0) return i;
	const n = Number(value);
	return isNaN(n) ? 0 : Math.max(0, Math.min(STEPS.length - 1, n));
}

/* ----------------------------------------------------------------- toasts */

let toastId = 0;
export function toast(message, action, sticky) {
	const id = ++toastId;
	state.toasts.push({ id: id, message: message, action: action || null });
	while (state.toasts.length > 3) state.toasts.shift();
	if (!sticky) {
		setTimeout(function () {
			dismissToast(id);
		}, 2600);
	}
	return id;
}

export function dismissToast(id) {
	const i = state.toasts.findIndex(function (t) {
		return t.id === id;
	});
	if (i >= 0) state.toasts.splice(i, 1);
}

/* ---------------------------------------------------------------- session */

function sessionKey() {
	return 'wfa_s_' + state.token;
}

function readSession() {
	try {
		return window.sessionStorage.getItem(sessionKey()) || '';
	} catch (e) {
		return '';
	}
}

function writeSession(s) {
	try {
		if (s) window.sessionStorage.setItem(sessionKey(), s);
		else window.sessionStorage.removeItem(sessionKey());
	} catch (e) {
		/* private mode — the session simply does not survive a reload */
	}
}

/** Returns true when the payload was a dead session (and the overlay is up). */
function sessionGone(payload) {
	if (!payload || payload.ok || SESSION_GONE.indexOf(payload.reason) < 0) return false;
	state.session = '';
	writeSession('');
	state.loginMessage = payload.message || '';
	state.loginOverlay = true;
	return true;
}

function auth(extra) {
	return Object.assign({ t: state.token, s: state.session }, extra || {});
}

/* ------------------------------------------------------------- save queue */

let debounceT = null;
let retryT = null;
let inFlight = null; // Promise while a save is on the wire

export function hasUnsaved() {
	return state.savedSeq !== state.seq;
}

export function markDirty() {
	state.seq++;
	if (state.saveState !== 'retrying' && state.saveState !== 'stopped') {
		state.saveState = 'saving';
	}
	if (debounceT) clearTimeout(debounceT);
	debounceT = setTimeout(function () {
		debounceT = null;
		flush();
	}, 1200);
}

function snapshot() {
	return JSON.parse(JSON.stringify(state.draft));
}

function scheduleRetry() {
	if (retryT) return;
	retryT = setTimeout(function () {
		retryT = null;
		flush();
	}, 10000);
}

/** Send the latest snapshot. One request at a time; coalesces while in flight. */
export function flush() {
	if (debounceT) {
		clearTimeout(debounceT);
		debounceT = null;
	}
	if (inFlight) return inFlight;
	if (state.saveState === 'stopped') return Promise.resolve();
	if (!state.session || !hasUnsaved()) return Promise.resolve();
	if (state.screen === 'done' || state.screen === 'readonly') return Promise.resolve();

	const snapSeq = state.seq;
	const body = auth({ draft: snapshot(), step: stepKey() });
	state.saveState = state.saveState === 'retrying' ? 'retrying' : 'saving';

	inFlight = api('wfa_save_draft', body)
		.then(function (r) {
			inFlight = null;
			if (sessionGone(r)) return;
			if (r && r.ok) {
				state.savedSeq = Math.max(state.savedSeq, snapSeq);
				state.lastSavedOn = r.saved_on || state.lastSavedOn;
				state.savedAt = Date.now();
				state.now = Date.now();
				state.hasDraft = true;
				if (state.seq > state.savedSeq) {
					flush();
				} else {
					state.saveState = 'saved';
				}
				return;
			}
			// A real refusal from the server — stop trying and say why, verbatim.
			if (r && ['locked', 'window_closed', 'too_big'].indexOf(r.reason) >= 0) {
				state.saveState = 'stopped';
				state.saveMessage = r.message || '';
				if (r.message) toast(r.message);
				return;
			}
			state.saveState = 'retrying';
			scheduleRetry();
		})
		.catch(function () {
			inFlight = null;
			state.saveState = 'retrying';
			scheduleRetry();
		});

	return inFlight;
}

/** Fire-and-forget save that survives the tab closing. */
function flushKeepalive() {
	if (!state.session || !hasUnsaved() || state.saveState === 'stopped') return;
	if (state.screen === 'done' || state.screen === 'readonly') return;
	api('wfa_save_draft', auth({ draft: snapshot(), step: stepKey() }), { keepalive: true });
}

/** Wait for any save already on the wire, then push whatever is still dirty. */
export async function settleSaves() {
	if (inFlight) await inFlight;
	if (hasUnsaved()) await flush();
	if (inFlight) await inFlight;
}

/* ------------------------------------------------------------------- load */

let hydrating = true;

function applyForm(r) {
	state.status = r.status || '';
	state.editable = Number(r.editable || 0);
	state.windowOpen = Number(r.window_open === undefined ? 1 : r.window_open);
	state.windowNote = r.window_note || '';
	state.reopenCount = Number(r.reopen_count || 0);
	state.reopenReason = r.reopen_reason || '';
	state.lastSavedOn = r.last_saved_on || '';
	state.submittedOn = r.submitted_on || '';
	state.header = r.header || {};
	state.cycle = r.cycle || {};
	state.definitions = {
		kras: (r.definitions && r.definitions.kras) || [],
		comps: (r.definitions && r.definitions.comps) || [],
		contribs: (r.definitions && r.definitions.contribs) || [],
	};

	const saved = r.draft && typeof r.draft === 'object' ? r.draft : {};
	state.hasDraft = Object.keys(saved).length > 0;

	hydrating = true;
	state.draft = mergeDraft(emptyDraft(state.definitions), saved);
	state.seq = 0;
	state.savedSeq = 0;
	state.savedAt = Date.now();
	state.saveState = 'saved';
	state.saveMessage = '';
	state.step = resolveStep(r.current_step);
	setTimeout(function () {
		hydrating = false;
	}, 0);
}

/** Fetch the form. `silent` keeps the current screen (used after re-login). */
export async function loadForm(options) {
	options = options || {};
	if (!options.silent) {
		state.loading = true;
		state.loadError = '';
	}
	const r = await api('wfa_get_form', auth(), { retry: true });
	state.loading = false;

	if (sessionGone(r)) return r;
	if (!r || !r.ok) {
		state.loadError = (r && r.message) || '';
		if (!options.silent) state.screen = 'error';
		return r;
	}

	applyForm(r);

	if (!options.silent) {
		if (!state.windowOpen) state.screen = 'closed';
		else if (!state.editable) state.screen = 'readonly';
		else if (options.resume && (state.hasDraft || state.lastSavedOn)) state.screen = 'wizard';
		else state.screen = 'welcome';
	}
	return r;
}

/* ------------------------------------------------------------------ login */

export async function login(password) {
	const r = await api('wfa_login', { t: state.token, password: password });
	if (!r || !r.ok) return r || { ok: 0, message: '' };

	state.session = r.s || '';
	writeSession(state.session);
	state.hasDraft = !!r.has_draft;

	if (state.loginOverlay) {
		// Re-login after an expiry: keep every keystroke, push it, stay put.
		state.loginOverlay = false;
		state.loginMessage = '';
		state.saveState = hasUnsaved() ? 'saving' : state.saveState;
		flush();
		return r;
	}

	await loadForm({ resume: !!r.has_draft });
	return r;
}

export function logoutLocal() {
	state.session = '';
	writeSession('');
}

/* ------------------------------------------------------------- validation */

function len(v) {
	return String(v || '').trim().length;
}

/**
 * The same rules the server applies. Returns [] when the step is complete.
 * Messages are ours (client-side pre-checks); anything the server sends back
 * is rendered verbatim instead.
 */
export function stepIssues(key) {
	const d = state.draft;
	const out = [];
	if (key === 'kras') {
		d.kras.forEach(function (k, i) {
			const name = 'KRA ' + (i + 1);
			if (len(k.actual) < 20) out.push(name + ': describe the actual result (at least 20 characters).');
			if (!k.self) out.push(name + ': pick a rating from 1 to 5.');
			if (len(k.evidence) < 30) out.push(name + ': add comments or evidence (at least 30 characters).');
		});
	} else if (key === 'comps') {
		d.comps.forEach(function (c, i) {
			const name = c.competency || 'Competency ' + (i + 1);
			if (!c.self) out.push(name + ': pick a rating.');
			if (len(c.evidence) < 20) out.push(name + ': add examples or evidence (at least 20 characters).');
		});
	} else if (key === 'contrib') {
		d.contribs.forEach(function (c, i) {
			if ((len(c.contribution) || len(c.impact)) && !c.self) {
				out.push((c.area || 'Contribution ' + (i + 1)) + ': you wrote something here — rate it too.');
			}
		});
	} else if (key === 'ach') {
		if (!d.achievements.some(function (a) {
			return len(a.what) && len(a.impact);
		})) {
			out.push('Add at least one achievement with its impact.');
		}
		d.achievements.forEach(function (a, i) {
			if (len(a.what) && !len(a.impact)) out.push('Achievement ' + (i + 1) + ': add the impact.');
		});
	} else if (key === 'chal') {
		if (!d.challenges.some(function (c) {
			return len(c.area) && len(c.what);
		})) {
			out.push('Add at least one challenge.');
		}
	} else if (key === 'goals') {
		if (!d.goals.some(function (g) {
			return len(g.area) && len(g.action);
		})) {
			out.push('Add at least one goal.');
		}
	} else if (key === 'overall') {
		OVERALL_QUESTIONS.forEach(function (q, i) {
			if (len(d.overall[q.key]) < 20) out.push('Question ' + (i + 1) + ' needs at least 20 characters.');
		});
	} else if (key === 'ahead') {
		AHEAD_QUESTIONS.forEach(function (q, i) {
			if (len(d.ahead[q.key]) < 10) out.push('Question ' + (i + 1) + ' needs at least 10 characters.');
		});
	} else if (key === 'summary') {
		if (!d.sec.kra) out.push('Rate performance / KRAs and KPIs.');
		if (!d.sec.comp) out.push('Rate behaviour and competencies.');
	} else if (key === 'decl') {
		if (!nameMatches()) out.push('Type your name exactly as "' + (state.header.employee_name || '') + '".');
		if (!Number(d.decl.accepted)) out.push('Tick the declaration.');
	}
	return out;
}

export function stepValid(key) {
	return stepIssues(key).length === 0;
}

export function stepComplete(index) {
	const s = STEPS[index];
	if (!s) return false;
	if (s.optional) return index < state.step;
	return stepValid(s.key);
}

export function nameMatches() {
	const typed = String(state.draft.decl.name || '').trim().toLowerCase();
	const real = String(state.header.employee_name || '').trim().toLowerCase();
	return !!real && typed === real;
}

export function allValid() {
	return STEPS.every(function (s) {
		return s.optional || s.key === 'decl' || stepValid(s.key);
	});
}

export function incompleteLabels() {
	return STEPS.filter(function (s) {
		return !s.optional && s.key !== 'decl' && !stepValid(s.key);
	}).map(function (s) {
		return s.label;
	});
}

/* ----------------------------------------------------------------- scores */

function weighted(rows, defs) {
	let sum = 0;
	let total = 0;
	rows.forEach(function (r, i) {
		const w = Number((defs[i] && defs[i].weightage) || 0);
		if (r.self && w) {
			sum += r.self * w;
			total += w;
		}
	});
	return total ? sum / total : 0;
}

export function sectionAverages() {
	const d = state.draft;
	const rated = d.contribs.filter(function (c) {
		return !!c.self;
	});
	return {
		kra: weighted(d.kras, state.definitions.kras),
		comp: weighted(d.comps, state.definitions.comps),
		add: rated.length
			? rated.reduce(function (a, c) {
					return a + Number(c.self);
			  }, 0) / rated.length
			: 0,
	};
}

function combine(kra, comp, add) {
	const c = state.cycle || {};
	let sum = 0;
	let total = 0;
	if (kra) {
		sum += kra * Number(c.kra_weight || 0);
		total += Number(c.kra_weight || 0);
	}
	if (comp) {
		sum += comp * Number(c.competency_weight || 0);
		total += Number(c.competency_weight || 0);
	}
	if (add) {
		sum += add * Number(c.additional_weight || 0);
		total += Number(c.additional_weight || 0);
	}
	return total ? sum / total : 0;
}

export function selfScore() {
	const a = sectionAverages();
	return combine(a.kra, a.comp, a.add);
}

export function sectionScore() {
	const s = state.draft.sec;
	return combine(Number(s.kra || 0), Number(s.comp || 0), Number(s.add || 0));
}

export function ratedCount() {
	return (
		state.draft.kras.filter(function (k) {
			return !!k.self;
		}).length +
		state.draft.comps.filter(function (c) {
			return !!c.self;
		}).length
	);
}

export function rateableCount() {
	return state.definitions.kras.length + state.definitions.comps.length;
}

/** Fill the section ratings from the averages, but never overwrite a choice. */
export function prefillSectionRatings() {
	const a = sectionAverages();
	const s = state.draft.sec;
	if (!s.kra && a.kra) s.kra = Math.round(a.kra);
	if (!s.comp && a.comp) s.comp = Math.round(a.comp);
	if (!s.add && a.add) s.add = Math.round(a.add);
}

/* ------------------------------------------------------------- navigation */

export function goToStep(index, options) {
	options = options || {};
	const next = Math.max(0, Math.min(STEPS.length - 1, index));
	if (next === state.step) return;
	state.dir = next > state.step ? 'slide' : 'slideback';
	state.showErr = false;
	state.step = next;
	if (stepKey() === 'summary') prefillSectionRatings();
	if (!options.noSave) flush();
}

/* ----------------------------------------------------------------- submit */

export async function submit() {
	state.submitting = true;
	state.submitErrors = [];
	await settleSaves();
	const r = await api('wfa_submit', auth({ draft: snapshot() }));
	state.submitting = false;

	if (sessionGone(r)) return r;
	if (r && r.ok) {
		state.result = r;
		state.status = r.status || 'Submitted';
		state.submittedOn = r.submitted_on || '';
		state.editable = 0;
		state.savedSeq = state.seq;
		state.saveState = 'saved';
		state.screen = 'done';
		return r;
	}
	if (r && r.reason === 'incomplete' && Array.isArray(r.errors) && r.errors.length) {
		state.submitErrors = r.errors;
		const first = resolveStep(r.errors[0].step);
		state.showErr = true;
		goToStep(first);
		return r;
	}
	if (r && r.message) toast(r.message);
	return r;
}

/* ------------------------------------------------------- lifecycle wiring */

let installed = false;

export function install() {
	if (installed) return;
	installed = true;

	const params = new URLSearchParams(window.location.search);
	state.token = params.get('t') || '';
	if (!state.token) {
		state.screen = 'nolink';
		return;
	}
	state.session = readSession();

	// Any change to any field, anywhere in the draft, queues a save.
	watch(
		function () {
			return state.draft;
		},
		function () {
			if (hydrating) return;
			if (!state.session || state.screen === 'done' || state.screen === 'readonly') return;
			markDirty();
		},
		{ deep: true }
	);

	setInterval(function () {
		state.now = Date.now();
	}, 5000);

	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden') flushKeepalive();
	});
	window.addEventListener('pagehide', flushKeepalive);
	window.addEventListener('beforeunload', function (e) {
		if (!hasUnsaved()) return;
		e.preventDefault();
		e.returnValue = '';
	});
}

export function saveLabel() {
	if (state.saveState === 'stopped') return state.saveMessage || 'Not saved';
	if (state.saveState === 'retrying') return 'Couldn’t save — retrying';
	if (state.saveState === 'saving') return 'Saving…';
	if (!state.savedAt) return '';
	const s = Math.round((state.now - state.savedAt) / 1000);
	const ago = s < 5 ? 'just now' : s < 60 ? s + 's ago' : Math.round(s / 60) + ' min ago';
	return 'Saved · ' + ago;
}
