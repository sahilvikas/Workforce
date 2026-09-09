/* The manager side: the team list and one open review.
 *
 * Mirrors store.js in shape — an empty review is built from what the employee
 * submitted, the saved review is deep-merged over it, and the same save queue
 * drives autosave. It imports from store.js (token, session, toasts, helpers)
 * and store.js never imports this, so the dependency runs one way only.
 */

import { reactive, watch } from 'vue';
import { api } from './api.js';
import {
	state,
	auth,
	sessionGone,
	toast,
	onPageHide,
	onUnsavedCheck,
	weightedAverage,
	plainAverage,
	combineSections,
	mergeRow,
} from './store.js';
import { createSaveQueue } from './saveQueue.js';

/* ------------------------------------------------------------------ state */

export const review = reactive({
	// team list
	teamLoading: false,
	teamLoaded: false,
	teamError: '',
	managerName: '',
	isCeo: false,
	hasOwnForm: true,
	windowOpen: 1,
	windowNote: '',
	managerStart: '',
	managerEnd: '',
	cycle: '',
	team: [],

	// the open review
	open: null, // the team row
	appraisal: '',
	loading: false,
	loadError: '',
	status: '',
	editable: 1,
	panelNote: '',
	submittedOn: '',
	managerSubmittedOn: '',
	header: {},
	weights: {},
	self: {},
	draft: emptyReview(null),
	loaded: false,

	// save queue
	seq: 0,
	savedSeq: 0,
	saveState: 'idle',
	saveMessage: '',
	savedAt: 0,
	now: Date.now(),

	submitting: false,
	submitErrors: [],
	everythingOpen: false,
});

/* ----------------------------------------------------------------- review */

export function emptyReview(self) {
	const s = self || {};
	return {
		kras: (s.kras || []).map(function () {
			return { rating: 0, comment: '' };
		}),
		comps: (s.comps || []).map(function (c) {
			return { competency: c.competency || '', rating: 0, comment: '' };
		}),
		contribs: (s.contribs || []).map(function (c) {
			return { area: c.area || '', rating: 0, comment: '' };
		}),
		overall_rating: 0,
		key_feedback: '',
		development_recs: '',
	};
}

export function mergeReview(base, saved) {
	if (!saved || typeof saved !== 'object') return base;
	['kras', 'comps', 'contribs'].forEach(function (list) {
		const rows = saved[list];
		if (!Array.isArray(rows)) return;
		base[list].forEach(function (row, i) {
			mergeRow(row, rows[i]);
		});
	});
	if (saved.overall_rating !== undefined && saved.overall_rating !== null) {
		const n = Number(saved.overall_rating);
		if (!isNaN(n)) base.overall_rating = n;
	}
	if (typeof saved.key_feedback === 'string') base.key_feedback = saved.key_feedback;
	if (typeof saved.development_recs === 'string') base.development_recs = saved.development_recs;
	return base;
}

/* ------------------------------------------------------------- save queue */

let hydrating = true;

function savable() {
	return !!(state.session && review.appraisal && review.loaded && Number(review.editable));
}

const queue = createSaveQueue({
	state: review,
	enabled: savable,
	snapshot: function () {
		return JSON.parse(JSON.stringify(review.draft));
	},
	send: function (draft) {
		return api('wfa_save_review', auth({ appraisal: review.appraisal, review: draft }));
	},
	sendKeepalive: function (draft) {
		api('wfa_save_review', auth({ appraisal: review.appraisal, review: draft }), { keepalive: true });
	},
	onGone: sessionGone,
	onOk: function (r) {
		if (r.status) review.status = r.status;
	},
	onStopped: function (r) {
		if (r.message) toast(r.message);
	},
});

export const markReviewDirty = queue.markDirty;
export const flushReview = queue.flush;
export const settleReview = queue.settle;
export const reviewHasUnsaved = queue.hasUnsaved;

onPageHide(queue.flushKeepalive);
onUnsavedCheck(queue.hasUnsaved);

// Any change anywhere in the review queues a save, the same way the employee
// draft does — no per-field wiring to forget.
watch(
	function () {
		return review.draft;
	},
	function () {
		if (hydrating || !savable()) return;
		markReviewDirty();
	},
	{ deep: true }
);

/* ------------------------------------------------------------------- team */

