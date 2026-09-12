<template>
	<div class="cd">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="head">
			<div>
				<h1>Candidates</h1>
				<p>Everyone in the pipeline. Columns with a diamond need a decision from you.</p>
			</div>
			<div class="seg">
				<button type="button" :class="{ on: view === 'board' }" @click="view = 'board'">Board</button>
				<button type="button" :class="{ on: view === 'list' }" @click="view = 'list'">List</button>
			</div>
		</div>

		<div class="filters">
			<input v-model="q" class="in search" placeholder="Search by name or email" />
			<select v-model="jobFilter" class="in sel">
				<option value="">All positions</option>
				<option v-for="j in jobs" :key="j.name" :value="j.name">{{ j.job_title }}</option>
			</select>
			<button type="button" class="chip" :class="{ on: showClosed }" @click="showClosed = !showClosed">
				{{ showClosed ? 'Hide' : 'Show' }} closed <span class="c">{{ closed.length }}</span>
			</button>
		</div>

		<div v-if="loading" class="panel empty"><p>Loading…</p></div>

		<div v-else-if="view === 'board'" class="board">
			<div v-for="lane in lanes" :key="lane" class="lane">
				<div class="lane-h">
					<span v-if="DECISION_LANES[lane]" class="dm" title="You decide here"></span>
					{{ lane }}<span class="c">{{ inLane(lane).length }}</span>
				</div>
				<button v-for="c in inLane(lane)" :key="c.name" class="card" :class="{ dec: isDecision(c) }" type="button" @click="open(c)">
					<div class="nm">{{ c.applicant_name }}</div>
					<div class="ps">{{ c.job_title }}</div>
					<div class="nx" :class="{ dec: isDecision(c) }">{{ nextStep(c) }}</div>
					<div class="rw">
						<span class="score" :class="scoreClass(c)">{{ scoreText(c) }}</span>
						<span class="sp"></span>
						<span class="sub">{{ rel(c.creation) }}</span>
					</div>
				</button>
				<div v-if="!inLane(lane).length" class="none">Nobody here</div>
			</div>
		</div>

		<section v-else class="panel">
			<table class="t">
				<thead><tr><th>Candidate</th><th class="hs">Position</th><th>Stage</th><th class="hs">Next step</th><th>Score</th><th class="hs">Applied</th></tr></thead>
				<tbody>
					<tr v-for="c in listRows" :key="c.name" @click="open(c)">
						<td><div class="ttl">{{ c.applicant_name }}</div><div class="sub">{{ c.email }}</div></td>
						<td class="hs">{{ c.job_title }}</td>
						<td><Badge :label="c.status" /></td>
						<td class="hs"><span :class="{ decw: isDecision(c) }">{{ nextStep(c) }}</span></td>
						<td><span class="score" :class="scoreClass(c)">{{ scoreText(c) }}</span></td>
						<td class="hs sub">{{ rel(c.creation) }}</td>
					</tr>
				</tbody>
			</table>
			<div v-if="!listRows.length" class="empty"><h3>No candidates</h3><p>Try another filter or clear the search.</p></div>
		</section>

		<!-- candidate drawer -->
		<DetailPanel :visible="showPanel" :title="sel ? sel.applicant_name : ''" @close="closePanel">
			<template v-if="detail">
				<div class="pills">
					<Badge :label="cand.status" />
					<span class="sub num">{{ cand.name }}</span>
				</div>
				<div class="dtabs">
					<button v-for="t in tabs" :key="t.key" type="button" :class="{ on: tab === t.key }" @click="tab = t.key">{{ t.label }}</button>
				</div>

				<!-- summary -->
				<template v-if="tab === 'summary'">
					<div class="note" :class="{ info: !isDecision(cand) }">
						<b>{{ isDecision(cand) ? 'Your decision:' : 'Next:' }}</b> {{ nextStep(cand) }}
					</div>
					<div v-if="cand.ai_score" class="ai">
						<span class="ring" :class="scoreClass(cand)">{{ cand.ai_score }}<em>{{ cand.ai_grade ? 'Grade ' + cand.ai_grade : 'Score' }}</em></span>
						<div>
							<b>AI screening</b>
							<p>{{ cand.ai_summary || 'No summary.' }}</p>
							<p class="sub">{{ cand.screening_notes }}</p>
							<p class="sub">Advisory only. You make the call.</p>
						</div>
					</div>
					<div v-else-if="cand.screening_status === 'Screening Failed'" class="note">
						<b>Needs manual review.</b> The AI could not read this resume. Open it and decide.
					</div>
					<dl class="kv">
						<div><dt>Position</dt><dd>{{ detail.position.title }}</dd></div>
						<div><dt>Team</dt><dd>{{ detail.position.team || '—' }}</dd></div>
						<div><dt>Email</dt><dd>{{ cand.email }}</dd></div>
						<div><dt>Phone</dt><dd>{{ cand.phone || '—' }}</dd></div>
						<div><dt>Source</dt><dd>{{ cand.source || '—' }}</dd></div>
						<div><dt>Applied</dt><dd>{{ shortDate(cand.creation) }}</dd></div>
					</dl>
					<div class="sec" v-if="cand.resume_url">
						<h4>Resume</h4>
						<a class="btn sm" :href="cand.resume_url" target="_blank" rel="noopener">Open resume</a>
					</div>
					<div class="sec" v-if="cand.skills"><h4>Skills</h4><p>{{ cand.skills }}</p></div>
					<div class="sec" v-if="cand.cover_letter"><h4>Cover letter</h4><p class="pre">{{ cand.cover_letter }}</p></div>
					<div class="sec">
						<h4>Journey</h4>
						<ol class="tl">
							<li v-for="(l, i) in lanes" :key="l" :class="journeyClass(i)">
								<span class="dot"></span>
								<b>{{ l }}<em v-if="DECISION_LANES[l]" class="gt">Decision</em></b>
							</li>
							<li v-if="laneOf(cand) === 'Closed'" class="stop"><span class="dot"></span><b>{{ nextStep(cand) }}</b></li>
						</ol>
					</div>
				</template>

				<!-- interviews -->
				<template v-if="tab === 'interviews'">
					<div v-if="!interviews.length" class="empty">
						<h3>No interviews yet</h3>
						<p>{{ cand.status === 'Shortlisted' ? 'Schedule the rounds from the position’s template.' : 'Interviews are scheduled once a candidate is shortlisted.' }}</p>
					</div>
					<div v-for="iv in interviews" :key="iv.name" class="box">
						<div class="box-top">
							<b>Round {{ iv.round_number }}: {{ iv.round_name }}</b>
							<Badge :label="iv.status" />
						</div>
						<div class="sub">{{ shortDate(iv.scheduled_date) }} at {{ (iv.scheduled_time || '').slice(0, 5) }}, {{ iv.duration_minutes }} min, with {{ iv.interviewer_name }}</div>
						<div v-if="iv.rating" class="sub"><b>{{ iv.rating }} / 5</b>, {{ iv.recommendation }}</div>
						<p v-if="iv.feedback" class="pre fb">{{ iv.feedback }}</p>
						<a v-if="iv.google_meet_link && iv.status === 'Scheduled'" class="btn sm" :href="iv.google_meet_link" target="_blank" rel="noopener">Join Google Meet</a>
					</div>
				</template>

				<!-- background check -->
				<template v-if="tab === 'bgv'">
					<div v-if="!bgv" class="empty">
						<h3>{{ cand.status === 'Selected' ? 'Ready to start' : 'Not started' }}</h3>
						<p>The background check starts after a candidate is selected. The candidate lists their last two employers; each employer confirms by email. No offer can go out until you clear it.</p>
					</div>
					<template v-else>
						<div class="pills"><Badge :label="bgv.status" /><span class="sub num">{{ bgv.name }}</span></div>
						<div class="sub" v-if="bgv.candidate_submitted_on">Candidate submitted {{ shortDate(bgv.candidate_submitted_on) }}. {{ bgv.companies_replied }} of {{ bgv.companies_total }} employers replied.</div>
						<div v-if="bgv.status === 'Awaiting Candidate'" class="sec">
							<h4>Form link</h4>
							<div class="copyrow"><input class="in" :value="bgvFormUrl" readonly /><button class="btn sm" type="button" @click="copy(bgvFormUrl)">Copy</button></div>
						</div>
						<div v-for="co in (bgv.companies || [])" :key="co.row" class="box">
							<div class="box-top"><b>{{ co.company_name }}</b><Badge :label="co.overall_verdict" /></div>
							<div class="sub">{{ co.designation }}<template v-if="co.period">, {{ co.period }}</template></div>
							<div class="sub">Verifier: {{ co.verifier_name }}</div>
							<p v-if="co.mismatch_notes" class="sub warn">{{ co.mismatch_notes }}</p>
						</div>
						<div v-if="bgv.hr_decision_on" class="sub">Decided by {{ bgv.hr_decision_by }} on {{ shortDate(bgv.hr_decision_on) }}. {{ bgv.hr_notes }}</div>
					</template>
				</template>

				<!-- offer and joining -->
				<template v-if="tab === 'offer'">
					<div v-if="offer" class="box">
						<div class="box-top"><b>Offer</b><Badge :label="offer.status" /></div>
						<dl class="kv small">
							<div><dt>Designation</dt><dd>{{ offer.designation || '—' }}</dd></div>
							<div><dt>Annual CTC</dt><dd class="num">{{ money(offer.offered_salary) }}</dd></div>
							<div><dt>Joining</dt><dd>{{ offer.joining_date ? shortDate(offer.joining_date) : '—' }}</dd></div>
							<div><dt>Responds by</dt><dd>{{ offer.expires_on ? shortDate(offer.expires_on) : '—' }}</dd></div>
						</dl>
						<div v-if="offer.response_url" class="copyrow"><input class="in" :value="offer.response_url" readonly /><button class="btn sm" type="button" @click="copy(offer.response_url)">Copy link</button></div>
					</div>
					<div v-else class="empty">
						<h3>No offer yet</h3>
						<p>An offer can be created once the background check is cleared or waived.</p>
					</div>

					<div class="sec">
						<h4>Joining</h4>
						<div v-if="cand.status === 'Onboarded'" class="box"><b>Joined.</b> <span class="sub">Employee record created and credentials emailed.</span></div>
						<template v-else-if="onboarding">
							<div class="box">
								<div class="sub">The candidate has been emailed a form for PAN, Aadhaar, bank and emergency contact.</div>
								<div class="copyrow"><input class="in" :value="onboarding.form_url" readonly /><button class="btn sm" type="button" @click="copy(onboarding.form_url)">Copy</button></div>
								<div class="sub">Form status: {{ onboarding.status }}</div>
							</div>
							<div v-if="onboarding.status !== 'Submitted'" class="note lock">
								<b>Complete onboarding</b> unlocks when the form comes back.
							</div>
						</template>
						<p v-else class="sub">After the offer is accepted.</p>
					</div>
				</template>
			</template>
			<div v-else class="empty"><p>Loading…</p></div>

			<template #actions v-if="detail && detail.can_edit">
				<button v-for="a in actions" :key="a.label" class="btn" :class="a.cls" type="button" @click="a.run()">{{ a.label }}</button>
			</template>
		</DetailPanel>

		<!-- status change confirm -->
		<Dialog :visible="conf.show" :title="conf.title" :submit-label="conf.button" :loading="conf.busy" @close="conf.show = false" @submit="doStatus">
			<p class="sub top">{{ conf.note }}</p>
		</Dialog>

		<!-- schedule interviews -->
		<Dialog :visible="sch.show" title="Schedule interviews" :submit-label="'Schedule ' + sch.rounds.length + ' round' + (sch.rounds.length === 1 ? '' : 's')" :loading="sch.busy" size="lg" @close="sch.show = false" @submit="doSchedule">
			<p class="sub top">Each round gets a Google Meet link. The candidate and interviewer get an invite from hr@; the interviewer also gets a feedback link.</p>
			<div v-for="(r, i) in sch.rounds" :key="i" class="box">
				<b>Round {{ i + 1 }}</b>
				<div class="grid">
					<div class="fld"><label>Round name</label><input v-model="r.round_name" class="in" /></div>
					<div class="fld"><label>Interviewer <span class="req">*</span></label>
						<select v-model="r.interviewer" class="in">
							<option value="">Choose</option>
							<option v-for="u in interviewers" :key="u.name" :value="u.name">{{ u.full_name || u.name }}</option>
						</select>
					</div>
					<div class="fld"><label>Date <span class="req">*</span></label><input v-model="r.scheduled_date" type="date" class="in" /></div>
					<div class="fld"><label>Time</label><input v-model="r.scheduled_time" type="time" class="in" /></div>
					<div class="fld"><label>Duration</label>
						<select v-model.number="r.duration_minutes" class="in"><option :value="30">30 min</option><option :value="45">45 min</option><option :value="60">60 min</option></select>
					</div>
				</div>
			</div>
			<button class="btn sm dash" type="button" @click="addRound">Add another round</button>
		</Dialog>

		<!-- create offer -->
		<Dialog :visible="off.show" title="Create and send offer" submit-label="Create and send offer" :loading="off.busy" @close="off.show = false" @submit="doOffer">
			<p class="sub top">The offer goes to the candidate from hr@ with a link to accept or decline. They have 7 days.</p>
			<div class="fld"><label>Designation <span class="req">*</span></label><input v-model="off.designation" class="in" placeholder="e.g. QA Engineer" /></div>
			<div class="grid">
				<div class="fld"><label>Annual CTC (₹) <span class="req">*</span></label><input v-model.number="off.annual_ctc" type="number" class="in num" placeholder="600000" /></div>
				<div class="fld"><label>Start date</label><input v-model="off.start_date" type="date" class="in" /></div>
			</div>
			<div class="fld"><label>Terms and notes</label><textarea v-model="off.terms" class="in ta" rows="4" placeholder="Probation, notice period, anything the candidate should know"></textarea></div>
		</Dialog>

		<!-- background check decision -->
		<Dialog :visible="bgd.show" :title="bgd.title" :submit-label="bgd.button" :loading="bgd.busy" @close="bgd.show = false" @submit="doBgvDecide">
			<p class="sub top">{{ bgd.note }}</p>
			<div class="fld" v-if="bgd.action !== 'Cleared'">
				<label>Reason <span class="req">*</span></label>
				<textarea v-model="bgd.notes" class="in ta" rows="3"></textarea>
			</div>
		</Dialog>

		<!-- complete onboarding -->
		<Dialog :visible="onb.show" title="Complete onboarding" submit-label="Create employee and send credentials" :loading="onb.busy" @close="onb.show = false" @submit="doOnboard">
			<p class="sub top">This creates the Employee record and emails the company address and temporary password to the candidate.</p>
			<div class="grid">
				<div class="fld"><label>Company <span class="req">*</span></label>
					<select v-model="onb.company" class="in"><option value="">Choose</option><option v-for="c in companies" :key="c" :value="c">{{ c }}</option></select>
				</div>
				<div class="fld"><label>Department</label>
					<select v-model="onb.department" class="in"><option value="">Choose</option><option v-for="d in departments" :key="d.name || d" :value="d.name || d">{{ d.name || d }}</option></select>
				</div>
				<div class="fld"><label>Company email <span class="req">*</span></label><input v-model="onb.company_email" class="in" placeholder="name@cozycornerpatios.com" /></div>
				<div class="fld"><label>Temporary password <span class="req">*</span></label><input v-model="onb.temp_password" class="in" /></div>
			</div>
		</Dialog>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';
