<template>
	<div class="ov">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="head">
			<div>
				<h1>{{ greeting }}, {{ firstName }}</h1>
				<p>{{ subtitle }}</p>
			</div>
			<button v-if="!isManagerView" class="btn" type="button" @click="$emit('go', 'positions')">All positions</button>
			<button v-else class="btn pri" type="button" @click="$emit('go', 'requisitions')">Raise requisition</button>
		</div>

		<div v-if="loading" class="empty"><p>Loading…</p></div>

		<template v-else>
			<!-- KPI cards, clickable -->
			<div class="kpis" :style="{ gridTemplateColumns: 'repeat(' + Math.min(6, kpis.length) + ', minmax(0, 1fr))' }">
				<KpiCard v-for="k in kpis" :key="k.key" :label="k.label" :value="k.value" :sub="k.sub" :decision="!!k.decision" clickable @click="openKpi(k)" />
			</div>

			<!-- decisions -->
			<template v-if="decisions.length">
				<div class="sec-h"><h2>Needs your decision</h2><span>{{ decisions.length }}</span></div>
				<div class="cards">
					<article v-for="d in decisions" :key="d.key" class="card">
						<div class="kind">{{ d.kind }}</div>
						<h3>{{ d.title }}</h3>
						<div class="ctx">{{ d.ctx }}</div>
						<div class="facts" v-if="d.facts.length">
							<span v-for="f in d.facts" :key="f.label" class="fact">{{ f.label }} <b>{{ f.value }}</b></span>
						</div>
						<div class="foot">
							<span v-if="d.wait" class="wait">{{ d.wait }}</span>
							<div class="foot-r">
								<button v-for="a in d.actions" :key="a.label" class="btn sm" :class="{ pri: a.primary }" type="button" @click="a.run()">{{ a.label }}</button>
							</div>
						</div>
					</article>
				</div>
			</template>
			<div v-else class="panel note-empty">
				<h3>Nothing needs you right now</h3>
				<p>{{ isManagerView ? routeNote : 'New decisions appear here the moment they reach you.' }}</p>
			</div>

			<!-- waiting on others -->
			<template v-if="waiting.length">
				<div class="sec-h"><h2>Waiting on others</h2><span>No action for you</span></div>
				<div class="waits">
					<button v-for="w in waiting" :key="w.name" class="wait-card" type="button" @click="$emit('open-requisition', w)">
						<div class="kind grey">{{ w.whereText }}</div>
						<b>{{ w.title }}</b>
						<div class="sub">Raised by {{ w.requester_full_name || w.requester }}</div>
						<div v-if="w.dayText" class="bar-row">
							<span class="bar"><i :class="{ late: w.days_pending > 7 }" :style="{ width: Math.min(100, (w.days_pending / 7) * 100) + '%' }"></i></span>
							<span class="sub">{{ w.dayText }}</span>
						</div>
					</button>
				</div>
			</template>

			<!-- bottom -->
			<div class="grid2">
				<section class="panel">
					<div class="p-head">
						<h2>{{ isManagerView ? 'Your positions' : 'Live positions' }}</h2>
						<span class="sub">{{ livePositions.length }}</span>
						<button v-if="!isManagerView" class="btn sm ghost" type="button" @click="$emit('go', 'positions')">See all</button>
					</div>
					<table v-if="livePositions.length" class="t">
						<thead><tr><th>Position</th><th class="hs">Owner</th><th>Candidates</th><th>Status</th></tr></thead>
						<tbody>
							<tr v-for="p in livePositions" :key="p.name" @click="openPosition(p)">
								<td><div class="ttl">{{ p.job_title }}</div><div class="sub">{{ p.department || '—' }}</div></td>
								<td class="hs">{{ p.assigned_hr_name || p.owner_name || 'No owner' }}</td>
								<td class="num">{{ p.applicant_count != null ? p.applicant_count : (p.candidate_count || 0) }}</td>
								<td><Badge :label="p.status" /></td>
							</tr>
						</tbody>
					</table>
					<div v-else class="empty small"><p>{{ isManagerView ? 'Positions appear here once your requests are published.' : 'No live positions.' }}</p></div>
				</section>

				<div class="stack">
					<section v-if="isManagerView && myInterviews.length" class="panel">
						<div class="p-head"><h2>Your interviews</h2><span class="sub">{{ myInterviews.length }}</span></div>
						<div class="p-body">
							<div v-for="iv in myInterviews.slice(0, 5)" :key="iv.name" class="row">
								<div class="num when">{{ shortDate(iv.scheduled_date) }}<span>{{ (iv.scheduled_time || '').slice(0, 5) }}</span></div>
								<div class="grow"><b>{{ iv.applicant_name }}</b><div class="sub">{{ iv.job_title }}, round {{ iv.round_number }}</div></div>
								<Badge :label="iv.status" />
							</div>
						</div>
					</section>

					<section v-if="!isManagerView && worthALook.length" class="panel">
						<div class="p-head"><h2>Worth a look</h2></div>
						<div class="p-body">
							<div v-for="w in worthALook" :key="w.key" class="row">
								<div class="grow"><b>{{ w.title }}</b><div class="sub">{{ w.detail }}</div></div>
								<button class="btn sm" type="button" @click="w.run()">{{ w.action }}</button>
							</div>
						</div>
					</section>

					<section v-if="isManagerView && sharedCount" class="panel">
						<div class="p-head"><h2>Shared profiles</h2><span class="sub">{{ sharedCount }} waiting</span></div>
						<div class="p-body">
							<p class="sub">HR has shared {{ sharedCount }} profile{{ sharedCount > 1 ? 's' : '' }} for your positions.</p>
							<button class="btn sm" type="button" @click="$emit('go', 'shared')">Open shared profiles</button>
						</div>
					</section>
				</div>
			</div>
		</template>

		<!-- KPI detail -->
		<DetailPanel :visible="!!kpi" :title="kpi ? kpi.label : ''" @close="kpi = null">
			<template v-if="kpi">
				<p class="sub top">{{ kpi.sub }}</p>
				<div v-if="!kpiRows.length" class="empty"><h3>All clear</h3><p>Nothing here right now.</p></div>
				<div v-for="r in kpiRows" :key="r.id" class="row">
					<div class="grow"><b>{{ r.title }}</b><div class="sub">{{ r.detail }}</div></div>
					<Badge v-if="r.badge" :label="r.badge" />
					<button v-if="r.action" class="btn sm" type="button" @click="r.action()">{{ r.actionLabel }}</button>
				</div>
			</template>
		</DetailPanel>

		<!-- publish + assign -->
		<Dialog :visible="pub.show" title="Publish and assign" submit-label="Publish and assign" :loading="pub.busy" @close="pub.show = false" @submit="doPublish">
			<div v-if="pub.req" class="pub-head">
				<b>{{ pub.req.title }}</b>
				<div class="sub">{{ pub.req.team }} · {{ pub.req.number_of_openings }} opening{{ pub.req.number_of_openings > 1 ? 's' : '' }} · {{ pub.req.employment_type }}</div>
			</div>
			<div class="fld">
				<label>Who owns this position <span class="req">*</span></label>
				<select v-model="pub.owner" class="in">
					<option value="">Choose</option>
					<optgroup label="Recruitment coordinators">
						<option v-for="u in owners.recruitment_coordinators" :key="u.email" :value="u.email">{{ u.full_name }}</option>
					</optgroup>
					<optgroup label="HR managers">
						<option v-for="u in owners.hr_managers" :key="u.email" :value="u.email">{{ u.full_name }}</option>
					</optgroup>
				</select>
				<div class="hint">They see every candidate for this position and get an email now.</div>
			</div>
			<div class="fld">
				<label>Priority</label>
				<div class="seg">
					<button v-for="p in ['High', 'Medium', 'Low']" :key="p" type="button" :class="{ on: pub.priority === p }" @click="pub.priority = p">{{ p }}</button>
				</div>
			</div>
			<div class="fld">
				<label>Interview template</label>
				<select v-model="pub.template" class="in">
					<option value="">Choose later</option>
					<option v-for="t in templates" :key="t.name" :value="t.name">{{ t.template_name || t.name }}</option>
				</select>
			</div>
		</Dialog>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import KpiCard from './shared/KpiCard.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';