export async function loadTeam(options) {
	options = options || {};
	if (!options.silent) {
		review.teamLoading = true;
		review.teamError = '';
	}
	const r = await api('wfa_team_list', auth(), { retry: true });
	review.teamLoading = false;

	if (sessionGone(r)) return r;
	if (!r || !r.ok) {
		review.teamError = (r && r.message) || '';
		return r;
	}

	review.managerName = r.manager_name || '';
	review.isCeo = !!Number(r.is_ceo);
	review.hasOwnForm = !!Number(r.has_own_form);
	review.windowOpen = Number(r.window_open === undefined ? 1 : r.window_open);
	review.windowNote = r.window_note || '';
	review.managerStart = r.manager_start || '';
	review.managerEnd = r.manager_end || '';
	review.cycle = r.cycle || '';
	review.team = Array.isArray(r.team) ? r.team : [];
	review.teamLoaded = true;
	return r;
}

export function reviewableCount() {
	return review.team.filter(function (t) {
		return Number(t.reviewable);
	}).length;
}

export function submittedCount() {
	return review.team.filter(function (t) {
		return Number(t.reviewable) || Number(t.review_done);
	}).length;
}

/** Reviewable first, then the ones already done, then everyone else. */
export function groupedTeam() {
	const rank = function (t) {
		if (Number(t.reviewable)) return 0;
		if (Number(t.review_done)) return 1;
		return 2;
	};
	return review.team
		.map(function (t, i) {
			return { t: t, i: i };
		})
		.sort(function (a, b) {
			const d = rank(a.t) - rank(b.t);
			return d !== 0 ? d : a.i - b.i;
		})
		.map(function (x) {
			return x.t;
		});
}

// One mapping, kept in store.js so the HR console uses the same one.
export { statusTone } from './store.js';

/* ----------------------------------------------------------------- panel */

export async function openReview(row) {
	review.open = row;
	review.appraisal = row.appraisal || '';
	review.loaded = false;
	review.loading = true;
	review.loadError = '';
	review.submitErrors = [];
	review.everythingOpen = false;
	queue.reset(false);

	const r = await api('wfa_get_review', auth({ appraisal: review.appraisal }), { retry: true });
	review.loading = false;

	if (sessionGone(r)) return r;
	if (!r || !r.ok) {
		review.loadError = (r && r.message) || '';
		return r;
	}

	review.status = r.status || '';
	review.editable = Number(r.editable || 0);
	review.panelNote = r.window_note || '';
	review.submittedOn = r.submitted_on || '';
	review.managerSubmittedOn = r.manager_submitted_on || '';
	review.header = r.header || {};
	review.weights = r.weights || {};
	review.self = r.self || {};

	hydrating = true;
	review.draft = mergeReview(emptyReview(review.self), r.review || {});
	queue.reset();
	review.loaded = true;
	setTimeout(function () {
		hydrating = false;
	}, 0);
	return r;
}

export async function closeReview() {
	await settleReview();
	review.open = null;
	review.appraisal = '';
	review.loaded = false;
	review.self = {};
	review.draft = emptyReview(null);
	queue.reset(false);
}

/* ----------------------------------------------------------------- scores */

/** Contributions the employee actually wrote something in. */
export function filledContribs() {
	const rows = (review.self && review.self.contribs) || [];
	return rows
		.map(function (c, i) {
			return { c: c, i: i };
		})
		.filter(function (x) {
			return !!(String(x.c.contribution || '').trim() || String(x.c.impact || '').trim());
		});
}

export function blankContribNames() {
	const rows = (review.self && review.self.contribs) || [];
	return rows
		.filter(function (c) {
			return !(String(c.contribution || '').trim() || String(c.impact || '').trim());
		})
		.map(function (c) {
			return c.area;
		});
}

export function managerScore() {
	const d = review.draft;
	const self = review.self || {};
	const kra = weightedAverage(d.kras, self.kras || [], 'rating');
	const comp = weightedAverage(d.comps, self.comps || [], 'rating');
	const add = plainAverage(d.contribs, 'rating');
	return combineSections(kra, comp, add, {
		kra: review.weights.kra,
		competency: review.weights.competency,
		additional: review.weights.additional,
	});
}

export function selfScoreOf() {
	const s = review.self || {};
	return Number(s.self_weighted_score || 0);
}

export function ratedTotals() {
	const d = review.draft;
	const need = d.kras.length + d.comps.length + filledContribs().length;
	let done = 0;
	d.kras.forEach(function (k) {
		if (k.rating) done++;
	});
	d.comps.forEach(function (c) {
		if (c.rating) done++;
	});
	filledContribs().forEach(function (x) {
		if (d.contribs[x.i] && d.contribs[x.i].rating) done++;
	});
	return { done: done, need: need };
}

