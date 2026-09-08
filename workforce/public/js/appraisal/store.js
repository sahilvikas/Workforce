/* Single source of truth for the appraisal app.
 *
 * Owns: the session token, the door decision (employee / manager), the loaded
 * cycle and definitions, the employee draft, the current step, and the employee
 * save queue. Components import { state, ... } and mutate the draft through
 * v-model; a deep watcher turns any change into a markDirty(), so no field can
 * be forgotten. The manager side lives in review.js and reuses the same queue.
 */

import { reactive, watch } from 'vue';
import { api, SESSION_GONE } from './api.js';
import { createSaveQueue, saveLabel as queueLabel, saveClass as queueClass } from './saveQueue.js';

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

/* The lifecycle a form moves through, in order. */
export const STATUS_ORDER = [
	'Not prepared',
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
];

export function statusIndex(status) {
	return STATUS_ORDER.indexOf(String(status || ''));
}

export function isSubmittedOrLater(status) {
	const i = statusIndex(status);
	return i >= 0 && i >= STATUS_ORDER.indexOf('Submitted');
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

export function initials(name) {
	return String(name || '')
		.split(' ')
		.filter(Boolean)
		.map(function (x) {
			return x[0];
		})
		.slice(0, 2)
		.join('')
		.toUpperCase();
}

export function firstNameOf(name) {
	return String(name || '').split(' ')[0] || '';
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

/** Copy only the keys the empty row already has, keeping their types. */
export function mergeRow(target, saved) {
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

	// boot | nolink | login | locked | error | app | print
	screen: 'boot',
	// welcome | wizard | done | readonly | closed
	empScreen: 'welcome',
	loading: false,
	loadError: '',

	// door
	door: 'unknown', // unknown | employee | team
	hasTeam: false,
	hasOwnForm: true,
	tab: 'mine', // team | mine

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
	formLoaded: false,

	step: 0,
	dir: 'slide',
	showErr: false,
	submitErrors: [],
	submitting: false,
	result: null,

	// employee save queue
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

function store(key, value) {
	try {
		if (value === undefined) return window.sessionStorage.getItem(key) || '';
		if (value) window.sessionStorage.setItem(key, value);
		else window.sessionStorage.removeItem(key);
	} catch (e) {
		/* private mode — nothing survives a reload, which is safe */
	}
	return '';
}

function sessionKey() {
	return 'wfa_s_' + state.token;
}

function tabKey() {
	return 'wfa_tab_' + state.token;
}

export function rememberTab(tab) {
	state.tab = tab;
	store(tabKey(), tab);
}

export function rememberedTab() {
	return store(tabKey());
}

/** Returns true when the payload was a dead session (and the overlay is up). */
export function sessionGone(payload) {
	if (!payload || payload.ok || SESSION_GONE.indexOf(payload.reason) < 0) return false;
	state.session = '';
	store(sessionKey(), '');
	state.loginMessage = payload.message || '';
	state.loginOverlay = true;
	return true;
}

export function auth(extra) {
	return Object.assign({ t: state.token, s: state.session }, extra || {});
}

/* ------------------------------------------------------------- save queue */

let hydrating = true;

function employeeSavable() {
	return !!(
		state.session &&
		state.hasOwnForm &&
		state.formLoaded &&
		Number(state.editable) &&
		state.empScreen !== 'done' &&
		state.empScreen !== 'readonly'
	);
}

const queue = createSaveQueue({
	state: state,
	enabled: employeeSavable,
	snapshot: function () {
		return JSON.parse(JSON.stringify(state.draft));
	},
	send: function (draft) {
		return api('wfa_save_draft', auth({ draft: draft, step: stepKey() }));
	},
	sendKeepalive: function (draft) {
		api('wfa_save_draft', auth({ draft: draft, step: stepKey() }), { keepalive: true });
	},
	onGone: sessionGone,
	onOk: function (r) {
		state.lastSavedOn = r.saved_on || state.lastSavedOn;
		state.hasDraft = true;
	},
	onStopped: function (r) {
		if (r.message) toast(r.message);
	},
});

export const markDirty = queue.markDirty;
export const flush = queue.flush;
export const settleSaves = queue.settle;
export const hasUnsaved = queue.hasUnsaved;

export function saveLabel(slice) {
	return queueLabel(slice || state);
}

export function saveClass(slice) {
	return queueClass(slice || state);
}

/* Shared page-lifecycle hooks so review.js can join in. */
const hideHooks = [];
const unsavedHooks = [];

export function onPageHide(fn) {
	hideHooks.push(fn);
}

export function onUnsavedCheck(fn) {
	unsavedHooks.push(fn);
}

/* ------------------------------------------------------------------- load */

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
	queue.reset();
	state.step = resolveStep(r.current_step);
	state.formLoaded = true;
	setTimeout(function () {
		hydrating = false;
	}, 0);
}

/** Which employee screen the loaded form lands on. */
export function employeeLanding(resume) {
	if (!state.windowOpen) return 'closed';
	if (!Number(state.editable)) {
		// The read-only copy is for a form that has actually been submitted;
		// anything else that is merely not editable is a closed window.
		return isSubmittedOrLater(state.status) ? 'readonly' : 'closed';
	}
	if (resume && (state.hasDraft || state.lastSavedOn)) return 'wizard';
	return 'welcome';
}

/** Fetch the employee form. `silent` keeps the current screen. */
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
	if (!options.silent) state.empScreen = employeeLanding(options.resume);
	return r;
}

/* ------------------------------------------------------------------ login */

export async function login(password) {
	const r = await api('wfa_login', { t: state.token, password: password });
	if (!r || !r.ok) return r || { ok: 0, message: '' };

	state.session = r.s || '';
	store(sessionKey(), state.session);
	state.hasDraft = !!r.has_draft;

	if (state.loginOverlay) {
		// Re-login after an expiry: keep every keystroke, push it, stay put.
		state.loginOverlay = false;
		state.loginMessage = '';
		flush();
		return r;
	}

	applyDoor({
		status: r.status,
		is_manager: r.is_manager,
		is_ceo: r.is_ceo,
	});
	return r;
}

export function logoutLocal() {
	state.session = '';
	store(sessionKey(), '');
}

/* ------------------------------------------------------------------- door */

/**
 * Decide which side of the app this person sees.
 *   has_own_form = status !== 'Not Applicable'
 *   has_team     = is_manager || is_ceo
 */
export function applyDoor(info) {
	const status = info.status === undefined ? state.status : info.status;
	state.hasOwnForm = String(status || '') !== 'Not Applicable';
	state.hasTeam = !!(Number(info.is_manager) || Number(info.is_ceo));
	if (info.has_own_form !== undefined) state.hasOwnForm = !!Number(info.has_own_form);
	state.door = state.hasTeam ? 'team' : 'employee';
	if (state.hasOwnForm && info.status !== undefined) state.status = info.status;
	return state.door;
}

/** Which tab a manager lands on, honouring the one they were last on. */
export function landingTab() {
	if (!state.hasOwnForm) return 'team';
	const remembered = rememberedTab();
	if (remembered === 'team' || remembered === 'mine') return remembered;
	return isSubmittedOrLater(state.status) ? 'team' : 'mine';
}

/* ------------------------------------------------------------- validation */

function filled(v) {
	return String(v || '').trim().length > 0;
}

/**
 * The same rules the server applies: everything required is required to be
 * non-empty. There are no character minimums anywhere. Messages mirror the
 * server's own wording so the two never disagree.
 */
export function stepIssues(key) {
	const d = state.draft;
	const out = [];
	if (key === 'kras') {
		d.kras.forEach(function (k, i) {
			const name = 'KRA ' + (i + 1);
			if (!filled(k.actual)) out.push(name + ': write the actual result');
			if (!k.self) out.push(name + ': pick a rating from 1 to 5');
			if (!filled(k.evidence)) out.push(name + ': add comments or evidence');
		});
	} else if (key === 'comps') {
		d.comps.forEach(function (c, i) {
			const name = c.competency || 'Competency ' + (i + 1);
			if (!c.self) out.push(name + ': pick a rating');
			if (!filled(c.evidence)) out.push(name + ': add an example or evidence');
		});
	} else if (key === 'contrib') {
		d.contribs.forEach(function (c, i) {
			if ((filled(c.contribution) || filled(c.impact)) && !c.self) {
				out.push((c.area || 'Contribution ' + (i + 1)) + ': you wrote something here — rate it too');
			}
		});
	} else if (key === 'ach') {
		if (!d.achievements.some(function (a) {
			return filled(a.what) && filled(a.impact);
		})) {
			out.push('Add at least one achievement with its impact');
		}
		d.achievements.forEach(function (a, i) {
			if (filled(a.what) && !filled(a.impact)) out.push('Achievement ' + (i + 1) + ': add the impact');
		});
	} else if (key === 'chal') {
		if (!d.challenges.some(function (c) {
			return filled(c.area) && filled(c.what);
		})) {
			out.push('Add at least one challenge');
		}
	} else if (key === 'goals') {
		if (!d.goals.some(function (g) {
			return filled(g.area) && filled(g.action);
		})) {
			out.push('Add at least one goal');
		}
	} else if (key === 'overall') {
		const missing = OVERALL_QUESTIONS.some(function (q) {
			return !filled(d.overall[q.key]);
		});
		if (missing) out.push('Answer all five overall questions');
	} else if (key === 'ahead') {
		const missing = AHEAD_QUESTIONS.some(function (q) {
			return !filled(d.ahead[q.key]);
		});
		if (missing) out.push('Answer all four looking-ahead questions');
	} else if (key === 'summary') {
		if (!d.sec.kra) out.push('Rate performance / KRAs and KPIs');
		if (!d.sec.comp) out.push('Rate behaviour and competencies');
	} else if (key === 'decl') {
		if (!nameMatches()) out.push('Type your name exactly as "' + (state.header.employee_name || '') + '"');
		if (!Number(d.decl.accepted)) out.push('Tick the declaration');
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

/** Σ(weight × rating) / Σ(weight) over the rows that carry a rating. */
export function weightedAverage(rows, defs, key) {
	const field = key || 'self';
	let sum = 0;
	let total = 0;
	rows.forEach(function (r, i) {
		const w = Number((defs[i] && defs[i].weightage) || 0);
		if (r[field] && w) {
			sum += r[field] * w;
			total += w;
		}
	});
	return total ? sum / total : 0;
}

/** Contributions carry no comparable weight, so they average plainly. */
export function plainAverage(rows, key) {
	const field = key || 'self';
	const rated = rows.filter(function (r) {
		return !!r[field];
	});
	if (!rated.length) return 0;
	return (
		rated.reduce(function (a, r) {
			return a + Number(r[field]);
		}, 0) / rated.length
	);
}

/** Combine the three section averages by the cycle's weights. */
export function combineSections(kra, comp, add, weights) {
	const w = weights || {};
	let sum = 0;
	let total = 0;
	if (kra) {
		sum += kra * Number(w.kra || 0);
		total += Number(w.kra || 0);
	}
	if (comp) {
		sum += comp * Number(w.competency || 0);
		total += Number(w.competency || 0);
	}
	if (add) {
		sum += add * Number(w.additional || 0);
		total += Number(w.additional || 0);
	}
	return total ? sum / total : 0;
}

function cycleWeights() {
	const c = state.cycle || {};
	return { kra: c.kra_weight, competency: c.competency_weight, additional: c.additional_weight };
}

export function sectionAverages() {
	const d = state.draft;
	return {
		kra: weightedAverage(d.kras, state.definitions.kras),
		comp: weightedAverage(d.comps, state.definitions.comps),
		add: plainAverage(d.contribs),
	};
}

export function selfScore() {
	const a = sectionAverages();
	return combineSections(a.kra, a.comp, a.add, cycleWeights());
}

export function sectionScore() {
	const s = state.draft.sec;
	return combineSections(Number(s.kra || 0), Number(s.comp || 0), Number(s.add || 0), cycleWeights());
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
	const r = await api('wfa_submit', auth({ draft: JSON.parse(JSON.stringify(state.draft)) }));
	state.submitting = false;

	if (sessionGone(r)) return r;
	if (r && r.ok) {
		state.result = r;
		state.status = r.status || 'Submitted';
		state.submittedOn = r.submitted_on || '';
		state.editable = 0;
		queue.reset();
		state.empScreen = 'done';
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
	state.session = store(sessionKey());

	// Any change to any field, anywhere in the draft, queues a save.
	watch(
		function () {
			return state.draft;
		},
		function () {
			if (hydrating || !employeeSavable()) return;
			markDirty();
		},
		{ deep: true }
	);

	setInterval(function () {
		state.now = Date.now();
	}, 5000);

	function onHide() {
		queue.flushKeepalive();
		hideHooks.forEach(function (fn) {
			fn();
		});
	}

	document.addEventListener('visibilitychange', function () {
		if (document.visibilityState === 'hidden') onHide();
	});
	window.addEventListener('pagehide', onHide);
	window.addEventListener('beforeunload', function (e) {
		const dirty =
			hasUnsaved() ||
			unsavedHooks.some(function (fn) {
				return fn();
			});
		if (!dirty) return;
		e.preventDefault();
		e.returnValue = '';
	});
}
