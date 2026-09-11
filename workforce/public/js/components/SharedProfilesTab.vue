<template>
	<div class="sp">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="sp-head">
			<h1>Shared profiles</h1>
			<p>Profiles HR thinks could fit your positions. Name and contact details stay with HR. Tell them if you’re interested and they’ll invite the person to apply.</p>
		</div>

		<div class="kpis">
			<div class="kpi dec"><span class="n">{{ waiting.length }}</span><span class="l">Waiting for your answer</span></div>
			<div class="kpi"><span class="n">{{ countBy('Interested') }}</span><span class="l">You’re interested</span></div>
			<div class="kpi"><span class="n">{{ countBy('Not Interested') }}</span><span class="l">Not interested</span></div>
			<div class="kpi"><span class="n">{{ prospects.length }}</span><span class="l">Shared with you</span></div>
		</div>

		<div v-if="loading" class="empty"><p>Loading…</p></div>
		<div v-else-if="!prospects.length" class="empty">
			<h3>Nothing shared yet</h3>
			<p>When HR finds a profile for one of your positions, it appears here and you get an email.</p>
		</div>

		<template v-else>
			<h2 v-if="waiting.length" class="sec-h">Waiting for your answer <span>{{ waiting.length }}</span></h2>
			<div class="cards">
				<article v-for="p in waiting" :key="p.name" class="card dec">
					<div class="card-top">
						<span class="ref">{{ p.profile_ref }}</span>
						<span :class="['score', scoreClass(p)]">{{ scoreText(p) }}</span>
					</div>
					<h3>{{ p.current_designation || p.resume_headline || 'Candidate' }}</h3>
					<div class="ctx">For {{ p.job_title }}<span v-if="p.shared_by_name">, shared by {{ p.shared_by_name }}</span></div>
					<div class="facts">
						<span class="fact" v-if="p.total_experience">Experience <b>{{ p.total_experience }}</b></span>
						<span class="fact" v-if="p.current_company">Company <b>{{ p.current_company }}</b></span>
						<span class="fact" v-if="p.current_location">Location <b>{{ p.current_location }}</b></span>
						<span class="fact" v-if="p.notice_period">Notice <b>{{ p.notice_period }}</b></span>
						<span class="fact" v-if="p.annual_salary">Salary <b>{{ p.annual_salary }}</b></span>
					</div>
					<div class="tags" v-if="p.key_skills"><span v-for="s in skillList(p)" :key="s" class="tag">{{ s }}</span></div>
					<p v-if="p.ai_summary" class="ai">{{ p.ai_summary }}</p>
					<p v-if="p.share_note" class="hrnote"><b>Note from HR:</b> {{ p.share_note }}</p>
					<div class="foot">
						<button class="btn" type="button" @click="open(p)">Full profile</button>
						<button class="btn dan" type="button" @click="ask(p, 'Not Interested')">Not interested</button>
						<button class="btn pri" type="button" @click="ask(p, 'Interested')">Interested</button>
					</div>
				</article>
			</div>

			<section v-if="answered.length" class="panel">
				<h2 class="sec-h in-panel">Answered <span>{{ answered.length }}</span></h2>
				<table class="t">
					<thead><tr><th>Profile</th><th class="hs">Position</th><th>Your answer</th><th class="hs">Now</th></tr></thead>
					<tbody>
						<tr v-for="p in answered" :key="p.name" @click="open(p)">
							<td><div class="ttl">{{ p.current_designation || p.profile_ref }}</div><div class="sub">{{ p.total_experience }}<span v-if="p.current_company">, {{ p.current_company }}</span></div></td>
							<td class="hs">{{ p.job_title }}</td>
							<td><Badge :label="p.manager_response" /></td>
							<td class="hs sub">{{ nowText(p) }}</td>
						</tr>
					</tbody>
				</table>
			</section>
		</template>

		<DetailPanel :visible="!!sel" :title="sel ? (sel.current_designation || sel.profile_ref) : ''" @close="sel = null">
			<template v-if="sel">
				<div class="card-top"><span class="ref">{{ sel.profile_ref }}</span><span :class="['score', scoreClass(sel)]">{{ scoreText(sel) }}</span></div>
				<dl class="kv">
					<div><dt>Position</dt><dd>{{ sel.job_title }}</dd></div>
					<div><dt>Experience</dt><dd>{{ sel.total_experience || '—' }}</dd></div>
					<div><dt>Company</dt><dd>{{ sel.current_company || '—' }}</dd></div>
					<div><dt>Industry</dt><dd>{{ sel.industry || '—' }}</dd></div>
					<div><dt>Location</dt><dd>{{ sel.current_location || '—' }}</dd></div>
					<div><dt>Open to</dt><dd>{{ sel.preferred_locations || '—' }}</dd></div>
					<div><dt>Notice period</dt><dd>{{ sel.notice_period || '—' }}</dd></div>
					<div><dt>Current salary</dt><dd>{{ sel.annual_salary || '—' }}</dd></div>
					<div><dt>Graduation</dt><dd>{{ [sel.ug_degree, sel.ug_specialization, sel.ug_year].filter(Boolean).join(', ') || '—' }}</dd></div>
					<div><dt>Post graduation</dt><dd>{{ [sel.pg_degree, sel.pg_specialization, sel.pg_year].filter(Boolean).join(', ') || '—' }}</dd></div>
				</dl>
				<div class="sec" v-if="sel.key_skills"><h4>Skills</h4><div class="tags"><span v-for="s in skillList(sel)" :key="s" class="tag">{{ s }}</span></div></div>
				<div class="sec" v-if="sel.resume_headline || sel.summary"><h4>About</h4><p>{{ sel.resume_headline }}</p><p class="sub">{{ sel.summary }}</p></div>
				<div class="sec" v-if="sel.ai_summary"><h4>AI screening</h4><p>{{ sel.ai_summary }}</p></div>
				<div class="sec" v-if="sel.manager_response"><h4>Your answer</h4><p><Badge :label="sel.manager_response" /> <span class="sub">{{ sel.manager_note }}</span></p></div>
			</template>
			<template #actions v-if="sel && !sel.manager_response">
				<button class="btn dan" type="button" @click="ask(sel, 'Not Interested')">Not interested</button>
				<button class="btn pri" type="button" @click="ask(sel, 'Interested')">Interested</button>
			</template>
		</DetailPanel>

		<Dialog :visible="resp.show" :title="resp.answer === 'Interested' ? 'You’re interested' : 'Not interested'" :submit-label="resp.answer === 'Interested' ? 'Tell HR I’m interested' : 'Tell HR'" :loading="resp.busy" @close="resp.show = false" @submit="send">
			<p class="muted">{{ resp.answer === 'Interested' ? 'HR will invite this person to apply for the position.' : 'HR will not take this profile further for this position.' }}</p>
			<div class="fld">
				<label>Note for HR (optional)</label>
				<textarea v-model="resp.note" class="in" rows="3" :placeholder="resp.answer === 'Interested' ? 'Anything HR should ask or check' : 'What is missing'"></textarea>
			</div>
		</Dialog>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';