import { serverDate, relative, shortDate } from './utils/time.js';

const IN_PROGRESS = ['Draft', 'Pending CMO Approval', 'Pending Approval', 'Needs Revision', 'Approved'];

export default {
	name: 'OverviewTab',
	components: { Badge, KpiCard, Dialog, DetailPanel, Toast },
	emits: ['go', 'open-position', 'open-requisition'],
	data() {
		return {
			loading: true,
			roles: [],
			reqs: [], positions: [], interviews: [], candidates: [], shared: [],
			owners: { recruitment_coordinators: [], hr_managers: [] },
			templates: [],
			kpi: null,
			pub: { show: false, req: null, owner: '', priority: 'Medium', template: '', busy: false },
			toast: { show: false, msg: '', type: 'success' }
		};
	},
	computed: {
		isHR() { return this.roles.includes('WF HR Manager') || this.roles.includes('WF Admin'); },
		isCMO() { return this.roles.includes('WF CMO'); },
		isManagerView() { return !this.isHR; },
		me() { return (window.frappe && frappe.session && frappe.session.user) || ''; },
		firstName() {
			const n = (window.frappe && frappe.session && (frappe.session.user_fullname || frappe.session.user)) || '';
			return n.split(' ')[0].split('@')[0];
		},
		greeting() {
			const h = new Date().getHours();
			return h < 12 ? 'Good morning' : (h < 17 ? 'Good afternoon' : 'Good evening');
		},
		subtitle() {
			if (this.loading) return '';
			if (this.isManagerView) {
				return this.isCMO
					? 'Your team’s hiring at a glance: what needs your approval, where every request is, and how each position is moving.'
					: 'Your hiring at a glance: where each request is, and how your positions are moving.';
			}
			const n = this.decisions.length;
			return n ? n + ' decision' + (n > 1 ? 's are' : ' is') + ' waiting on you. Everything else is moving on its own.'
				: 'Nothing is waiting on you right now.';
		},
		routeNote() {
			return this.isCMO
				? 'Your requests go straight to Priyesh sir; once approved, HR publishes them.'
				: 'Your requests go to your approver first, then Priyesh sir; once approved, HR publishes them.';
		},

		myReqs() { return this.reqs.filter(r => r.requester === this.me); },
		teamReqs() { return this.reqs.filter(r => r.requester !== this.me); },
		byStatus() {
			const m = {};
			this.reqs.forEach(r => { m[r.status] = (m[r.status] || 0) + 1; });
			return m;
		},
		livePositions() { return this.positions.filter(p => p.status !== 'Closed'); },
		toScreen() { return this.candidates.filter(c => ['Applied', 'Under Screening'].includes(c.status)); },
		toDecide() { return this.candidates.filter(c => c.status === 'All Rounds Complete'); },
		toOffer() { return this.candidates.filter(c => ['BGV Cleared', 'BGV Not Applicable'].includes(c.status)); },
		toOnboard() { return this.candidates.filter(c => c.status === 'Onboarding Initiated'); },
		readyToPublish() { return this.reqs.filter(r => r.status === 'Approved'); },
		myInterviews() { return this.interviews.filter(iv => iv.status === 'Scheduled'); },
		sharedCount() { return this.shared.filter(p => !p.manager_response).length; },

		kpis() {
			if (this.isManagerView) {
				const k = [];
				if (this.isCMO) {
					const q = this.teamReqs.filter(r => r.status === 'Pending CMO Approval');
					k.push({ key: 'cmo-queue', label: 'Waiting on your approval', value: q.length, sub: 'From your team', decision: true });
				}
				const back = this.myReqs.filter(r => r.status === 'Needs Revision');
				k.push({ key: 'my-back', label: 'Back with you', value: back.length, sub: 'Changes requested on your request', decision: true });
				const prog = this.myReqs.filter(r => IN_PROGRESS.includes(r.status) && r.status !== 'Needs Revision');
				k.push({ key: 'my-progress', label: 'Requests in progress', value: prog.length, sub: this.progressSub(this.myReqs) });
				if (this.isCMO) {
					const tp = this.teamReqs.filter(r => ['Pending Approval', 'Approved', 'Needs Revision', 'Draft'].includes(r.status));
					k.push({ key: 'team-progress', label: 'Team requests moving', value: tp.length, sub: this.progressSub(this.teamReqs) });
				}
				k.push({ key: 'live', label: 'Your live positions', value: this.livePositions.length, sub: this.liveSub() });
				k.push({ key: 'pipeline', label: 'Candidates in pipeline', value: this.pipelineTotal(), sub: 'Across your positions' });
				if (!this.isCMO) k.push({ key: 'shared', label: 'Profiles shared with you', value: this.sharedCount, sub: 'Waiting for your answer', decision: this.sharedCount > 0 });
				return k.slice(0, 6);
			}
			const pendingCmo = this.byStatus['Pending CMO Approval'] || 0;
			const pendingLead = this.byStatus['Pending Approval'] || 0;
			return [
				{ key: 'review', label: 'Awaiting HR review', value: this.readyToPublish.length, sub: 'Approved, ready to publish', decision: true },
				{ key: 'pending', label: 'Pending approval', value: pendingCmo + pendingLead, sub: pendingCmo + ' with CMO, ' + pendingLead + ' with leadership' },
				{ key: 'screen', label: 'New candidates', value: this.toScreen.length, sub: 'Waiting to be screened', decision: true },
				{ key: 'live', label: 'Live positions', value: this.livePositions.length, sub: this.liveSub() },
				{ key: 'interviews', label: 'Upcoming interviews', value: this.myInterviews.length, sub: 'Scheduled from today' },
				{ key: 'closed', label: 'Filled / closed', value: this.positions.filter(p => p.status === 'Closed').length, sub: 'No longer hiring' }
			];
		},

		decisions() {
			const d = [];
			if (this.isManagerView) {
				if (this.isCMO) {
					this.teamReqs.filter(r => r.status === 'Pending CMO Approval').forEach(r => d.push({
						key: 'a' + r.name, kind: 'Approve, then it goes to Priyesh sir', title: r.title,
						ctx: 'Raised by ' + (r.requester_full_name || r.requester) + ' on ' + shortDate(r.creation),
						facts: this.reqFacts(r), wait: this.dayText(r),
						actions: [
							{ label: 'Details', run: () => this.$emit('open-requisition', r) },
							{ label: 'Open approvals', primary: true, run: () => this.$emit('go', 'cmo-approvals') }
						]
					}));
				}
				this.myReqs.filter(r => r.status === 'Needs Revision').forEach(r => d.push({
					key: 'r' + r.name, kind: 'Changes requested', title: r.title,
					ctx: r.leadership_comment || 'See the comment on the request.', facts: [],
					actions: [{ label: 'Edit and resubmit', primary: true, run: () => this.$emit('open-requisition', r) }]
				}));
				if (this.sharedCount) d.push({
					key: 'shared', kind: 'Profiles shared with you', title: this.sharedCount + ' profile' + (this.sharedCount > 1 ? 's' : ''),
					ctx: 'HR wants to know if these could fit your positions.', facts: [],
					actions: [{ label: 'Review profiles', primary: true, run: () => this.$emit('go', 'shared') }]
				});
				return d;
			}
			this.readyToPublish.forEach(r => d.push({
				key: 'p' + r.name, kind: 'Publish and assign', title: r.title,
				ctx: 'Raised by ' + (r.requester_full_name || r.requester) + (r.leadership_decision_on ? ', approved on ' + shortDate(r.leadership_decision_on) : ''),
				facts: this.reqFacts(r),
				wait: r.leadership_decision_on ? 'Approved ' + relative(r.leadership_decision_on) : '',
				actions: [
					{ label: 'Review', run: () => this.$emit('open-requisition', r) },
					{ label: 'Publish and assign', primary: true, run: () => this.openPublish(r) }
				]
			}));
			if (this.toDecide.length) d.push({
				key: 'decide', kind: 'Select or not', title: this.toDecide.length + ' candidate' + (this.toDecide.length > 1 ? 's' : '') + ' finished all rounds',
				ctx: 'Interview feedback is in. You decide who moves on.', facts: [],
				actions: [{ label: 'Open candidates', primary: true, run: () => this.$emit('go', 'candidates') }]
			});
			if (this.toOffer.length) d.push({
				key: 'offer', kind: 'Create offer', title: this.toOffer.length + ' cleared background check',
				ctx: 'An offer can now be issued.', facts: [],
				actions: [{ label: 'Open candidates', primary: true, run: () => this.$emit('go', 'candidates') }]
			});
			if (this.toOnboard.length) d.push({
				key: 'onboard', kind: 'Complete onboarding', title: this.toOnboard.length + ' onboarding form' + (this.toOnboard.length > 1 ? 's' : '') + ' back',
				ctx: 'Create the employee record and send credentials.', facts: [],
				actions: [{ label: 'Open candidates', primary: true, run: () => this.$emit('go', 'candidates') }]
			});
			if (this.toScreen.length) {
				const top = this.toScreen.slice().sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0))[0];
				d.push({
					key: 'screen', kind: 'Shortlist or reject', title: this.toScreen.length + ' new candidate' + (this.toScreen.length > 1 ? 's' : ''),
					ctx: 'AI scores are ready. You decide who moves on.',
					facts: [
						{ label: 'Positions', value: String(new Set(this.toScreen.map(c => c.job_opening)).size) },
						top && top.ai_score ? { label: 'Top score', value: top.ai_score + (top.ai_grade ? ' ' + top.ai_grade : '') } : null
					].filter(Boolean),
					actions: [{ label: 'Screen now', primary: true, run: () => this.$emit('go', 'candidates') }]
				});
			}
			return d;
		},

		waiting() {
			// things moving elsewhere; never the ones already in "Needs your decision"
			const mine = this.decisions.map(d => d.key);
			const rows = this.reqs.filter(r => {
				if (mine.indexOf('a' + r.name) >= 0 || mine.indexOf('r' + r.name) >= 0 || mine.indexOf('p' + r.name) >= 0) return false;
				if (['Pending Approval', 'Pending CMO Approval'].includes(r.status)) return true;
				return this.isHR && r.status === 'Needs Revision';
			});
			return rows.map(r => Object.assign({}, r, {
				whereText: r.status === 'Pending CMO Approval' ? 'With the CMO'
					: r.status === 'Pending Approval' ? 'With leadership'
					: 'Back with ' + (r.requester_full_name || r.requester),
				dayText: this.dayText(r)
			}));
		},

		worthALook() {
			const out = [];
			const filled = this.positions.filter(p => p.status !== 'Closed' && (p.filled_count || 0) >= (p.no_of_positions || 1));
			filled.forEach(p => out.push({
				key: 'f' + p.name, title: p.job_title,
				detail: 'Looks filled: ' + p.filled_count + ' of ' + (p.no_of_positions || 1) + ' accepted or joined',
				action: 'Review', run: () => this.openPosition(p)
			}));
			const unowned = this.positions.filter(p => !p.assigned_hr && p.status !== 'Closed');
			if (unowned.length) out.push({
				key: 'unowned', title: unowned.length + ' position' + (unowned.length > 1 ? 's' : '') + ' without an owner',
				detail: unowned.map(p => p.job_title).join(', '),
				action: 'Assign', run: () => this.$emit('go', 'positions')
			});
			return out;
		},

		kpiRows() {
			if (!this.kpi) return [];
			const k = this.kpi.key;
			const reqRow = r => ({
				id: r.name, title: r.title,
				detail: (r.requester === this.me ? 'Your request' : 'Raised by ' + (r.requester_full_name || r.requester)) + ', ' + shortDate(r.creation),
				badge: r.status, actionLabel: 'Open', action: () => { this.kpi = null; this.$emit('open-requisition', r); }
			});
			const posRow = p => ({
				id: p.name, title: p.job_title,
				detail: (p.assigned_hr_name || p.owner_name || 'No owner') + ', ' + (p.applicant_count != null ? p.applicant_count : (p.candidate_count || 0)) + ' candidates',
				badge: p.status, actionLabel: 'Open', action: () => { this.kpi = null; this.openPosition(p); }
			});
			const candRow = c => ({
				id: c.name, title: c.applicant_name,
				detail: (c.job_title || '') + ', applied ' + relative(c.creation),
				badge: (c.ai_score ? c.ai_score + (c.ai_grade ? ' ' + c.ai_grade : '') : c.status),
				actionLabel: 'Open', action: () => { this.kpi = null; this.$emit('go', 'candidates'); }
			});
			if (k === 'review') return this.readyToPublish.map(r => Object.assign(reqRow(r), {
				actionLabel: 'Publish', action: () => { this.kpi = null; this.openPublish(r); }
			}));
			if (k === 'pending') return this.reqs.filter(r => ['Pending Approval', 'Pending CMO Approval'].includes(r.status)).map(reqRow);
			if (k === 'screen') return this.toScreen.slice().sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0)).map(candRow);
			if (k === 'live') return this.livePositions.map(posRow);
			if (k === 'closed') return this.positions.filter(p => p.status === 'Closed').map(posRow);
			if (k === 'interviews') return this.myInterviews.map(iv => ({
				id: iv.name, title: iv.applicant_name,
				detail: shortDate(iv.scheduled_date) + ' at ' + (iv.scheduled_time || '').slice(0, 5) + ', round ' + iv.round_number + (iv.interviewer_name ? ', with ' + iv.interviewer_name : ''),
				badge: iv.status, actionLabel: 'Calendar', action: () => { this.kpi = null; this.$emit('go', 'interviews'); }
			}));
			if (k === 'cmo-queue') return this.teamReqs.filter(r => r.status === 'Pending CMO Approval').map(reqRow);
			if (k === 'my-back') return this.myReqs.filter(r => r.status === 'Needs Revision').map(reqRow);
			if (k === 'my-progress') return this.myReqs.filter(r => IN_PROGRESS.includes(r.status)).map(reqRow);
			if (k === 'team-progress') return this.teamReqs.filter(r => ['Pending Approval', 'Approved', 'Needs Revision', 'Draft'].includes(r.status)).map(reqRow);
			if (k === 'pipeline') return this.positions.filter(p => p.status !== 'Closed').map(p => ({
				id: p.name, title: p.job_title, detail: this.stageText(p),
				actionLabel: 'Open', action: () => { this.kpi = null; this.openPosition(p); }
			}));
			if (k === 'shared') return this.shared.filter(p => !p.manager_response).map(p => ({
				id: p.name, title: p.current_designation || p.profile_ref,
				detail: (p.total_experience || '') + (p.current_company ? ', ' + p.current_company : ''),
				badge: p.ai_grade ? p.ai_score + ' ' + p.ai_grade : '',
				actionLabel: 'Review', action: () => { this.kpi = null; this.$emit('go', 'shared'); }
			}));
			return [];
		}
	},
	mounted() {
		this.roles = (window.frappe && frappe.user_roles) || [];
		this.load();
	},
	methods: {
		api(method, args = {}) {
			return new Promise((resolve, reject) => {
				frappe.call({ method, args, callback: r => resolve(r.message), error: reject });
			});
		},
		quiet(method, args = {}) { return this.api(method, args).catch(() => null); },
		async load() {
			if (this.isHR) {
				const [reqs, pos, cands, ivs, owners, tpls] = await Promise.all([
					this.quiet('wf_get_requisitions'), this.quiet('wf_get_job_openings'),
					this.quiet('wf_get_dashboard_data'), this.quiet('wf_get_interview_calendar_data'),
					this.quiet('wf_get_hr_owners'), this.quiet('wf_get_interview_templates')
				]);
				this.reqs = (reqs && reqs.requisitions) || [];
				this.positions = pos || [];
				this.candidates = cands || [];
				this.interviews = this.upcoming(ivs || []);
				if (owners) this.owners = owners;
				this.templates = tpls || [];
				this.countFilled();
			} else {
				const [dash, shared] = await Promise.all([
					this.quiet('wf_get_manager_dashboard'), this.quiet('workforce.talent.get_shared_prospects')
				]);
				if (dash) {
					this.reqs = dash.requisitions || [];
					this.positions = dash.positions || [];
					this.interviews = this.upcoming(dash.interviews || []);
				}
				this.shared = (shared && shared.prospects) || [];
			}
			this.loading = false;
		},
		upcoming(list) {
			const today = new Date(); today.setHours(0, 0, 0, 0);
			return list.filter(iv => !iv.scheduled_date || new Date(iv.scheduled_date) >= today);
		},
		countFilled() {
			const done = ['Offer Accepted', 'Onboarding Initiated', 'Onboarded'];
			this.positions.forEach(p => {
				p.filled_count = this.candidates.filter(c => c.job_opening === p.name && done.includes(c.status)).length;
			});
		},
		stageText(p) {
			const counts = p.stage_counts || {};
			const parts = Object.keys(counts).map(k => counts[k] + ' ' + k.toLowerCase());
			return parts.length ? parts.join(', ') : (p.candidate_count ? p.candidate_count + ' candidates' : 'No candidates yet');
		},
		pipelineTotal() {
			if (this.isManagerView) {
				return this.positions.reduce((n, p) => n + (p.candidate_count || 0), 0);
			}
			return this.candidates.length;
		},
		progressSub(list) {
			const c = s => list.filter(r => r.status === s).length;
			return c('Pending CMO Approval') + ' with CMO, ' + c('Pending Approval') + ' with leadership, ' + c('Approved') + ' ready to publish';
		},
		liveSub() {
			const open = this.positions.filter(p => p.status === 'Open').length;
			const hold = this.positions.filter(p => p.status === 'On Hold').length;
			return open + ' hiring, ' + hold + ' on hold';
		},
		reqFacts(r) {
			return [
				r.team ? { label: 'Team', value: r.team } : null,
				r.employment_type ? { label: 'Type', value: r.employment_type } : null,
				r.number_of_openings ? { label: 'Openings', value: String(r.number_of_openings) } : null,
				r.compensation_range ? { label: 'CTC', value: r.compensation_range } : null
			].filter(Boolean);
		},
		dayText(r) {
			if (!['Pending Approval', 'Pending CMO Approval'].includes(r.status)) return '';
			return 'Day ' + (r.days_pending || 0) + ' of 7';
		},
		shortDate(d) { return shortDate(d); },
		openKpi(k) { this.kpi = k; },
		openPosition(p) { this.$emit('open-position', p.name || p); },

		openPublish(req) {
			this.pub = { show: true, req, owner: '', priority: 'Medium', template: '', busy: false };
		},
		async doPublish() {
			if (!this.pub.owner) { this.toast = { show: true, msg: 'Choose who owns this position.', type: 'error' }; return; }
			this.pub.busy = true;
			try {
				const res = await this.api('wf_hr_publish_requisition', {
					data: {
						requisition: this.pub.req.name, hr_owner: this.pub.owner,
						priority: this.pub.priority, interview_template: this.pub.template
					}
				});
				this.toast = { show: true, msg: (res && res.message) || 'Published and assigned.', type: 'success' };
				this.pub.show = false;
				this.kpi = null;
				this.loading = true;
				await this.load();
			} catch (e) { /* frappe shows the reason */ }
			this.pub.busy = false;
		}
	}
};
</script>