import { shortDate, relative } from './utils/time.js';

// Stage of the board each stored status belongs to, plus what happens next.
// [lane, next step, needs an HR decision]
const STAGE = {
	'Applied': ['To screen', 'Shortlist or reject', true],
	'Under Screening': ['To screen', 'Shortlist or reject', true],
	'Shortlisted': ['Shortlisted', 'Schedule interviews', false],
	'Interview Scheduled': ['Interviews', 'Waiting on interviews', false],
	'Interview In Progress': ['Interviews', 'Waiting on interviews', false],
	'All Rounds Complete': ['Decide', 'Select or not', true],
	'Selected': ['Background check', 'Start background check', false],
	'BGV Initiated': ['Background check', 'Waiting on previous employers', false],
	'BGV Cleared': ['Offer', 'Create offer', true],
	'BGV Not Applicable': ['Offer', 'Create offer', true],
	'BGV Failed': ['Closed', 'Background check failed', false],
	'Offer Sent': ['Offer', 'Waiting on candidate', false],
	'Offer Accepted': ['Onboarding', 'Waiting on onboarding form', false],
	'Onboarding Initiated': ['Onboarding', 'Complete onboarding', true],
	'Onboarded': ['Joined', 'Joined', false],
	'Rejected at Screening': ['Closed', 'Rejected at screening', false],
	'Not Selected': ['Closed', 'Not selected', false],
	'Offer Declined': ['Closed', 'Declined the offer', false]
};
const LANES = ['To screen', 'Shortlisted', 'Interviews', 'Decide', 'Background check', 'Offer', 'Onboarding', 'Joined'];
const DECISION_LANES = { 'To screen': 1, 'Decide': 1, 'Offer': 1, 'Onboarding': 1 };