export default {
	name: 'SharedProfilesTab',
	components: { Badge, Dialog, DetailPanel, Toast },
	data() {
		return {
			prospects: [], loading: true, sel: null,
			resp: { show: false, p: null, answer: '', note: '', busy: false },
			toast: { show: false, msg: '', type: 'success' }
		};
	},
	computed: {
		waiting() { return this.prospects.filter(p => !p.manager_response); },
		answered() { return this.prospects.filter(p => p.manager_response); }
	},
	mounted() { this.load(); },
	methods: {
		api(method, args = {}) {
			return new Promise((resolve, reject) => {
				frappe.call({ method, args, callback: r => resolve(r.message), error: reject });
			});
		},
		async load() {
			try {
				const r = await this.api('workforce.talent.get_shared_prospects');
				this.prospects = (r && r.prospects) || [];
			} catch (e) { /* shown by frappe */ }
			this.loading = false;
		},
		countBy(ans) { return this.prospects.filter(p => p.manager_response === ans).length; },
		scoreText(p) {
			if (p.screening_status === 'Pending') return 'Scoring…';
			if (p.screening_status === 'Failed') return 'No score';
			return (p.ai_score || 0) + (p.ai_grade ? ' ' + p.ai_grade : '');
		},
		scoreClass(p) { return p.screening_status === 'Screened' ? 's-' + (p.ai_grade || 'X') : 's-pend'; },
		skillList(p) { return (p.key_skills || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 12); },
		nowText(p) {
			return { Invited: 'HR invited them to apply', Applied: 'They applied', Interested: 'With HR', 'Not Interested': 'Closed' }[p.status] || '';
		},
		open(p) { this.sel = p; },
		ask(p, answer) { this.resp = { show: true, p, answer, note: '', busy: false }; },
		async send() {
			this.resp.busy = true;
			try {
				const r = await this.api('workforce.talent.respond_prospect', { prospect: this.resp.p.name, response: this.resp.answer, note: this.resp.note });
				this.toast = { show: true, msg: r.message, type: 'success' };
				this.resp.show = false;
				this.sel = null;
				await this.load();
			} catch (e) { /* shown by frappe */ }
			this.resp.busy = false;
		}
	}
};
</script>

