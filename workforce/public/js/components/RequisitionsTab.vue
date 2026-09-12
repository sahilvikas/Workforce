<template>
	<div class="rq">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="head">
			<div>
				<h1>{{ isHR ? 'Requisitions' : 'My requisitions' }}</h1>
				<p>{{ isHR ? 'Every hiring request and the step it is waiting on.' : 'Ask to hire for your team and see exactly where each request is. ' + routeNote }}</p>
			</div>
			<button v-if="canRaise" class="btn pri" type="button" @click="openForm()">Raise requisition</button>
		</div>

		<div class="chips">
			<button v-for="g in groups" :key="g.key" type="button" class="chip" :class="{ on: filter === g.key }" @click="filter = g.key">
				{{ g.label }} <span class="c">{{ g.count }}</span>
			</button>
			<div class="search">
				<input v-model="q" class="in" placeholder="Search by title, team or requester" />
			</div>
		</div>

		<section class="panel">
			<div v-if="loading" class="empty"><p>Loading…</p></div>
			<div v-else-if="!shown.length" class="empty">
				<h3>Nothing here</h3>
				<p>{{ filter === 'open' ? 'When you raise a requisition it shows here until it goes live.' : 'No requisitions in this group.' }}</p>
			</div>
			<table v-else class="t">
				<thead>
					<tr>
						<th>Position</th>
						<th v-if="isHR" class="hs">Raised by</th>
						<th>Where it is</th>
						<th class="hs">Openings</th>
						<th class="hs">Raised</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="r in shown" :key="r.name" @click="openDetail(r)">
						<td>
							<div class="ttl">{{ r.title }}</div>
							<div class="sub">{{ r.team || r.name }}</div>
						</td>
						<td v-if="isHR" class="hs">{{ r.requester_full_name || r.requester }}</td>
						<td>
							<Badge :label="whereLabel(r)" />
							<span v-if="dayText(r)" class="sub day">{{ dayText(r) }}</span>
						</td>
						<td class="hs num">{{ r.number_of_openings }}</td>
						<td class="hs sub">{{ shortDate(r.creation) }}</td>
					</tr>
				</tbody>
			</table>
		</section>

		<!-- detail -->
		<DetailPanel :visible="showPanel" :title="sel ? sel.title : ''" @close="closePanel">
			<template v-if="detail">
				<div class="pills">
					<Badge :label="whereLabel(detail.requisition)" />
					<span class="sub num">{{ detail.requisition.name }}</span>
				</div>
				<div v-if="detail.requisition.status === 'Needs Revision' && detail.requisition.leadership_comment" class="note">
					<b>Changes requested.</b> {{ lastComment(detail.requisition.leadership_comment) }}
				</div>
				<dl class="kv">
					<div><dt>Team</dt><dd>{{ detail.requisition.team || '—' }}</dd></div>
					<div><dt>Level</dt><dd>{{ detail.requisition.position_level || '—' }}</dd></div>
					<div><dt>Type</dt><dd>{{ detail.requisition.employment_type || '—' }}</dd></div>
					<div><dt>Openings</dt><dd class="num">{{ detail.requisition.number_of_openings }}</dd></div>
					<div><dt>CTC range</dt><dd>{{ detail.requisition.compensation_range || '—' }}</dd></div>
					<div><dt>Reason</dt><dd>{{ detail.requisition.reason || '—' }}</dd></div>
					<div><dt>Raised by</dt><dd>{{ detail.requisition.requester_name }}</dd></div>
					<div><dt>Target start</dt><dd>{{ detail.requisition.target_start_date || '—' }}</dd></div>
				</dl>
				<div class="sec">
					<h4>Why this hire</h4>
					<p :class="{ none: !detail.requisition.business_justification }">{{ detail.requisition.business_justification || 'Not provided' }}</p>
				</div>
				<div class="sec">
					<h4>Job description</h4>
					<p class="pre">{{ detail.requisition.description || '—' }}</p>
				</div>
				<div class="sec" v-if="detail.requisition.required_skills">
					<h4>Skills</h4>
					<div class="tags"><span v-for="s in skillList(detail.requisition.required_skills)" :key="s" class="tag">{{ s }}</span></div>
				</div>
				<div class="sec" v-if="detail.job_opening">
					<h4>Live position</h4>
					<div class="box">
						<b>{{ detail.job_opening.job_title }}</b>
						<Badge :label="detail.job_opening.status" />
						<div class="sub">{{ detail.candidate_count }} candidate{{ detail.candidate_count === 1 ? '' : 's' }}</div>
					</div>
				</div>
				<div class="sec">
					<h4>Timeline</h4>
					<ol class="tl">
						<li v-for="(e, i) in detail.timeline" :key="i" :class="e.status === 'pending' ? 'now' : 'done'">
							<span class="dot"></span>
							<b>{{ e.event }}</b>
							<span>{{ e.by }}<template v-if="e.at">, {{ shortDate(e.at) }}</template></span>
							<div v-if="e.comment" class="cm">{{ lastComment(e.comment) }}</div>
						</li>
					</ol>
				</div>
			</template>
			<div v-else class="empty"><p>Loading…</p></div>

			<template #actions v-if="detail">
				<button v-if="detail.permissions.can_cancel" class="btn dan" type="button" @click="cancel.show = true">Cancel requisition</button>
				<button v-if="detail.permissions.can_edit" class="btn pri" type="button" @click="openForm(detail.requisition)">
					{{ detail.requisition.status === 'Needs Revision' ? 'Edit and resubmit' : 'Edit' }}
				</button>
			</template>
		</DetailPanel>

		<!-- raise / edit -->
		<Dialog
			:visible="showForm"
			:title="editing ? 'Edit requisition' : 'Raise a requisition'"
			:submit-label="editing && editing.status === 'Needs Revision' ? 'Resubmit' : 'Submit for approval'"
			:loading="saving" size="lg" @close="showForm = false" @submit="save(true)"
		>
			<template #footer-extra>
				<button class="btn" type="button" :disabled="saving" @click="save(false)">Save as draft</button>
			</template>
			<p class="sub top">{{ routeNote }}</p>
			<div v-if="editing && editing.leadership_comment && editing.status === 'Needs Revision'" class="note">
				<b>What to change.</b> {{ lastComment(editing.leadership_comment) }}
			</div>
			<div class="grid">
				<div class="fld full">
					<label>Position title <span class="req">*</span></label>
					<input v-model="form.title" class="in" placeholder="e.g. Junior Shopify Developer" />
				</div>
				<div class="fld">
					<label>Team <span class="req">*</span></label>
					<select v-model="form.team" class="in">
						<option value="">Choose</option>
						<option v-for="d in departments" :key="d.name || d" :value="d.name || d">{{ d.name || d }}</option>
					</select>
				</div>
				<div class="fld">
					<label>Level <span class="req">*</span></label>
					<select v-model="form.position_level" class="in">
						<option value="">Choose</option>
						<option v-for="l in levels" :key="l">{{ l }}</option>
					</select>
				</div>
				<div class="fld">
					<label>Employment type <span class="req">*</span></label>
					<select v-model="form.employment_type" class="in"><option v-for="t in types" :key="t">{{ t }}</option></select>
				</div>
				<div class="fld">
					<label>Openings <span class="req">*</span></label>
					<input v-model.number="form.number_of_openings" type="number" min="1" class="in num" />
				</div>
				<div class="fld">
					<label>Reason <span class="req">*</span></label>
					<select v-model="form.reason" class="in">
						<option value="">Choose</option>
						<option v-for="r in reasons" :key="r">{{ r }}</option>
					</select>
				</div>
				<div class="fld">
					<label>CTC range</label>
					<input v-model="form.compensation_range" class="in" placeholder="e.g. 5-7 LPA" />
				</div>
				<div class="fld">
					<label>Target start</label>
					<input v-model="form.target_start_date" type="date" class="in" />
				</div>
				<div class="fld full">
					<label>Job description <span class="req">*</span></label>
					<textarea v-model="form.description" class="in ta" rows="6" placeholder="What the person will do, and what they need to bring"></textarea>
					<div class="hint">This is what candidates read on the careers page. Please write more than one line.</div>
				</div>
				<div class="fld full">
					<label>Skills</label>
					<input v-model="form.required_skills" class="in" placeholder="Comma separated, e.g. Selenium, SQL, manual testing" />
				</div>
				<div class="fld full">
					<label>Why this hire</label>
					<textarea v-model="form.business_justification" class="in ta" rows="3" placeholder="The problem this person solves"></textarea>
					<div class="hint">Optional, but if you write it, use at least 30 characters.</div>
				</div>
			</div>
		</Dialog>

		<!-- cancel -->
		<Dialog :visible="cancel.show" title="Cancel this requisition?" submit-label="Cancel requisition" :loading="cancel.busy" @close="cancel.show = false" @submit="doCancel">
			<p class="sub top">It stops here and leaves every approval queue.</p>
			<div class="fld">
				<label>Reason <span class="req">*</span></label>
				<textarea v-model="cancel.reason" class="in ta" rows="3" placeholder="Why it is no longer needed"></textarea>
			</div>
		</Dialog>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';
