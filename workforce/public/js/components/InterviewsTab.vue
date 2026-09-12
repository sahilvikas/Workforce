<template>
	<div class="iv">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="head">
			<div>
				<h1>Interviews</h1>
				<p>Every round on one calendar. Invites and Meet links go out from hr@ automatically; interviewers get a feedback link after.</p>
			</div>
			<div class="seg">
				<button type="button" :class="{ on: view === 'week' }" @click="view = 'week'">Week</button>
				<button type="button" :class="{ on: view === 'list' }" @click="view = 'list'">List</button>
			</div>
		</div>

		<div v-if="pendingFeedback.length" class="note">
			<b>{{ pendingFeedback.length }} interview{{ pendingFeedback.length > 1 ? 's are' : ' is' }} waiting for feedback.</b>
			<button class="btn sm" type="button" @click="view = 'list'; onlyPending = true">Show them</button>
		</div>

		<div v-if="loading" class="panel empty"><p>Loading…</p></div>

		<!-- week -->
		<section v-else-if="view === 'week'" class="panel">
			<div class="weekbar">
				<button class="btn sm" type="button" @click="week--" aria-label="Previous week">‹</button>
				<button class="btn sm" type="button" @click="week = 0">Today</button>
				<button class="btn sm" type="button" @click="week++" aria-label="Next week">›</button>
				<h2>{{ weekLabel }}</h2>
			</div>
			<div class="week">
				<div v-for="d in days" :key="d.iso" class="day" :class="{ today: d.isToday, weekend: d.isWeekend }">
					<h5>{{ d.dow }} <span>{{ d.label }}</span><em v-if="d.isToday">Today</em></h5>
					<button v-for="iv in onDay(d.iso)" :key="iv.name" class="ev" :class="evClass(iv)" type="button" @click="open(iv)">
						<span class="num">{{ (iv.scheduled_time || '').slice(0, 5) }}</span>
						<b>{{ iv.applicant_name }}</b>
						Round {{ iv.round_number }}, {{ iv.round_name }}
						<span class="sub">with {{ iv.interviewer_name || iv.interviewer }}</span>
					</button>
					<div v-if="!onDay(d.iso).length" class="none">—</div>
				</div>
			</div>
		</section>

		<!-- list -->
		<section v-else class="panel">
			<div class="toolbar">
				<input v-model="q" class="in search" placeholder="Search by candidate or position" />
				<button type="button" class="chip" :class="{ on: onlyPending }" @click="onlyPending = !onlyPending">Waiting for feedback <span class="c">{{ pendingFeedback.length }}</span></button>
			</div>
			<table class="t">
				<thead><tr><th>When</th><th>Candidate</th><th class="hs">Round</th><th class="hs">Interviewer</th><th>Status</th><th class="hs">Rating</th></tr></thead>
				<tbody>
					<tr v-for="iv in listRows" :key="iv.name" @click="open(iv)">
						<td class="num"><b>{{ shortDate(iv.scheduled_date) }}</b><div class="sub">{{ (iv.scheduled_time || '').slice(0, 5) }}</div></td>
						<td><div class="ttl">{{ iv.applicant_name }}</div><div class="sub">{{ iv.job_title }}</div></td>
						<td class="hs">{{ iv.round_number }}. {{ iv.round_name }}</td>
						<td class="hs">{{ iv.interviewer_name || iv.interviewer }}</td>
						<td><Badge :label="iv.status" /></td>
						<td class="hs num">{{ iv.rating ? iv.rating + ' / 5' : '—' }}</td>
					</tr>
				</tbody>
			</table>
			<div v-if="!listRows.length" class="empty"><h3>Nothing here</h3><p>Try another search, or clear the filter.</p></div>
		</section>

		<!-- interview drawer -->
		<DetailPanel :visible="!!sel" :title="sel ? sel.applicant_name : ''" @close="sel = null">
			<template v-if="sel">
				<div class="pills"><Badge :label="sel.status" /><span class="sub">Round {{ sel.round_number }}, {{ sel.round_name }}</span></div>
				<dl class="kv">
					<div><dt>Position</dt><dd>{{ sel.job_title }}</dd></div>
					<div><dt>Interviewer</dt><dd>{{ sel.interviewer_name || sel.interviewer }}</dd></div>
					<div><dt>When</dt><dd>{{ shortDate(sel.scheduled_date) }} at {{ (sel.scheduled_time || '').slice(0, 5) }} IST</dd></div>
					<div><dt>Duration</dt><dd>{{ sel.duration_minutes || 30 }} min</dd></div>
				</dl>
				<div class="sec" v-if="sel.google_meet_link && sel.status === 'Scheduled'">
					<h4>Meeting</h4>
					<div class="row">
						<a class="btn" :href="sel.google_meet_link" target="_blank" rel="noopener">Join Google Meet</a>
						<button class="btn" type="button" @click="copy(sel.google_meet_link)">Copy link</button>
					</div>
				</div>
				<div class="sec" v-if="sel.rating">
					<h4>Feedback</h4>
					<div class="box">
						<b class="num">{{ sel.rating }} / 5</b>, {{ sel.recommendation }}
						<p v-if="sel.feedback" class="pre">{{ sel.feedback }}</p>
					</div>
				</div>
			</template>
			<template #actions v-if="sel && sel.status === 'Scheduled'">
				<button class="btn" type="button" @click="openReschedule">Reschedule</button>
				<button class="btn dan" type="button" @click="cancel.show = true">Cancel interview</button>
				<button class="btn pri" type="button" @click="openFeedback">Give feedback</button>
			</template>
		</DetailPanel>

		<!-- feedback -->
		<Dialog :visible="fb.show" title="Interview feedback" submit-label="Submit feedback" :loading="fb.busy" size="lg" @close="fb.show = false" @submit="doFeedback">
			<p class="sub top" v-if="sel">Round {{ sel.round_number }}, {{ sel.round_name }} with {{ sel.applicant_name }}</p>
			<div class="fld">
				<label>Overall rating <span class="req">*</span></label>
				<div class="stars">
					<button v-for="n in 5" :key="n" type="button" :class="{ on: fb.rating >= n }" @click="fb.rating = n" :aria-label="n + ' stars'">★</button>
					<span class="sub">{{ ratingLabel }}</span>
				</div>
			</div>
			<div class="fld">
				<label>Recommendation <span class="req">*</span></label>
				<div class="seg wrap">
					<button v-for="r in recommendations" :key="r" type="button" :class="{ on: fb.recommendation === r }" @click="fb.recommendation = r">{{ r }}</button>
				</div>
			</div>
			<div class="grid">
				<div class="fld" v-for="s in skills" :key="s.key">
					<label>{{ s.label }}</label>
					<select v-model.number="fb[s.key]" class="in">
						<option :value="0">Not rated</option>
						<option v-for="n in 5" :key="n" :value="n">{{ n }}</option>
					</select>
				</div>
			</div>
			<div class="fld"><label>Strengths</label><textarea v-model="fb.strengths" class="in ta" rows="2" placeholder="What stood out"></textarea></div>
			<div class="fld"><label>Areas to improve</label><textarea v-model="fb.improve" class="in ta" rows="2" placeholder="What could be better"></textarea></div>
			<div class="fld"><label>Detailed notes</label><textarea v-model="fb.notes" class="in ta" rows="4"></textarea></div>
		</Dialog>

		<!-- reschedule -->
		<Dialog :visible="res.show" title="Reschedule the interview" submit-label="Reschedule" :loading="res.busy" @close="res.show = false" @submit="doReschedule">
			<p class="sub top">The candidate and interviewer are told the new time. The Meet link stays the same.</p>
			<div class="grid">
				<div class="fld"><label>New date <span class="req">*</span></label><input v-model="res.date" type="date" class="in" /></div>
				<div class="fld"><label>New time</label><input v-model="res.time" type="time" class="in" /></div>
			</div>
		</Dialog>

		<!-- cancel -->
		<Dialog :visible="cancel.show" title="Cancel this interview?" submit-label="Cancel interview" :loading="cancel.busy" @close="cancel.show = false" @submit="doCancel">
			<p class="sub top">The candidate and interviewer are told, and the calendar event is removed.</p>
			<div class="fld"><label>Reason</label><textarea v-model="cancel.reason" class="in ta" rows="3" placeholder="Optional"></textarea></div>
		</Dialog>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';