<style scoped>
.sp-head { margin-bottom: 22px; }
.sp-head h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.02em; color: var(--wf-ink); }
.sp-head p { margin: 5px 0 0; color: var(--wf-mut); max-width: 72ch; }
.kpis { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 24px; }
.kpi { background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; }
.kpi.dec { box-shadow: inset 0 3px 0 var(--wf-amber); }
.kpi .n { font-size: 28px; font-weight: 600; color: var(--wf-primary); line-height: 1.1; font-variant-numeric: tabular-nums; }
.kpi .l { font-size: 13px; color: var(--wf-mut); margin-top: 4px; }
.sec-h { margin: 0 0 12px; font-size: 16px; font-weight: 600; color: var(--wf-ink); }
.sec-h span { color: var(--wf-mut); font-weight: 500; font-size: 13px; margin-left: 6px; }
.sec-h.in-panel { padding: 18px 20px 0; }
.cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(420px, 100%), 1fr)); gap: 16px; margin-bottom: 26px; }
.card { position: relative; background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; padding: 18px 20px 16px 25px; overflow: hidden; display: flex; flex-direction: column; }
.card.dec::before { content: ""; position: absolute; left: 0; top: 0; bottom: 0; width: 5px; background: var(--wf-amber); }
.card-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 6px; }
.ref { font-size: 12.5px; font-weight: 600; color: var(--wf-amber-ink); }
.card h3 { margin: 2px 0 2px; font-size: 18px; font-weight: 600; letter-spacing: -.01em; color: var(--wf-ink); }
.ctx { color: var(--wf-mut); font-size: 13.5px; }
.facts { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
.fact { height: 26px; padding: 0 10px; border-radius: 7px; background: var(--wf-line-2); border: 1px solid #EEF0F4; display: inline-flex; align-items: center; font-size: 12.5px; color: var(--wf-mut); }
.fact b { color: var(--wf-ink); font-weight: 500; margin-left: 5px; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; }
.tag { height: 26px; padding: 0 10px; border-radius: 7px; background: var(--wf-primary-tint); color: var(--wf-primary-2); display: inline-flex; align-items: center; font-size: 12.5px; font-weight: 500; }
.ai { margin: 4px 0 8px; color: var(--wf-ink-2); font-size: 13.5px; }
.hrnote { margin: 0 0 12px; font-size: 13.5px; background: var(--wf-amber-tint); color: var(--wf-amber-ink); border-radius: 8px; padding: 8px 10px; }
.foot { margin-top: auto; display: flex; gap: 8px; justify-content: flex-end; flex-wrap: wrap; }
.score { display: inline-grid; place-items: center; min-width: 44px; height: 24px; padding: 0 8px; border-radius: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.s-A { background: var(--wf-ok-tint); color: var(--wf-ok); }
.s-B { background: var(--wf-primary-tint); color: var(--wf-primary-2); }
.s-C, .s-D { background: var(--wf-hold-tint); color: var(--wf-hold); }
.s-X, .s-pend { background: #F3F4F6; color: var(--wf-mut); }
.panel { background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; }
.t { width: 100%; border-collapse: collapse; margin-top: 8px; }
.t th { text-align: left; font-size: 12.5px; font-weight: 500; color: var(--wf-mut-2); padding: 12px 16px 10px; border-bottom: 1px solid var(--wf-line); }
.t td { padding: 13px 16px; border-bottom: 1px solid var(--wf-line-2); }
.t th:first-child, .t td:first-child { padding-left: 20px; }
.t tbody tr { cursor: pointer; }
.t tbody tr:hover td { background: #FAFAFD; }
.ttl { font-weight: 600; }
.sub { font-size: 13px; color: var(--wf-mut); }
.btn { height: 36px; padding: 0 14px; border-radius: 9px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-ink-2); font: inherit; font-weight: 500; font-size: 13.5px; cursor: pointer; }
.btn:hover { background: var(--wf-line-2); }
.btn.pri { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.btn.pri:hover { background: var(--wf-primary-2); }
.btn.dan { color: var(--wf-bad); border-color: #F5C2C2; }
.btn.dan:hover { background: var(--wf-bad-tint); }
.empty { text-align: center; padding: 56px 20px; background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; }
.empty h3 { margin: 0 0 6px; font-size: 17px; font-weight: 600; }
.empty p { margin: 0; color: var(--wf-mut); }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin: 14px 0 20px; }
.kv dt { font-size: 12.5px; color: var(--wf-mut-2); }
.kv dd { margin: 2px 0 0; font-weight: 500; }
.sec { margin-bottom: 18px; }
.sec h4 { margin: 0 0 8px; font-size: 13.5px; font-weight: 600; }
.sec p { margin: 0 0 4px; }
.fld label { display: block; font-weight: 500; margin-bottom: 6px; }
.in { box-sizing: border-box; width: 100%; border: 1px solid var(--wf-line); border-radius: 9px; padding: 10px 12px; font: inherit; }
.in:focus { outline: none; border-color: var(--wf-primary-2); box-shadow: 0 0 0 3px var(--wf-primary-tint); }
.muted { color: var(--wf-mut); margin-top: 0; }
@media (max-width: 900px) {
	.kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.hs { display: none; }
	.kv { grid-template-columns: 1fr; }
}
</style>