import { shortDate } from './utils/time.js';

const OPEN_STATUSES = ['Draft', 'Pending CMO Approval', 'Pending Approval', 'Needs Revision', 'Approved'];
const CLOSED_STATUSES = ['Rejected', 'Rejected by CMO', 'Cancelled'];

export default {
	name: 'RequisitionsTab',
	components: { Badge, Dialog, DetailPanel, Toast },
	data() {
		return {
			roles: [], loading: true, reqs: [], departments: [],
			filter: 'open', q: '',
			showPanel: false, sel: null, detail: null,
			showForm: false, editing: null, saving: false,
			form: this.blankForm(),
			cancel: { show: false, reason: '', busy: false },
			toast: { show: false, msg: '', type: 'success' },
			levels: ['Intern', 'Junior', 'Mid', 'Senior', 'Lead', 'Manager'],
			types: ['Full-time', 'Part-time', 'Contract', 'Internship'],
			reasons: ['New position', 'Replacement', 'Expansion']
		};
	},
	computed: {
		isHR() { return this.roles.includes('WF HR Manager') || this.roles.includes('WF Admin'); },
		canRaise() { return this.isHR || this.roles.includes('WF Hiring Manager') || this.roles.includes('WF CMO'); },
		routeNote() {
			return this.isHR
				? 'Approved requests come back to you to publish.'
				: 'Once approved, HR publishes the position and assigns a recruiter.';
		},
		groups() {
			const c = list => list.length;
			return [
				{ key: 'open', label: 'In progress', count: c(this.reqs.filter(r => OPEN_STATUSES.includes(r.status))) },
				{ key: 'live', label: 'Live', count: c(this.reqs.filter(r => r.status === 'Published')) },
				{ key: 'closed', label: 'Closed', count: c(this.reqs.filter(r => CLOSED_STATUSES.includes(r.status))) },
				{ key: 'all', label: 'All', count: this.reqs.length }
			];
		},
		shown() {
			let list = this.reqs;
			if (this.filter === 'open') list = list.filter(r => OPEN_STATUSES.includes(r.status));
			else if (this.filter === 'live') list = list.filter(r => r.status === 'Published');
			else if (this.filter === 'closed') list = list.filter(r => CLOSED_STATUSES.includes(r.status));
			const q = this.q.trim().toLowerCase();
			if (q) list = list.filter(r => [r.title, r.team, r.requester_full_name, r.name].join(' ').toLowerCase().includes(q));
			return list;
		}
	},
	mounted() {
		this.roles = (window.frappe && frappe.user_roles) || [];
		this.load();
		this.api('wf_get_departments').then(d => { this.departments = d || []; }).catch(() => {});
	},
	methods: {
		blankForm() {
			return {
				title: '', team: '', position_level: '', employment_type: 'Full-time',
				number_of_openings: 1, reason: '', compensation_range: '', target_start_date: '',
				description: '', required_skills: '', business_justification: ''
			};
		},
		api(method, args = {}) {
			return new Promise((resolve, reject) => {
				frappe.call({ method, args, callback: r => resolve(r.message), error: reject });
			});
		},
		notify(msg, type = 'success') { this.toast = { show: true, msg, type }; },
		async load() {
			try {
				const res = await this.api('wf_get_requisitions');
				this.reqs = (res && res.requisitions) || [];
			} catch (e) { this.notify('Could not load requisitions.', 'error'); }
			this.loading = false;
		},
		shortDate(d) { return shortDate(d); },
		whereLabel(r) {
			return {
				'Pending CMO Approval': 'Pending CMO Approval',
				'Pending Approval': 'Pending Approval',
				'Needs Revision': 'Needs Revision',
				'Approved': 'Approved',
				'Published': 'Published'
			}[r.status] || r.status;
		},
		dayText(r) {
			if (!['Pending Approval', 'Pending CMO Approval'].includes(r.status)) return '';
			return 'day ' + (r.days_pending || 0) + ' of 7';
		},
		// the comment field keeps a trail separated by ---; show the newest
		lastComment(text) {
			const parts = String(text || '').split('\n---\n');
			return parts[parts.length - 1].trim();
		},
		skillList(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); },

		async openDetail(req) {
			this.sel = req; this.detail = null; this.showPanel = true;
			try { this.detail = await this.api('wf_get_requisition_detail', { requisition: req.name }); }
			catch (e) { this.notify('Could not open this requisition.', 'error'); this.showPanel = false; }
		},
		closePanel() { this.showPanel = false; this.sel = null; this.detail = null; },

		openForm(req) {
			this.editing = req || null;
			this.form = req ? {
				title: req.title || '', team: req.team || '', position_level: req.position_level || '',
				employment_type: req.employment_type || 'Full-time', number_of_openings: req.number_of_openings || 1,
				reason: req.reason || '', compensation_range: req.compensation_range || '',
				target_start_date: req.target_start_date || '', description: req.description || '',
				required_skills: req.required_skills || '', business_justification: req.business_justification || ''
			} : this.blankForm();
			this.showPanel = false;
			this.showForm = true;
		},
		async save(submit) {
			if (!this.form.title.trim()) { this.notify('A position title is needed.', 'error'); return; }
			if (submit) {
				for (const f of [['team', 'team'], ['position_level', 'level'], ['reason', 'reason'], ['description', 'job description']]) {
					if (!String(this.form[f[0]] || '').trim()) { this.notify('Please fill the ' + f[1] + '.', 'error'); return; }
				}
			}
			const bj = String(this.form.business_justification || '').trim();
			if (bj && bj.length < 30) { this.notify('“Why this hire” needs at least 30 characters, or leave it empty.', 'error'); return; }
			this.saving = true;
			try {
				const payload = Object.assign({}, this.form, { submit_for_approval: submit });
				let res;
				if (this.editing) {
					payload.requisition = this.editing.name;
					res = await this.api('wf_hiring_manager_edit_requisition', { data: payload });
				} else {
					res = await this.api('wf_create_requisition', { data: payload });
				}
				this.notify((res && res.message) || 'Saved.');
				this.showForm = false;
				this.editing = null;
				await this.load();
			} catch (e) { /* frappe shows the reason */ }
			this.saving = false;
		},
		async doCancel() {
			if (!this.cancel.reason.trim()) { this.notify('Please give a reason.', 'error'); return; }
			this.cancel.busy = true;
			try {
				await this.api('wf_manager_action', { data: { requisition: this.detail.requisition.name, action: 'cancel', reason: this.cancel.reason.trim() } });
				this.notify('Requisition cancelled.');
				this.cancel = { show: false, reason: '', busy: false };
				this.closePanel();
				await this.load();
			} catch (e) { this.cancel.busy = false; }
		}
	}
};
</script>

