<template>
	<div class="ap">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="head">
			<div>
				<h1>{{ title }}</h1>
				<p>{{ subtitle }}</p>
			</div>
		</div>

		<div v-if="loading" class="empty panel"><p>Loading…</p></div>

		<template v-else>
			<div v-if="!queue.length" class="panel empty">
				<h3>{{ canDecide ? 'All caught up' : 'Nothing waiting' }}</h3>
				<p>{{ emptyNote }}</p>
			</div>

			<article v-for="r in queue" :key="r.name" class="card">
				<div class="kind">{{ canDecide ? 'Your decision' : 'Waiting on ' + waitingOn }}{{ isCmo && canDecide ? ' (first stage, then leadership)' : '' }}</div>
				<h3>{{ r.title }}</h3>
				<div class="ctx">Raised by {{ r.requester_full_name || r.requester }} on {{ shortDate(r.creation) }}</div>
				<div class="facts">
					<span v-if="r.team" class="fact">Team <b>{{ r.team }}</b></span>
					<span v-if="r.number_of_openings" class="fact">Openings <b>{{ r.number_of_openings }}</b></span>
					<span v-if="r.position_level" class="fact">Level <b>{{ r.position_level }}</b></span>
					<span v-if="r.employment_type" class="fact">Type <b>{{ r.employment_type }}</b></span>
					<span v-if="r.compensation_range" class="fact">CTC <b>{{ r.compensation_range }}</b></span>
				</div>
				<div class="foot">
					<span class="sla">
						<span class="bar"><i :class="{ late: (r.days_pending || 0) > 7 }" :style="{ width: Math.min(100, ((r.days_pending || 0) / 7) * 100) + '%' }"></i></span>
						<span class="sub num">Day {{ r.days_pending || 0 }} of 7</span>
					</span>
					<div class="foot-r">
						<button class="btn sm" type="button" @click="openDetail(r)">Full details</button>
						<template v-if="canDecide">
							<button class="btn sm dan" type="button" @click="ask(r, 'Rejected')">Reject</button>
							<button class="btn sm" type="button" @click="ask(r, 'Request Changes')">Request changes</button>
							<button class="btn sm pri" type="button" @click="ask(r, 'Approved')">{{ isCmo ? 'Approve and send on' : 'Approve' }}</button>
						</template>
					</div>
				</div>
			</article>

			<section v-if="decided.length" class="panel">
				<div class="p-head"><h2>Decided</h2><span class="sub">{{ decided.length }}</span></div>
				<table class="t">
					<tbody>
						<tr v-for="r in decided" :key="r.name" @click="openDetail(r)">
							<td>
								<div class="ttl">{{ r.title }}</div>
								<div class="sub">{{ r.requester_full_name || r.requester }}<template v-if="r.team">, {{ r.team }}</template></div>
							</td>
							<td><Badge :label="r.status" /></td>
							<td class="hs sub">{{ shortDate(r.leadership_decision_on || r.modified || r.creation) }}</td>
						</tr>
					</tbody>
				</table>
			</section>
		</template>

		<DetailPanel :visible="showPanel" :title="sel ? sel.title : ''" @close="showPanel = false">
			<template v-if="detail">
				<div class="pills"><Badge :label="detail.requisition.status" /><span class="sub num">{{ detail.requisition.name }}</span></div>
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
				<div class="sec"><h4>Why this hire</h4><p :class="{ none: !detail.requisition.business_justification }">{{ detail.requisition.business_justification || 'Not provided' }}</p></div>
				<div class="sec"><h4>Job description</h4><p class="pre">{{ detail.requisition.description || '—' }}</p></div>
				<div class="sec" v-if="detail.requisition.required_skills">
					<h4>Skills</h4>
					<div class="tags"><span v-for="s in skillList(detail.requisition.required_skills)" :key="s" class="tag">{{ s }}</span></div>
				</div>
				<div class="sec">
					<h4>Timeline</h4>
					<ol class="tl">
						<li v-for="(e, i) in detail.timeline" :key="i" :class="e.status === 'pending' ? 'now' : 'done'">
							<span class="dot"></span><b>{{ e.event }}</b>
							<span>{{ e.by }}<template v-if="e.at">, {{ shortDate(e.at) }}</template></span>
							<div v-if="e.comment" class="cm">{{ lastComment(e.comment) }}</div>
						</li>
					</ol>
				</div>
			</template>
			<div v-else class="empty"><p>Loading…</p></div>
			<template #actions v-if="detail && canDecideOn(detail)">
				<button class="btn dan" type="button" @click="ask(detail.requisition, 'Rejected')">Reject</button>
				<button class="btn" type="button" @click="ask(detail.requisition, 'Request Changes')">Request changes</button>
				<button class="btn pri" type="button" @click="ask(detail.requisition, 'Approved')">Approve</button>
			</template>
		</DetailPanel>

		<Dialog :visible="dec.show" :title="decTitle" :submit-label="decButton" :loading="dec.busy" @close="dec.show = false" @submit="decide">
			<p class="sub top">{{ decNote }}</p>
			<div class="fld">
				<label>{{ dec.answer === 'Approved' ? 'Comment' : 'Reason' }} <span v-if="dec.answer !== 'Approved'" class="req">*</span></label>
				<textarea v-model="dec.comment" class="in ta" rows="3" :placeholder="decPlaceholder"></textarea>
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