export function gapText(managerRating, selfRating) {
	if (!managerRating || !selfRating) return '';
	const gap = Number(managerRating) - Number(selfRating);
	if (gap === 0) return 'matches self rating';
	return (gap > 0 ? '+' : '−') + Math.abs(gap) + ' vs self';
}

export function gapIsWide(managerRating, selfRating) {
	if (!managerRating || !selfRating) return false;
	return Math.abs(Number(managerRating) - Number(selfRating)) >= 2;
}

/* ------------------------------------------------------------- validation */

function filled(v) {
	return String(v || '').trim().length > 0;
}

/** Mirrors what wfa_submit_review checks, with the same step keys. */
export function reviewIssues() {
	const d = review.draft;
	const self = review.self || {};
	const out = [];

	d.kras.forEach(function (k, i) {
		if (!k.rating) {
			const def = (self.kras || [])[i] || {};
			out.push({ step: 'kras', msg: 'KRA ' + (i + 1) + (def.kra ? ' (' + def.kra + ')' : '') + ': give a rating' });
		}
	});
	d.comps.forEach(function (c, i) {
		if (!c.rating) {
			out.push({ step: 'comps', msg: (c.competency || 'Competency ' + (i + 1)) + ': give a rating' });
		}
	});
	filledContribs().forEach(function (x) {
		const row = d.contribs[x.i];
		if (row && !row.rating) {
			out.push({ step: 'contribs', msg: (x.c.area || 'Contribution') + ': give a rating' });
		}
	});
	if (!d.overall_rating) out.push({ step: 'overall', msg: 'Give an overall rating' });
	if (!filled(d.key_feedback)) out.push({ step: 'overall', msg: 'Write the key feedback' });
	if (!filled(d.development_recs)) out.push({ step: 'overall', msg: 'Write the development recommendations' });

	return out;
}

export function canSubmitReview() {
	return reviewIssues().length === 0;
}

/** One plain sentence saying what is still missing. */
export function missingSummary() {
	const issues = reviewIssues();
	if (!issues.length) return '';
	const counts = { kras: 0, comps: 0, contribs: 0 };
	let overallRating = false;
	let feedback = false;
	let recs = false;
	issues.forEach(function (e) {
		if (e.step === 'overall') {
			if (e.msg === 'Give an overall rating') overallRating = true;
			else if (e.msg === 'Write the key feedback') feedback = true;
			else recs = true;
		} else {
			counts[e.step]++;
		}
	});
	const bits = [];
	if (counts.kras) bits.push(counts.kras + ' KRA' + (counts.kras === 1 ? '' : 's') + ' to rate');
	if (counts.comps) bits.push(counts.comps + ' competenc' + (counts.comps === 1 ? 'y' : 'ies') + ' to rate');
	if (counts.contribs) bits.push(counts.contribs + ' contribution' + (counts.contribs === 1 ? '' : 's') + ' to rate');
	if (overallRating) bits.push('an overall rating');
	if (feedback) bits.push('key feedback');
	if (recs) bits.push('development recommendations');
	return 'Still needed: ' + bits.join(', ') + '.';
}

/** Today as YYYY-MM-DD in the viewer's timezone — toISOString() would be UTC,
 * which shows the wrong day either side of midnight. */
function localDay() {
	const d = new Date();
	const p = function (n) {
		return (n < 10 ? '0' : '') + n;
	};
	return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
}

/* --------------------------------------------------------------- submit */

export async function submitReview() {
	review.submitting = true;
	review.submitErrors = [];
	await settleReview();
	const r = await api(
		'wfa_submit_review',
		auth({ appraisal: review.appraisal, review: JSON.parse(JSON.stringify(review.draft)) })
	);
	review.submitting = false;

	if (sessionGone(r)) return r;
	if (r && r.ok) {
		review.status = r.status || 'Manager Submitted';
		review.editable = 0;
		review.managerSubmittedOn = r.manager_submitted_on || localDay();
		queue.reset();
		// Keep the team list honest without another round trip.
		const row = review.team.filter(function (t) {
			return t.appraisal === review.appraisal;
		})[0];
		if (row) {
			row.status = review.status;
			row.reviewable = 0;
			row.review_done = 1;
			row.manager_submitted_on = review.managerSubmittedOn;
			row.manager_weighted_score = r.manager_weighted_score;
		}
		return r;
	}
	if (r && r.reason === 'incomplete' && Array.isArray(r.errors) && r.errors.length) {
		review.submitErrors = r.errors;
		return r;
	}
	if (r && r.message) toast(r.message);
	return r;
}