import { shortDate } from './utils/time.js';

export default {
	name: 'InterviewsTab',
	components: { Badge, Dialog, DetailPanel, Toast },
	data() {
		return {
			loading: true, interviews: [], view: 'week', week: 0, q: '', onlyPending: false,
			sel: null,
			fb: { show: false, rating: 0, recommendation: '', problem: 0, communication: 0, domain: 0, strengths: '', improve: '', notes: '', busy: false },
			res: { show: false, date: '', time: '', busy: false },
			cancel: { show: false, reason: '', busy: false },
			toast: { show: false, msg: '', type: 'success' },
			recommendations: ['Strongly Recommend', 'Recommend', 'Neutral', 'Do Not Recommend'],
			skills: [
				{ key: 'problem', label: 'Problem solving' },
				{ key: 'communication', label: 'Communication' },
				{ key: 'domain', label: 'Domain knowledge' }
			]
		};
	},
	computed: {
		// Interview date and time are already India wall-clock; never converted.
		days() {
			const base = new Date();
			base.setHours(0, 0, 0, 0);
			base.setDate(base.getDate() - ((base.getDay() + 6) % 7) + this.week * 7);   // Monday
			const todayIso = this.iso(new Date());
			const out = [];
			for (let i = 0; i < 7; i++) {
				const d = new Date(base);
				d.setDate(d.getDate() + i);
				out.push({
					iso: this.iso(d),
					dow: d.toLocaleDateString('en-GB', { weekday: 'short' }),
					label: d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }),
					isToday: this.iso(d) === todayIso,
					isWeekend: i > 4
				});
			}
			return out;
		},
		weekLabel() {
			if (!this.days.length) return '';
			return this.days[0].label + ' to ' + this.days[6].label;
		},
		pendingFeedback() { return this.interviews.filter(iv => iv.status === 'Completed' && !iv.rating); },
		listRows() {
			let list = this.interviews.slice().sort((a, b) => String(b.scheduled_date + b.scheduled_time).localeCompare(String(a.scheduled_date + a.scheduled_time)));
			if (this.onlyPending) list = list.filter(iv => iv.status === 'Completed' && !iv.rating);
			const q = this.q.trim().toLowerCase();
			if (q) list = list.filter(iv => [iv.applicant_name, iv.job_title, iv.round_name].join(' ').toLowerCase().includes(q));
			return list;
		},
		ratingLabel() {
			return ['', 'Poor', 'Below average', 'Good', 'Very good', 'Excellent'][this.fb.rating] || '';
		}
	},
	mounted() { this.load(); },
	methods: {
		api(method, args = {}) {
			return new Promise((resolve, reject) => {
				frappe.call({ method, args, callback: r => resolve(r.message), error: reject });
			});
		},
		notify(msg, type = 'success') { this.toast = { show: true, msg, type }; },
		async load() {
			try { this.interviews = (await this.api('wf_get_interview_calendar_data')) || []; }
			catch (e) { this.notify('Could not load interviews.', 'error'); }
			this.loading = false;
		},
		iso(d) {
			return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
		},
		onDay(iso) {
			return this.interviews
				.filter(iv => String(iv.scheduled_date || '').slice(0, 10) === iso)
				.sort((a, b) => String(a.scheduled_time).localeCompare(String(b.scheduled_time)));
		},
		evClass(iv) { return iv.status === 'Cancelled' ? 'cx' : (iv.status === 'Completed' ? 'done' : ''); },
		shortDate(d) { return shortDate(d); },
		copy(text) {
			if (navigator.clipboard) navigator.clipboard.writeText(text);
			this.notify('Link copied.');
		},
		open(iv) { this.sel = iv; },

		openFeedback() {
			this.fb = { show: true, rating: 0, recommendation: '', problem: 0, communication: 0, domain: 0, strengths: '', improve: '', notes: '', busy: false };
		},
		async doFeedback() {
			if (!this.fb.rating) { this.notify('Please give a rating.', 'error'); return; }
			if (!this.fb.recommendation) { this.notify('Please choose a recommendation.', 'error'); return; }
			const parts = [];
			this.skills.forEach(s => { if (this.fb[s.key]) parts.push(s.label + ': ' + this.fb[s.key] + '/5'); });
			if (this.fb.strengths.trim()) parts.push('Strengths: ' + this.fb.strengths.trim());
			if (this.fb.improve.trim()) parts.push('Areas to improve: ' + this.fb.improve.trim());
			if (this.fb.notes.trim()) parts.push(this.fb.notes.trim());
			this.fb.busy = true;
			try {
				await this.api('wf_submit_feedback', {
					data: { interview_name: this.sel.name, rating: this.fb.rating, recommendation: this.fb.recommendation, feedback: parts.join('\n\n') }
				});
				this.notify('Feedback submitted.');
				this.fb.show = false;
				this.sel = null;
				await this.load();
			} catch (e) { /* shown by frappe */ }
			this.fb.busy = false;
		},

		openReschedule() {
			this.res = { show: true, date: String(this.sel.scheduled_date || '').slice(0, 10), time: (this.sel.scheduled_time || '').slice(0, 5), busy: false };
		},
		async doReschedule() {
			if (!this.res.date) { this.notify('Choose the new date.', 'error'); return; }
			this.res.busy = true;
			try {
				await this.api('wf_reschedule_interview', {
					data: { interview: this.sel.name, scheduled_date: this.res.date, scheduled_time: this.res.time || this.sel.scheduled_time }
				});
				this.notify('Rescheduled. Both sides notified.');
				this.res.show = false;
				this.sel = null;
				await this.load();
			} catch (e) { /* shown by frappe */ }
			this.res.busy = false;
		},

		async doCancel() {
			this.cancel.busy = true;
			try {
				await this.api('wf_cancel_interview', { data: { interview: this.sel.name, reason: this.cancel.reason.trim() } });
				this.notify('Interview cancelled.');
				this.cancel = { show: false, reason: '', busy: false };
				this.sel = null;
				await this.load();
			} catch (e) { this.cancel.busy = false; }
		}
	}
};
</script>