export default {
	name: 'ApprovalsTab',
	// stage = 'leadership' (default) or 'cmo'
	props: { stage: { type: String, default: 'leadership' } },
	components: { Badge, Dialog, DetailPanel, Toast },
	data() {
		return {
			roles: [], loading: true, reqs: [],
			showPanel: false, sel: null, detail: null,
			dec: { show: false, req: null, answer: '', comment: '', busy: false },
			toast: { show: false, msg: '', type: 'success' }
		};
	},
	computed: {
		isCmo() { return this.stage === 'cmo'; },
		isAdmin() { return this.roles.includes('WF Admin'); },
		canDecide() {
			return this.isAdmin || this.roles.includes(this.isCmo ? 'WF CMO' : 'WF Leadership');
		},
		pendingStatus() { return this.isCmo ? 'Pending CMO Approval' : 'Pending Approval'; },
		waitingOn() { return this.isCmo ? 'the CMO' : 'leadership'; },
		title() { return this.isCmo ? 'CMO approvals' : 'Approvals'; },
		subtitle() {
			if (this.isCmo) return 'Requisitions from your team come to you first. Approved ones go on to leadership.';
			return this.canDecide
				? 'Hiring requests waiting on your decision. Each one has a 7-day window.'
				: 'Requests waiting on leadership. Read-only for you.';
		},
		emptyNote() {
			return this.isCmo
				? 'When your team raises a requisition it lands here first. You can approve it, send it back with changes, or reject it.'
				: 'New requests land here and you get an email.';
		},
		queue() { return this.reqs.filter(r => r.status === this.pendingStatus); },
		decided() {
			const done = this.isCmo
				? ['Rejected by CMO', 'Pending Approval', 'Approved', 'Published']
				: ['Approved', 'Published', 'Rejected', 'Needs Revision'];
			return this.reqs.filter(r => done.includes(r.status)).slice(0, 30);
		},
		decTitle() {
			if (this.dec.answer === 'Approved') return this.isCmo ? 'Approve and send on?' : 'Approve this requisition?';
			return this.dec.answer === 'Rejected' ? 'Reject this requisition?' : 'Request changes';
		},
		decButton() { return this.dec.answer === 'Approved' ? 'Approve' : (this.dec.answer === 'Rejected' ? 'Reject' : 'Send back'); },
		decNote() {
			if (!this.dec.req) return '';
			const who = this.dec.req.requester_full_name || this.dec.req.requester;
			if (this.dec.answer === 'Approved') return this.isCmo ? 'It goes to leadership for the final decision.' : 'HR can then publish it and assign a recruiter.';
			if (this.dec.answer === 'Rejected') return 'It stops here. ' + who + ' is told and can raise a new one.';
			return 'It goes back to ' + who + ' to edit and resubmit.';
		},
		decPlaceholder() {
			if (this.dec.answer === 'Approved') return 'Optional';
			return this.dec.answer === 'Rejected' ? 'Why this is not going ahead' : 'What needs to change';
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
		notify(msg, type = 'success') { this.toast = { show: true, msg, type }; },
		async load() {
			try {
				const res = await this.api('wf_get_requisitions');
				this.reqs = (res && res.requisitions) || [];
			} catch (e) { this.notify('Could not load requests.', 'error'); }
			this.loading = false;
		},
		shortDate(d) { return shortDate(d); },
		skillList(s) { return String(s || '').split(',').map(x => x.trim()).filter(Boolean); },
		lastComment(text) {
			const parts = String(text || '').split('\n---\n');
			return parts[parts.length - 1].trim();
		},
		canDecideOn(detail) {
			return this.isCmo ? !!detail.permissions.can_cmo_decide : !!detail.permissions.can_approve;
		},
		async openDetail(r) {
			this.sel = r; this.detail = null; this.showPanel = true;
			try { this.detail = await this.api('wf_get_requisition_detail', { requisition: r.name }); }
			catch (e) { this.notify('Could not open this requisition.', 'error'); this.showPanel = false; }
		},
		ask(req, answer) { this.dec = { show: true, req, answer, comment: '', busy: false }; },
		async decide() {
			if (this.dec.answer !== 'Approved' && !this.dec.comment.trim()) {
				this.notify('Please add a reason so the other person knows why.', 'error');
				return;
			}
			this.dec.busy = true;
			try {
				const res = await this.api(this.isCmo ? 'wf_cmo_decide' : 'wf_leadership_decide', {
					data: { requisition: this.dec.req.name, decision: this.dec.answer, comment: this.dec.comment.trim() }
				});
				this.notify((res && res.message) || 'Done.');
				this.dec.show = false;
				this.showPanel = false;
				await this.load();
			} catch (e) { /* frappe shows the reason */ }
			this.dec.busy = false;
		}
	}
};
</script>

<style scoped>
.head { margin-bottom: 20px; }
.head h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.02em; color: var(--wf-ink); }
.head p { margin: 5px 0 0; color: var(--wf-mut); max-width: 72ch; }
.card { position: relative; background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; padding: 20px 22px 18px 27px; overflow: hidden; margin-bottom: 16px; max-width: 900px; }
.card::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--wf-amber); }
.kind { font-size: 12.5px; font-weight: 600; color: var(--wf-amber-ink); }
.card h3 { margin: 8px 0 3px; font-size: 18px; font-weight: 600; letter-spacing: -.01em; color: var(--wf-ink); }
.ctx { color: var(--wf-mut); font-size: 13.5px; }
.facts { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 16px; }
.fact { height: 26px; padding: 0 10px; border-radius: 7px; background: var(--wf-line-2); border: 1px solid #EEF0F4; display: inline-flex; align-items: center; font-size: 12.5px; color: var(--wf-mut); }
.fact b { color: var(--wf-ink); font-weight: 500; margin-left: 5px; }
.foot { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.foot-r { margin-left: auto; display: flex; gap: 8px; flex-wrap: wrap; }
.sla { display: inline-flex; align-items: center; gap: 8px; }
.bar { width: 90px; height: 6px; border-radius: 99px; background: #E9EBF3; overflow: hidden; display: inline-block; }
.bar i { display: block; height: 100%; background: var(--wf-amber); }
.bar i.late { background: var(--wf-bad); }
.panel { background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; overflow: hidden; }
.p-head { display: flex; align-items: center; gap: 10px; padding: 16px 20px 4px; }
.p-head h2 { margin: 0; font-size: 16px; font-weight: 600; }
.t { width: 100%; border-collapse: collapse; }
.t td { padding: 13px 16px; border-bottom: 1px solid var(--wf-line-2); }
.t tbody tr:last-child td { border-bottom: 0; }
.t td:first-child { padding-left: 20px; }
.t tbody tr { cursor: pointer; }
.t tbody tr:hover td { background: #FAFAFD; }
.ttl { font-weight: 600; color: var(--wf-ink); }
.sub { font-size: 13px; color: var(--wf-mut); }
.sub.top { margin: -6px 0 14px; }
.num { font-variant-numeric: tabular-nums; }
.empty { text-align: center; padding: 48px 20px; }
.empty h3 { margin: 0 0 6px; font-size: 17px; font-weight: 600; }
.empty p { margin: 0 auto; color: var(--wf-mut); max-width: 48ch; }
.btn { height: 38px; padding: 0 15px; border-radius: 9px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-ink-2); font: inherit; font-weight: 500; font-size: 14px; cursor: pointer; }
.btn:hover { background: var(--wf-line-2); }
.btn.pri { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.btn.pri:hover { background: var(--wf-primary-2); }
.btn.dan { color: var(--wf-bad); border-color: #F5C2C2; }
.btn.dan:hover { background: var(--wf-bad-tint); }
.btn.sm { height: 32px; padding: 0 11px; font-size: 13px; }
.pills { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin: 0 0 20px; }
.kv dt { font-size: 12.5px; color: var(--wf-mut-2); }
.kv dd { margin: 2px 0 0; font-weight: 500; }
.sec { margin-bottom: 20px; }
.sec h4 { margin: 0 0 8px; font-size: 13.5px; font-weight: 600; }
.sec p { margin: 0; }
.sec p.none { color: var(--wf-mut-2); font-style: italic; }
.pre { white-space: pre-wrap; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { height: 26px; padding: 0 10px; border-radius: 7px; background: var(--wf-primary-tint); color: var(--wf-primary-2); display: inline-flex; align-items: center; font-size: 12.5px; font-weight: 500; }
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
.fld label { display: block; font-weight: 500; margin-bottom: 6px; }
.req { color: var(--wf-bad); }
.in { box-sizing: border-box; width: 100%; border: 1px solid var(--wf-line); border-radius: 9px; padding: 10px 12px; font: inherit; }
.in:focus { outline: none; border-color: var(--wf-primary-2); box-shadow: 0 0 0 3px var(--wf-primary-tint); }
.ta { line-height: 1.5; resize: vertical; }
@media (max-width: 860px) { .hs { display: none; } .kv { grid-template-columns: 1fr; } }
</style>