<style scoped>
.head { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.head h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.02em; color: var(--wf-ink); }
.head p { margin: 5px 0 0; color: var(--wf-mut); max-width: 72ch; }
.head .btn { margin-left: auto; }
.chips { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-bottom: 16px; }
.chip { height: 34px; padding: 0 14px; border-radius: 999px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-mut); font: inherit; font-size: 13.5px; font-weight: 500; cursor: pointer; }
.chip .c { opacity: .7; margin-left: 3px; }
.chip.on { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.search { flex: 1; min-width: 220px; }
.panel { background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; overflow: hidden; }
.t { width: 100%; border-collapse: collapse; }
.t th { text-align: left; font-size: 12.5px; font-weight: 500; color: var(--wf-mut-2); padding: 14px 16px 10px; border-bottom: 1px solid var(--wf-line); }
.t td { padding: 14px 16px; border-bottom: 1px solid var(--wf-line-2); vertical-align: middle; }
.t tbody tr:last-child td { border-bottom: 0; }
.t th:first-child, .t td:first-child { padding-left: 20px; }
.t tbody tr { cursor: pointer; }
.t tbody tr:hover td { background: #FAFAFD; }
.ttl { font-weight: 600; color: var(--wf-ink); }
.sub { font-size: 13px; color: var(--wf-mut); }
.sub.day { margin-left: 8px; }
.sub.top { margin: -6px 0 14px; }
.num { font-variant-numeric: tabular-nums; }
.empty { text-align: center; padding: 48px 20px; }
.empty h3 { margin: 0 0 6px; font-size: 17px; font-weight: 600; }
.empty p { margin: 0; color: var(--wf-mut); }
.btn { height: 38px; padding: 0 15px; border-radius: 9px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-ink-2); font: inherit; font-weight: 500; font-size: 14px; cursor: pointer; }
.btn:hover { background: var(--wf-line-2); }
.btn.pri { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.btn.pri:hover { background: var(--wf-primary-2); }
.btn.dan { color: var(--wf-bad); border-color: #F5C2C2; }
.btn.dan:hover { background: var(--wf-bad-tint); }
.btn:disabled { opacity: .5; cursor: not-allowed; }
.pills { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin: 0 0 20px; }
.kv dt { font-size: 12.5px; color: var(--wf-mut-2); }
.kv dd { margin: 2px 0 0; font-weight: 500; }
.sec { margin-bottom: 20px; }
.sec h4 { margin: 0 0 8px; font-size: 13.5px; font-weight: 600; }
.sec p { margin: 0; }
.sec p.none { color: var(--wf-mut-2); font-style: italic; }
.pre { white-space: pre-wrap; }
.box { border: 1px solid var(--wf-line); border-radius: 12px; padding: 12px 14px; display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { height: 26px; padding: 0 10px; border-radius: 7px; background: var(--wf-primary-tint); color: var(--wf-primary-2); display: inline-flex; align-items: center; font-size: 12.5px; font-weight: 500; }
.note { background: var(--wf-amber-tint); color: var(--wf-amber-ink); border-radius: 10px; padding: 10px 14px; font-size: 13.5px; margin-bottom: 16px; }
.tl { list-style: none; margin: 0; padding: 0; }
.tl li { position: relative; padding: 0 0 18px 30px; }
.tl li::before { content: ""; position: absolute; left: 8px; top: 20px; bottom: -2px; width: 2px; background: var(--wf-line); }
.tl li:last-child::before { display: none; }
.tl .dot { position: absolute; left: 0; top: 3px; width: 18px; height: 18px; border-radius: 50%; border: 2px solid var(--wf-line); background: #fff; }
.tl li.done .dot { background: var(--wf-ok-dot); border-color: var(--wf-ok-dot); }
.tl li.done::before { background: var(--wf-ok-dot); }
.tl li.now .dot { border-color: var(--wf-amber); box-shadow: 0 0 0 4px var(--wf-amber-tint); }
.tl b { display: block; font-weight: 600; }
.tl span { display: block; font-size: 13px; color: var(--wf-mut); }
.tl .cm { margin-top: 6px; padding: 8px 10px; border-radius: 8px; background: var(--wf-line-2); font-size: 13px; color: var(--wf-ink); }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0 16px; }
.fld { margin-bottom: 16px; }
.fld.full { grid-column: 1 / -1; }
.fld label { display: block; font-weight: 500; margin-bottom: 6px; }
.req { color: var(--wf-bad); }
.hint { font-size: 12.5px; color: var(--wf-mut); margin-top: 6px; }
.in { box-sizing: border-box; width: 100%; height: 40px; border: 1px solid var(--wf-line); border-radius: 9px; padding: 0 12px; background: #fff; font: inherit; color: var(--wf-ink); }
.in:focus { outline: none; border-color: var(--wf-primary-2); box-shadow: 0 0 0 3px var(--wf-primary-tint); }
.ta { height: auto; padding: 10px 12px; line-height: 1.5; resize: vertical; }
@media (max-width: 860px) {
	.hs { display: none; }
	.kv, .grid { grid-template-columns: 1fr; }
}
</style>