export default {
	name: 'CandidatesTab',
	components: { Badge, Dialog, DetailPanel, Toast },
	data() {
		return {
			LANES, DECISION_LANES,
			loading: true, candidates: [], jobs: [], interviewers: [], companies: [], departments: [],
			view: 'board', q: '', jobFilter: '', showClosed: false,
			showPanel: false, sel: null, detail: null, bgv: null, tab: 'summary',
			conf: { show: false, to: '', title: '', note: '', button: '', busy: false },
			sch: { show: false, rounds: [], busy: false },
			off: { show: false, designation: '', annual_ctc: 0, start_date: '', terms: '', busy: false },
			bgd: { show: false, action: '', title: '', note: '', button: '', notes: '', busy: false },
			onb: { show: false, company: '', department: '', company_email: '', temp_password: '', busy: false },
			toast: { show: false, msg: '', type: 'success' }
		};
	},
	computed: {
		lanes() { return this.showClosed ? LANES.concat(['Closed']) : LANES; },
		tabs() {
			return [
				{ key: 'summary', label: 'Summary' },
				{ key: 'interviews', label: 'Interviews' },
				{ key: 'bgv', label: 'Background check' },
				{ key: 'offer', label: 'Offer and joining' }
			];
		},
		filtered() {
			const q = this.q.trim().toLowerCase();
			return this.candidates.filter(c => {
				if (this.jobFilter && c.job_opening !== this.jobFilter) return false;
				if (!q) return true;
				return [c.applicant_name, c.email].join(' ').toLowerCase().includes(q);
			});
		},
		closed() { return this.filtered.filter(c => this.laneOf(c) === 'Closed'); },
		listRows() { return this.showClosed ? this.filtered : this.filtered.filter(c => this.laneOf(c) !== 'Closed'); },
		cand() { return (this.detail && this.detail.candidate) || {}; },
		offer() { return (this.detail && this.detail.offer) || null; },
		onboarding() { return (this.detail && this.detail.onboarding) || null; },
		interviews() { return (this.detail && this.detail.interviews) || []; },
		bgvFormUrl() {
			if (!this.bgv || !this.bgv.access_token) return '';
			return window.location.origin + '/bgv-form?token=' + this.bgv.access_token;
		},
		// Only the steps that make sense from the current status, matching what the server allows.
		actions() {
			const c = this.cand;
			if (!c.status) return [];
			const a = [];
			const st = c.status;
			if (['Applied', 'Under Screening'].includes(st)) {
				a.push({ label: 'Reject', cls: 'dan', run: () => this.askStatus('Rejected at Screening') });
				a.push({ label: 'Shortlist', cls: 'pri', run: () => this.askStatus('Shortlisted') });
			} else if (st === 'Shortlisted') {
				a.push({ label: 'Reject', cls: 'dan', run: () => this.askStatus('Rejected at Screening') });
				a.push({ label: 'Schedule interviews', cls: 'pri', run: () => this.openSchedule() });
			} else if (['Interview Scheduled', 'Interview In Progress'].includes(st)) {
				a.push({ label: 'Not selected', cls: 'dan', run: () => this.askStatus('Not Selected') });
			} else if (st === 'All Rounds Complete') {
				a.push({ label: 'Not selected', cls: 'dan', run: () => this.askStatus('Not Selected') });
				a.push({ label: 'Select', cls: 'pri', run: () => this.askStatus('Selected') });
			} else if (st === 'Selected' && !this.bgv) {
				a.push({ label: 'Start background check', cls: 'pri', run: () => this.startBgv() });
			} else if (this.bgv && this.bgv.status === 'Ready for HR Review') {
				a.push({ label: 'Fail', cls: 'dan', run: () => this.askBgv('Failed') });
				a.push({ label: 'Waive', cls: '', run: () => this.askBgv('Not Applicable') });
				a.push({ label: 'Clear', cls: 'pri', run: () => this.askBgv('Cleared') });
			} else if (['BGV Cleared', 'BGV Not Applicable'].includes(st) && !this.offer) {
				a.push({ label: 'Create offer', cls: 'pri', run: () => this.openOffer() });
			} else if (st === 'Onboarding Initiated' && this.onboarding && this.onboarding.status === 'Submitted') {
				a.push({ label: 'Complete onboarding', cls: 'pri', run: () => this.openOnboard() });
			}
			return a;
		}
	},
	mounted() {
		this.load();
		this.api('wf_get_job_openings').then(j => { this.jobs = j || []; }).catch(() => {});
	},
	methods: {
		api(method, args = {}) {
			return new Promise((resolve, reject) => {
				frappe.call({ method, args, callback: r => resolve(r.message), error: reject });
			});
		},
		quiet(method, args = {}) { return this.api(method, args).catch(() => null); },
		notify(msg, type = 'success') { this.toast = { show: true, msg, type }; },
		async load() {
			const rows = await this.quiet('wf_get_dashboard_data');
			this.candidates = rows || [];
			this.loading = false;
		},
		laneOf(c) { return (STAGE[c.status] || ['Closed'])[0]; },
		nextStep(c) { return (STAGE[c.status] || ['', c.status])[1]; },
		isDecision(c) { return !!(STAGE[c.status] || [])[2]; },
		inLane(lane) { return this.filtered.filter(c => this.laneOf(c) === lane); },
		journeyClass(i) {
			const now = LANES.indexOf(this.laneOf(this.cand));
			if (now < 0) return '';
			return i < now ? 'done' : (i === now ? 'now' : '');
		},
		scoreText(c) { return c.ai_score ? c.ai_score + (c.ai_grade ? ' ' + c.ai_grade : '') : '—'; },
		scoreClass(c) { return c.ai_score ? 's-' + (c.ai_grade || 'X') : 's-none'; },
		shortDate(d) { return shortDate(d); },
		rel(d) { return relative(d); },
		money(v) { return v ? '₹ ' + Number(v).toLocaleString('en-IN') : '—'; },
		copy(text) {
			if (navigator.clipboard) navigator.clipboard.writeText(text);
			this.notify('Link copied.');
		},

		async open(c) {
			this.sel = c; this.detail = null; this.bgv = null; this.tab = 'summary'; this.showPanel = true;
			await this.refresh(c.name);
		},
		async refresh(name) {
			const [detail, bgvRes] = await Promise.all([
				this.quiet('wf_get_candidate_detail', { applicant: name }),
				this.quiet('wf_get_bgv_checks', { applicant: name })
			]);
			this.detail = detail;
			this.bgv = (bgvRes && bgvRes.check) || null;
			if (!this.interviewers.length) this.loadLists();
		},
		async loadLists() {
			const [users, comps, deps] = await Promise.all([
				this.quiet('frappe.client.get_list', { doctype: 'User', fields: ['name', 'full_name'], filters: { enabled: 1, user_type: 'System User' }, limit_page_length: 0, order_by: 'full_name asc' }),
				this.quiet('wf_get_companies'), this.quiet('wf_get_departments')
			]);
			this.interviewers = users || [];
			this.companies = comps || [];
			this.departments = deps || [];
		},
		closePanel() { this.showPanel = false; this.sel = null; this.detail = null; this.bgv = null; },

		askStatus(to) {
			const name = this.cand.applicant_name;
			const map = {
				'Shortlisted': ['Shortlist ' + name + '?', 'They move on to interviews.', 'Shortlist'],
				'Rejected at Screening': ['Reject ' + name + '?', 'They leave the pipeline. You can still see them under closed.', 'Reject'],
				'Selected': ['Select ' + name + '?', 'The background check can then be started.', 'Select'],
				'Not Selected': ['Mark ' + name + ' as not selected?', 'They leave the pipeline.', 'Confirm']
			}[to];
			this.conf = { show: true, to, title: map[0], note: map[1], button: map[2], busy: false };
		},
		async doStatus() {
			this.conf.busy = true;
			try {
				await this.api('wf_update_applicant_status', { applicant_name: this.cand.name, status: this.conf.to });
				this.notify('Updated.');
				this.conf.show = false;
				await this.refresh(this.cand.name);
				await this.load();
			} catch (e) { /* frappe shows the reason */ }
			this.conf.busy = false;
		},

		openSchedule() {
			const tpl = (this.jobs.find(j => j.name === this.cand.job_opening) || {}).interview_template;
			this.sch = { show: true, rounds: [], busy: false };
			if (tpl) {
				this.quiet('wf_get_interview_templates').then(list => {
					const t = (list || []).find(x => x.name === tpl);
					const rounds = (t && t.rounds) || [];
					this.sch.rounds = rounds.length ? rounds.map(r => ({
						round_name: r.round_name || '', interviewer: r.default_interviewer || '',
						scheduled_date: '', scheduled_time: '11:00', duration_minutes: r.duration || 45
					})) : [this.blankRound()];
				});
			} else {
				this.sch.rounds = [this.blankRound()];
			}
		},
		blankRound() { return { round_name: 'Round ' + (this.sch.rounds.length + 1), interviewer: '', scheduled_date: '', scheduled_time: '11:00', duration_minutes: 45 }; },
		addRound() { this.sch.rounds.push(this.blankRound()); },
		async doSchedule() {
			const bad = this.sch.rounds.filter(r => !r.scheduled_date || !r.interviewer);
			if (bad.length) { this.notify('Every round needs a date and an interviewer.', 'error'); return; }
			this.sch.busy = true;
			try {
				await this.api('wf_schedule_interviews', { data: { applicant: this.cand.name, rounds: this.sch.rounds } });
				this.notify('Interviews scheduled. Invites sent from hr@.');
				this.sch.show = false;
				await this.refresh(this.cand.name);
				await this.load();
				this.tab = 'interviews';
			} catch (e) { /* shown by frappe */ }
			this.sch.busy = false;
		},

		async startBgv() {
			try {
				const res = await this.api('wf_start_bgv', { data: { applicant: this.cand.name } });
				this.notify((res && res.message) || 'Background check started.');
				await this.refresh(this.cand.name);
				await this.load();
				this.tab = 'bgv';
			} catch (e) { /* shown by frappe */ }
		},
		askBgv(action) {
			const map = {
				'Cleared': ['Clear the background check?', 'The offer letter can then be issued.', 'Clear'],
				'Failed': ['Fail the background check?', 'No offer will be issued for this candidate.', 'Fail'],
				'Not Applicable': ['Waive the background check?', 'Use this for freshers, or when the employer no longer exists.', 'Waive']
			}[action];
			this.bgd = { show: true, action, title: map[0], note: map[1], button: map[2], notes: '', busy: false };
		},
		async doBgvDecide() {
			if (this.bgd.action !== 'Cleared' && !this.bgd.notes.trim()) { this.notify('Please give a reason.', 'error'); return; }
			this.bgd.busy = true;
			try {
				const res = await this.api('wf_bgv_hr_decide', { data: { bgv: this.bgv.name, action: this.bgd.action, notes: this.bgd.notes.trim() } });
				this.notify((res && res.message) || 'Recorded.');
				this.bgd.show = false;
				await this.refresh(this.cand.name);
				await this.load();
			} catch (e) { /* shown by frappe */ }
			this.bgd.busy = false;
		},

		openOffer() {
			this.off = { show: true, designation: this.detail.position.title || '', annual_ctc: 0, start_date: '', terms: '', busy: false };
		},
		async doOffer() {
			if (!this.off.designation.trim()) { this.notify('Designation is needed.', 'error'); return; }
			if (!this.off.annual_ctc || this.off.annual_ctc <= 0) { this.notify('Enter the annual CTC.', 'error'); return; }
			this.off.busy = true;
			try {
				const res = await this.api('wf_create_offer', {
					data: {
						applicant: this.cand.name, designation: this.off.designation.trim(),
						annual_ctc: this.off.annual_ctc, start_date: this.off.start_date, terms: this.off.terms
					}
				});
				this.notify((res && res.message) || 'Offer sent.');
				this.off.show = false;
				await this.refresh(this.cand.name);
				await this.load();
				this.tab = 'offer';
			} catch (e) { /* shown by frappe */ }
			this.off.busy = false;
		},

		openOnboard() {
			this.onb = { show: true, company: '', department: '', company_email: '', temp_password: '', busy: false };
		},
		async doOnboard() {
			for (const f of [['company', 'company'], ['company_email', 'company email'], ['temp_password', 'temporary password']]) {
				if (!String(this.onb[f[0]] || '').trim()) { this.notify('Please fill the ' + f[1] + '.', 'error'); return; }
			}
			this.onb.busy = true;
			try {
				const res = await this.api('wf_complete_onboarding', {
					data: {
						applicant: this.cand.name, company: this.onb.company, department: this.onb.department,
						company_email: this.onb.company_email.trim(), temp_password: this.onb.temp_password
					}
				});
				this.notify((res && res.message) || 'Onboarding complete.');
				this.onb.show = false;
				await this.refresh(this.cand.name);
				await this.load();
			} catch (e) { /* shown by frappe */ }
			this.onb.busy = false;
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
.seg button { border: 0; background: transparent; height: 32px; padding: 0 14px; border-radius: 7px; font: inherit; font-weight: 500; color: var(--wf-mut); cursor: pointer; }
.seg button.on { background: var(--wf-primary-tint); color: var(--wf-primary-2); }
.filters { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; margin-bottom: 16px; }
.filters .in { width: auto; }
.search { flex: 1 1 260px; min-width: 220px; max-width: 460px; }
.sel { flex: 0 0 auto; min-width: 210px; }
.chip { height: 40px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-mut); font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer; }
.chip.on { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.chip .c { opacity: .7; margin-left: 3px; }
.board { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(220px, 1fr); gap: 14px; overflow-x: auto; padding-bottom: 10px; }
.lane { background: #ECEEF6; border-radius: 12px; padding: 10px; min-height: 300px; }
.lane-h { display: flex; align-items: center; gap: 8px; padding: 4px 6px 10px; font-weight: 600; font-size: 13.5px; color: var(--wf-ink); }
.lane-h .c { margin-left: auto; color: var(--wf-mut); font-weight: 500; }
.dm { width: 8px; height: 8px; transform: rotate(45deg); border: 2px solid var(--wf-amber); border-radius: 2px; }
.card { display: block; width: 100%; text-align: left; background: #fff; border: 1px solid var(--wf-line); border-radius: 10px; padding: 12px 13px; margin-bottom: 8px; font: inherit; cursor: pointer; }
.card:hover { border-color: #C7D2FE; }
.card.dec { box-shadow: inset 3px 0 0 var(--wf-amber); }
.nm { font-weight: 600; color: var(--wf-ink); }
.ps { font-size: 12.5px; color: var(--wf-mut); margin: 2px 0 0; }
.nx { font-size: 12.5px; color: var(--wf-mut); margin: 4px 0 10px; }
.nx.dec { color: var(--wf-amber-ink); font-weight: 600; }
.rw { display: flex; align-items: center; gap: 8px; }
.rw .sp { flex: 1; }
.none { font-size: 12.5px; color: var(--wf-mut); padding: 6px; }
.panel { background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; overflow: hidden; }
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
.sub.warn { color: var(--wf-amber-ink); }
.decw { color: var(--wf-amber-ink); font-weight: 600; }
.num { font-variant-numeric: tabular-nums; }
.score { display: inline-grid; place-items: center; min-width: 44px; height: 24px; padding: 0 8px; border-radius: 6px; font-size: 12px; font-weight: 700; }
.s-A { background: var(--wf-ok-tint); color: var(--wf-ok); }
.s-B { background: var(--wf-primary-tint); color: var(--wf-primary-2); }
.s-C, .s-D { background: var(--wf-hold-tint); color: var(--wf-hold); }
.s-X, .s-none { background: #F3F4F6; color: var(--wf-mut); font-weight: 600; }
.empty { text-align: center; padding: 44px 20px; }
.empty h3 { margin: 0 0 6px; font-size: 17px; font-weight: 600; }
.empty p { margin: 0 auto; color: var(--wf-mut); max-width: 48ch; }
.pills { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.dtabs { display: flex; gap: 4px; flex-wrap: wrap; margin: 0 0 20px; }
.dtabs button { border: 0; background: transparent; height: 34px; padding: 0 12px; border-radius: 8px; font: inherit; font-weight: 500; color: var(--wf-mut); cursor: pointer; }
.dtabs button.on { background: var(--wf-primary-tint); color: var(--wf-primary-2); }
.note { background: var(--wf-amber-tint); color: var(--wf-amber-ink); border-radius: 10px; padding: 10px 14px; font-size: 13.5px; margin-bottom: 18px; }
.note.info { background: var(--wf-primary-tint); color: var(--wf-primary-2); }
.note.lock { background: var(--wf-line-2); color: var(--wf-mut); border: 1px dashed var(--wf-line); }
.ai { display: flex; gap: 16px; align-items: flex-start; border: 1px solid var(--wf-line); border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; }
.ring { display: grid; place-items: center; width: 70px; height: 70px; border-radius: 50%; font-size: 20px; font-weight: 700; flex: none; }
.ring em { display: block; font-style: normal; font-size: 10.5px; font-weight: 500; }
.ai p { margin: 4px 0 0; }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin: 0 0 20px; }
.kv.small { margin: 10px 0 12px; }
.kv dt { font-size: 12.5px; color: var(--wf-mut-2); }
.kv dd { margin: 2px 0 0; font-weight: 500; word-break: break-word; }
.sec { margin-bottom: 20px; }
.sec h4 { margin: 0 0 8px; font-size: 13.5px; font-weight: 600; }
.sec p { margin: 0 0 4px; }
.pre { white-space: pre-wrap; }
.fb { margin-top: 6px; font-size: 13px; color: var(--wf-ink-2); }
.box { border: 1px solid var(--wf-line); border-radius: 12px; padding: 14px 16px; margin-bottom: 10px; }
.box-top { display: flex; align-items: center; gap: 10px; margin-bottom: 4px; }
.box-top b { flex: 1; }
.copyrow { display: flex; gap: 8px; margin-top: 8px; }
.tl { list-style: none; margin: 0; padding: 0; }
.tl li { position: relative; padding: 0 0 16px 30px; }
.tl li::before { content: ""; position: absolute; left: 8px; top: 20px; bottom: -2px; width: 2px; background: var(--wf-line); }
.tl li:last-child::before { display: none; }
.tl .dot { position: absolute; left: 0; top: 3px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--wf-line); background: #fff; }
.tl li.done .dot { background: var(--wf-ok-dot); border-color: var(--wf-ok-dot); }
.tl li.done::before { background: var(--wf-ok-dot); }
.tl li.now .dot { border-color: var(--wf-amber); box-shadow: 0 0 0 4px var(--wf-amber-tint); }
.tl li.stop .dot { background: var(--wf-bad); border-color: var(--wf-bad); }
.tl b { display: block; font-weight: 600; }
.gt { display: inline-flex; margin-left: 6px; font-style: normal; font-size: 11.5px; font-weight: 600; color: var(--wf-amber-ink); background: var(--wf-amber-tint); padding: 1px 7px; border-radius: 5px; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
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
.btn.dash { border-style: dashed; color: var(--wf-primary-2); background: transparent; }
@media (max-width: 860px) {
	.hs { display: none; }
	.kv, .grid { grid-template-columns: 1fr; }
}
</style>