<style scoped>
.head { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 18px; }
.head h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.02em; color: var(--wf-ink); }
.head p { margin: 5px 0 0; color: var(--wf-mut); max-width: 72ch; }
.head .seg { margin-left: auto; }
.seg { display: inline-flex; border: 1px solid var(--wf-line); border-radius: 9px; padding: 3px; gap: 2px; background: #fff; }
.seg.wrap { flex-wrap: wrap; }
.seg button { border: 0; background: transparent; height: 32px; padding: 0 14px; border-radius: 7px; font: inherit; font-weight: 500; color: var(--wf-mut); cursor: pointer; }
.seg button.on { background: var(--wf-primary-tint); color: var(--wf-primary-2); }
.note { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; background: var(--wf-amber-tint); color: var(--wf-amber-ink); border-radius: 10px; padding: 10px 14px; font-size: 13.5px; margin-bottom: 16px; }
.panel { background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; overflow: hidden; }
.weekbar { display: flex; align-items: center; gap: 8px; padding: 14px 20px; }
.weekbar h2 { margin: 0 0 0 8px; font-size: 16px; font-weight: 600; }
.week { display: grid; grid-template-columns: repeat(7, 1fr); border-top: 1px solid var(--wf-line); }
.day { border-right: 1px solid var(--wf-line-2); min-height: 260px; padding: 10px; }
.day.weekend { background: #FBFBFE; }
.day:last-child { border-right: 0; }
.day h5 { margin: 0 0 10px; font-size: 13px; font-weight: 600; display: flex; gap: 6px; align-items: baseline; }
.day h5 span { color: var(--wf-mut-2); font-weight: 500; }
.day.today h5 { color: var(--wf-primary-2); }
.day.today h5 em { font-style: normal; font-size: 11.5px; background: var(--wf-primary); color: #fff; padding: 1px 7px; border-radius: 5px; }
.ev { display: block; width: 100%; text-align: left; border: 0; border-left: 3px solid var(--wf-primary); border-radius: 9px; background: var(--wf-primary-tint); padding: 8px 10px; margin-bottom: 8px; font: inherit; font-size: 12.5px; cursor: pointer; }
.ev b { display: block; font-size: 13px; }
.ev.done { background: var(--wf-line-2); border-left-color: var(--wf-mut-2); color: var(--wf-mut); }
.ev.cx { background: #fff; border-left-color: var(--wf-line); color: var(--wf-mut-2); text-decoration: line-through; }
.none { font-size: 12.5px; color: var(--wf-mut-2); }
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 16px 20px 6px; }
.toolbar .in { width: auto; }
.search { flex: 1; min-width: 220px; }
.chip { height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-mut); font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer; }
.chip.on { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.chip .c { opacity: .7; margin-left: 3px; }
.t { width: 100%; border-collapse: collapse; }
.t th { text-align: left; font-size: 12.5px; font-weight: 500; color: var(--wf-mut-2); padding: 14px 16px 10px; border-bottom: 1px solid var(--wf-line); }
.t td { padding: 13px 16px; border-bottom: 1px solid var(--wf-line-2); }
.t tbody tr:last-child td { border-bottom: 0; }
.t th:first-child, .t td:first-child { padding-left: 20px; }
.t tbody tr { cursor: pointer; }
.t tbody tr:hover td { background: #FAFAFD; }
.ttl { font-weight: 600; color: var(--wf-ink); }
.sub { font-size: 13px; color: var(--wf-mut); }
.sub.top { margin: -6px 0 14px; }
.num { font-variant-numeric: tabular-nums; }
.empty { text-align: center; padding: 44px 20px; }
.empty h3 { margin: 0 0 6px; font-size: 17px; font-weight: 600; }
.empty p { margin: 0; color: var(--wf-mut); }
.pills { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin: 0 0 20px; }
.kv dt { font-size: 12.5px; color: var(--wf-mut-2); }
.kv dd { margin: 2px 0 0; font-weight: 500; }
.sec { margin-bottom: 20px; }
.sec h4 { margin: 0 0 8px; font-size: 13.5px; font-weight: 600; }
.row { display: flex; gap: 8px; flex-wrap: wrap; }
.box { border: 1px solid var(--wf-line); border-radius: 12px; padding: 14px 16px; }
.pre { white-space: pre-wrap; margin: 8px 0 0; font-size: 13.5px; }
.stars { display: flex; align-items: center; gap: 4px; }
.stars button { border: 0; background: transparent; font-size: 28px; line-height: 1; color: #D5D8E3; cursor: pointer; padding: 0 2px; }
.stars button.on { color: var(--wf-amber); }
.stars .sub { margin-left: 10px; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0 16px; }
.fld { margin-bottom: 16px; }
.fld label { display: block; font-weight: 500; margin-bottom: 6px; }
.req { color: var(--wf-bad); }
.in { box-sizing: border-box; width: 100%; height: 40px; border: 1px solid var(--wf-line); border-radius: 9px; padding: 0 12px; background: #fff; font: inherit; color: var(--wf-ink); }
.in:focus { outline: none; border-color: var(--wf-primary-2); box-shadow: 0 0 0 3px var(--wf-primary-tint); }
.ta { height: auto; padding: 10px 12px; line-height: 1.5; resize: vertical; }
.btn { height: 38px; padding: 0 15px; border-radius: 9px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-ink-2); font: inherit; font-weight: 500; font-size: 14px; cursor: pointer; text-decoration: none; display: inline-flex; align-items: center; }
.btn:hover { background: var(--wf-line-2); }
.btn.pri { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.btn.pri:hover { background: var(--wf-primary-2); }
.btn.dan { color: var(--wf-bad); border-color: #F5C2C2; }
.btn.dan:hover { background: var(--wf-bad-tint); }
.btn.sm { height: 32px; padding: 0 11px; font-size: 13px; }
@media (max-width: 900px) {
	.week { grid-template-columns: 1fr; }
	.day { border-right: 0; border-bottom: 1px solid var(--wf-line-2); min-height: 0; }
	.hs { display: none; }
	.kv, .grid { grid-template-columns: 1fr; }
}
</style>