<style scoped>
.head { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
.head h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.02em; color: var(--wf-ink); }
.head p { margin: 5px 0 0; color: var(--wf-mut); max-width: 72ch; }
.head .btn { margin-left: auto; }
.kpis { display: grid; gap: 12px; margin-bottom: 24px; }
.sec-h { display: flex; align-items: baseline; gap: 10px; margin: 0 0 12px; }
.sec-h h2 { margin: 0; font-size: 16px; font-weight: 600; color: var(--wf-ink); }
.sec-h span { color: var(--wf-mut); font-size: 13px; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 16px; margin-bottom: 24px; }
.card { position: relative; background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; padding: 18px 20px 16px 25px; overflow: hidden; display: flex; flex-direction: column; }
.card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--wf-amber); }
.kind { font-size: 12.5px; font-weight: 600; color: var(--wf-amber-ink); }
.kind.grey { color: var(--wf-mut); font-weight: 500; }
.card h3 { margin: 8px 0 3px; font-size: 18px; font-weight: 600; letter-spacing: -.01em; color: var(--wf-ink); }
.ctx { color: var(--wf-mut); font-size: 13.5px; }
.facts { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 14px; }
.fact { height: 26px; padding: 0 10px; border-radius: 7px; background: var(--wf-line-2); border: 1px solid #EEF0F4; display: inline-flex; align-items: center; font-size: 12.5px; color: var(--wf-mut); }
.fact b { color: var(--wf-ink); font-weight: 500; margin-left: 5px; }
.foot { margin-top: auto; padding-top: 12px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.foot-r { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.wait { font-size: 12.5px; color: var(--wf-mut); }
.waits { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 12px; margin-bottom: 24px; }
.wait-card { position: relative; background: #fff; border: 1px solid var(--wf-line); border-radius: 12px; padding: 14px 16px 14px 20px; overflow: hidden; text-align: left; font: inherit; cursor: pointer; }
.wait-card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 4px; background: #D1D5DB; }
.wait-card:hover { border-color: #C7D2FE; }
.wait-card b { display: block; font-size: 15px; font-weight: 600; margin: 4px 0 2px; color: var(--wf-ink); }
.bar-row { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
.bar { width: 90px; height: 6px; border-radius: 99px; background: #E9EBF3; overflow: hidden; display: inline-block; }
.bar i { display: block; height: 100%; background: var(--wf-amber); }
.bar i.late { background: var(--wf-bad); }
.grid2 { display: grid; grid-template-columns: minmax(0, 1fr) 340px; gap: 20px; align-items: start; }
.stack > * + * { margin-top: 20px; }
.panel { background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; }
.p-head { display: flex; align-items: center; gap: 10px; padding: 16px 20px 0; }
.p-head h2 { margin: 0; font-size: 16px; font-weight: 600; }
.p-head .btn { margin-left: auto; }
.p-body { padding: 12px 20px 18px; }
.note-empty { text-align: center; padding: 30px 20px; margin-bottom: 24px; }
.note-empty h3 { margin: 0 0 6px; font-size: 17px; font-weight: 600; }
.note-empty p { margin: 0; color: var(--wf-mut); }
.t { width: 100%; border-collapse: collapse; margin-top: 10px; }
.t th { text-align: left; font-size: 12.5px; font-weight: 500; color: var(--wf-mut-2); padding: 12px 16px 10px; border-bottom: 1px solid var(--wf-line); }
.t td { padding: 13px 16px; border-bottom: 1px solid var(--wf-line-2); }
.t tbody tr:last-child td { border-bottom: 0; }
.t th:first-child, .t td:first-child { padding-left: 20px; }
.t tbody tr { cursor: pointer; }
.t tbody tr:hover td { background: #FAFAFD; }
.ttl { font-weight: 600; color: var(--wf-ink); }
.sub { font-size: 13px; color: var(--wf-mut); }
.sub.top { margin: -6px 0 14px; }
.num { font-variant-numeric: tabular-nums; }
.row { display: flex; gap: 12px; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--wf-line-2); }
.row:last-child { border-bottom: 0; }
.grow { flex: 1; min-width: 0; }
.when { width: 62px; font-weight: 600; font-size: 13px; }
.when span { display: block; font-weight: 400; color: var(--wf-mut); }
.btn { height: 38px; padding: 0 15px; border-radius: 9px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-ink-2); font: inherit; font-weight: 500; font-size: 14px; cursor: pointer; }
.btn:hover { background: var(--wf-line-2); }
.btn.pri { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.btn.pri:hover { background: var(--wf-primary-2); }
.btn.ghost { border-color: transparent; background: transparent; color: var(--wf-primary-2); }
.btn.sm { height: 32px; padding: 0 11px; font-size: 13px; }
.empty { text-align: center; padding: 44px 20px; }
.empty.small { padding: 22px; }
.empty h3 { margin: 0 0 6px; font-size: 16px; font-weight: 600; }
.empty p { margin: 0; color: var(--wf-mut); }
.pub-head { background: var(--wf-line-2); border-radius: 10px; padding: 12px 14px; margin-bottom: 16px; }
.fld { margin-bottom: 16px; }
.fld label { display: block; font-weight: 500; margin-bottom: 6px; }
.req { color: var(--wf-bad); }
.hint { font-size: 12.5px; color: var(--wf-mut); margin-top: 6px; }
.in { box-sizing: border-box; width: 100%; height: 40px; border: 1px solid var(--wf-line); border-radius: 9px; padding: 0 12px; background: #fff; font: inherit; }
.in:focus { outline: none; border-color: var(--wf-primary-2); box-shadow: 0 0 0 3px var(--wf-primary-tint); }
.seg { display: inline-flex; border: 1px solid var(--wf-line); border-radius: 9px; padding: 3px; gap: 2px; }
.seg button { border: 0; background: transparent; height: 32px; padding: 0 14px; border-radius: 7px; font: inherit; font-weight: 500; color: var(--wf-mut); cursor: pointer; }
.seg button.on { background: var(--wf-primary-tint); color: var(--wf-primary-2); }
@media (max-width: 1100px) { .grid2 { grid-template-columns: 1fr; } }
@media (max-width: 860px) {
	.kpis { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
	.hs { display: none; }
}
</style>