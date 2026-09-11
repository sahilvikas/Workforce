<template>
	<div class="ts">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="ts-head">
			<div>
				<h1>Talent search</h1>
				<p>Profiles you find on Naukri or elsewhere. Import the file, check the AI score, share with the hiring manager, and invite the good ones to apply.</p>
			</div>
			<button class="btn pri" type="button" @click="openImport">
				<svg viewBox="0 0 24 24"><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" /></svg>
				Import profiles
			</button>
		</div>

		<div class="kpis">
			<div class="kpi" v-for="k in kpis" :key="k.label">
				<span class="n">{{ k.value }}</span>
				<span class="l">{{ k.label }}</span>
			</div>
		</div>

		<section class="panel">
			<div class="toolbar">
				<div class="search">
					<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
					<input v-model="q" class="in" placeholder="Search by name, skills or company" />
				</div>
				<select v-model="jobFilter" class="in sel">
					<option value="">All positions</option>
					<option v-for="j in jobs" :key="j.name" :value="j.name">{{ j.job_title }}</option>
				</select>
				<div class="chips">
					<button v-for="c in statusChips" :key="c.key" type="button" class="chip" :class="{ on: statusFilter === c.key }" @click="statusFilter = c.key">
						{{ c.label }} <span class="c">{{ c.count }}</span>
					</button>
				</div>
			</div>

			<div v-if="loading" class="empty"><p>Loading profiles…</p></div>
			<div v-else-if="!filtered.length" class="empty">
				<h3>{{ prospects.length ? 'No profiles match' : 'No profiles yet' }}</h3>
				<p>{{ prospects.length ? 'Try another filter or clear the search.' : 'Export profiles from Naukri Resdex (Excel), then click Import profiles.' }}</p>
			</div>
			<table v-else class="t">
				<thead>
					<tr><th>Profile</th><th class="hs">Position</th><th class="hs">Experience</th><th>AI score</th><th>Status</th><th></th></tr>
				</thead>
				<tbody>
					<tr v-for="p in filtered" :key="p.name" @click="openDetail(p)">
						<td>
							<div class="ttl">{{ p.full_name }}</div>
							<div class="sub">{{ p.current_designation || p.resume_headline || '—' }}<span v-if="p.current_location">, {{ p.current_location }}</span></div>
						</td>
						<td class="hs">{{ p.job_title }}</td>
						<td class="hs">{{ p.total_experience || '—' }}</td>
						<td><span :class="['score', scoreClass(p)]">{{ scoreText(p) }}</span></td>
						<td>
							<Badge :label="displayStatus(p)" />
							<div v-if="p.manager_response" class="sub mr">{{ p.shared_with_name }}: {{ p.manager_response.toLowerCase() }}</div>
						</td>
						<td class="acts" @click.stop>
							<button class="btn sm" type="button" :disabled="!!p.applied_as" @click="openShare(p)">Share</button>
							<button class="btn sm" type="button" :disabled="!p.email || !!p.applied_as" @click="openInvite(p)">Invite</button>
						</td>
					</tr>
				</tbody>
			</table>
		</section>

		<!-- import -->
		<Dialog :visible="imp.show" title="Import profiles" :submit-label="imp.result ? 'Done' : 'Import'" :loading="imp.busy" @close="imp.show = false" @submit="doImport">
			<div class="fld">
				<label>For which position <span class="req">*</span></label>
				<select v-model="imp.job" class="in">
					<option value="">Choose a position</option>
					<option v-for="j in openJobs" :key="j.name" :value="j.name">{{ j.job_title }}</option>
				</select>
				<div class="hint">Each profile is scored against this position’s description and skills.</div>
			</div>
			<div class="fld">
				<label>File <span class="req">*</span></label>
				<button type="button" class="drop" @click="pickFile">
					<b>{{ imp.fileName || 'Choose the Excel or CSV file' }}</b>
					<span>.xlsx, .xls or .csv, straight from Naukri Resdex</span>
				</button>
			</div>
			<div class="note">Gender, date of birth, marital status and address are never imported, and they are not used for scoring.</div>
			<div v-if="imp.result" class="result">
				<b>{{ imp.result.created }} imported.</b>
				<span v-if="imp.result.duplicate_count"> {{ imp.result.duplicate_count }} already in the list (skipped).</span>
				<span v-if="imp.result.already_applied_count"> {{ imp.result.already_applied_count }} have already applied (skipped).</span>
				<div class="sub">AI scores appear within a few minutes.</div>
			</div>
		</Dialog>

		<!-- share -->
		<Dialog :visible="share.show" title="Share with the hiring manager" submit-label="Share" :loading="share.busy" @close="share.show = false" @submit="doShare">
			<p class="muted">They see experience, skills, salary and notice period. Name, phone, email and the Naukri link stay with HR.</p>
			<div class="fld">
				<label>Share with <span class="req">*</span></label>
				<select v-model="share.to" class="in">
					<option value="">Choose</option>
					<option v-for="m in managers" :key="m.email" :value="m.email">{{ m.full_name }}</option>
				</select>
			</div>
			<div class="fld">
				<label>Note for them</label>
				<textarea v-model="share.note" class="in ta" rows="3" placeholder="Why this profile could fit"></textarea>
			</div>
		</Dialog>

		<!-- invite -->
		<Dialog :visible="inv.show" title="Invite to apply" submit-label="Send invite" :loading="inv.busy" @close="inv.show = false" @submit="doInvite">
			<p v-if="inv.p">An email goes from hr@ to <b>{{ inv.p.email }}</b> with the apply link for <b>{{ inv.p.job_title }}</b>. When they apply, they show up in Candidates like anyone else.</p>
			<p v-if="inv.p && inv.p.manager_response !== 'Interested'" class="warn">The hiring manager hasn’t said they’re interested yet.</p>
		</Dialog>

		<!-- detail -->
		<DetailPanel :visible="!!sel" :title="sel ? sel.full_name : ''" size="md" @close="sel = null">
			<template v-if="sel">
				<div class="pills"><Badge :label="displayStatus(sel)" /><span class="sub">{{ sel.name }}</span></div>
				<div class="ai" v-if="sel.screening_status === 'Screened'">
					<span :class="['score', 'big', scoreClass(sel)]">{{ scoreText(sel) }}</span>
					<div><b>AI screening</b><p>{{ sel.ai_summary }}</p><p class="sub">{{ sel.ai_notes }}</p></div>
				</div>
				<div class="note" v-else-if="sel.screening_status === 'Pending'">AI score is being prepared. It appears within a few minutes.</div>
				<div class="note warn" v-else>{{ sel.ai_notes || 'Could not be scored. Please review manually.' }}</div>

				<dl class="kv">
					<div><dt>Position</dt><dd>{{ sel.job_title }}</dd></div>
					<div><dt>Experience</dt><dd>{{ sel.total_experience || '—' }}</dd></div>
					<div><dt>Current role</dt><dd>{{ sel.current_designation || '—' }}</dd></div>
					<div><dt>Company</dt><dd>{{ sel.current_company || '—' }}</dd></div>
					<div><dt>Location</dt><dd>{{ sel.current_location || '—' }}</dd></div>
					<div><dt>Notice period</dt><dd>{{ sel.notice_period || '—' }}</dd></div>
					<div><dt>Current salary</dt><dd>{{ sel.annual_salary || '—' }}</dd></div>
					<div><dt>Email</dt><dd>{{ sel.email || '—' }}</dd></div>
					<div><dt>Phone</dt><dd>{{ sel.phone || '—' }}</dd></div>
					<div><dt>Education</dt><dd>{{ [sel.ug_degree, sel.ug_specialization].filter(Boolean).join(', ') || '—' }}</dd></div>
				</dl>
				<div class="sec" v-if="sel.key_skills"><h4>Skills</h4><div class="tags"><span v-for="s in skillList(sel)" :key="s" class="tag">{{ s }}</span></div></div>
				<div class="sec" v-if="sel.resume_headline || sel.summary"><h4>About</h4><p>{{ sel.resume_headline }}</p><p class="sub">{{ sel.summary }}</p></div>
				<div class="sec" v-if="sel.shared_with">
					<h4>Hiring manager</h4>
					<p>Shared with {{ sel.shared_with_name }}<span v-if="sel.share_note">: “{{ sel.share_note }}”</span></p>
					<p v-if="sel.manager_response"><Badge :label="sel.manager_response" /> <span class="sub">{{ sel.manager_note }}</span></p>
					<p v-else class="sub">Waiting for their answer.</p>
				</div>
				<div class="sec" v-if="sel.applied_as"><h4>Applied</h4><p>Now a candidate: {{ sel.applied_as }}</p></div>
				<div class="sec" v-if="sel.profile_link"><a :href="sel.profile_link" target="_blank" rel="noopener">Open the Naukri profile</a></div>
			</template>
			<template #actions v-if="sel && !sel.applied_as">
				<button class="btn" type="button" @click="openShare(sel)">Share with hiring manager</button>
				<button class="btn pri" type="button" :disabled="!sel.email" @click="openInvite(sel)">Invite to apply</button>
			</template>
		</DetailPanel>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';

const API = 'workforce.talent.';

export default {
	name: 'TalentSearchTab',
	components: { Badge, Dialog, DetailPanel, Toast },
	data() {
		return {
			prospects: [], jobs: [], managers: [], loading: true,
			q: '', jobFilter: '', statusFilter: 'all',
			sel: null,
			imp: { show: false, job: '', fileUrl: '', fileName: '', busy: false, result: null },
			share: { show: false, p: null, to: '', note: '', busy: false },
			inv: { show: false, p: null, busy: false },
			toast: { show: false, msg: '', type: 'success' },
			poll: null, pollCount: 0
		};
	},
	computed: {
		openJobs() { return this.jobs.filter(j => j.status === 'Open'); },
		filtered() {
			const q = this.q.trim().toLowerCase();
			return this.prospects.filter(p => {
				if (this.jobFilter && p.job_opening !== this.jobFilter) return false;
				if (this.statusFilter !== 'all' && this.displayStatus(p) !== this.statusFilter) return false;
				if (!q) return true;
				return [p.full_name, p.key_skills, p.current_company, p.current_designation, p.resume_headline].join(' ').toLowerCase().includes(q);
			});
		},
		statusChips() {
			const count = s => this.prospects.filter(p => this.displayStatus(p) === s).length;
			return [
				{ key: 'all', label: 'All', count: this.prospects.length },
				{ key: 'New', label: 'New', count: count('New') },
				{ key: 'Shared', label: 'Shared', count: count('Shared') },
				{ key: 'Interested', label: 'Interested', count: count('Interested') },
				{ key: 'Invited', label: 'Invited', count: count('Invited') },
				{ key: 'Applied', label: 'Applied', count: count('Applied') }
			];
		},
		kpis() {
			const n = f => this.prospects.filter(f).length;
			return [
				{ label: 'Profiles', value: this.prospects.length },
				{ label: 'Scored A or B', value: n(p => ['A', 'B'].includes(p.ai_grade)) },
				{ label: 'Waiting on hiring manager', value: n(p => this.displayStatus(p) === 'Shared') },
				{ label: 'Manager interested', value: n(p => this.displayStatus(p) === 'Interested') },
				{ label: 'Applied after invite', value: n(p => !!p.applied_as) }
			];
		}
	},
	mounted() {
		this.load();
		this.api('wf_get_job_openings').then(r => { this.jobs = r || []; }).catch(() => {});
		this.api(API + 'get_hiring_managers').then(r => { this.managers = r || []; }).catch(() => {});
	},
	beforeUnmount() { clearTimeout(this.poll); },
	methods: {
		api(method, args = {}) {
			return new Promise((resolve, reject) => {
				frappe.call({ method, args, callback: r => resolve(r.message), error: reject });
			});
		},
		notify(msg, type = 'success') { this.toast = { show: true, msg, type }; },
		async load() {
			try {
				const r = await this.api(API + 'get_prospects');
				this.prospects = (r && r.prospects) || [];
				if (this.sel) this.sel = this.prospects.find(p => p.name === this.sel.name) || null;
			} catch (e) { /* frappe shows the error */ }
			this.loading = false;
			this.schedulePoll();
		},
		// While profiles are still being scored, refresh quietly every 30s (max ~10 minutes)
		schedulePoll() {
			clearTimeout(this.poll);
			const pending = this.prospects.some(p => p.screening_status === 'Pending');
			if (pending && this.pollCount < 20) {
				this.pollCount++;
				this.poll = setTimeout(() => this.load(), 30000);
			}
		},
		displayStatus(p) { return p.applied_as ? 'Applied' : p.status; },
		scoreText(p) {
			if (p.screening_status === 'Pending') return 'Scoring…';
			if (p.screening_status === 'Failed') return 'Review';
			return (p.ai_score || 0) + (p.ai_grade ? ' ' + p.ai_grade : '');
		},
		scoreClass(p) {
			if (p.screening_status !== 'Screened') return 's-pend';
			return 's-' + (p.ai_grade || 'X');
		},
		skillList(p) { return (p.key_skills || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 20); },
		openDetail(p) { this.sel = p; },

		openImport() { this.imp = { show: true, job: this.jobFilter || '', fileUrl: '', fileName: '', busy: false, result: null }; },
		pickFile() {
			new frappe.ui.FileUploader({
				allow_multiple: false,
				make_attachments_public: false,
				restrictions: { allowed_file_types: ['.xlsx', '.xls', '.csv'] },
				on_success: file => { this.imp.fileUrl = file.file_url; this.imp.fileName = file.file_name; }
			});
		},
		async doImport() {
			if (this.imp.result) { this.imp.show = false; return; }
			if (!this.imp.job) { this.notify('Choose the position first.', 'error'); return; }
			if (!this.imp.fileUrl) { this.notify('Choose the file first.', 'error'); return; }
			this.imp.busy = true;
			try {
				const r = await this.api(API + 'import_prospects', { file_url: this.imp.fileUrl, job_opening: this.imp.job });
				this.imp.result = r;
				this.notify(r.message);
				this.pollCount = 0;
				await this.load();
			} catch (e) { /* frappe shows the reason */ }
			this.imp.busy = false;
		},

		openShare(p) {
			this.share = { show: true, p, to: p.shared_with || p.default_manager || '', note: p.share_note || '', busy: false };
		},
		async doShare() {
			if (!this.share.to) { this.notify('Choose who to share with.', 'error'); return; }
			this.share.busy = true;
			try {
				const r = await this.api(API + 'share_prospect', { prospect: this.share.p.name, share_with: this.share.to, note: this.share.note });
				this.notify(r.message);
				this.share.show = false;
				await this.load();
			} catch (e) { /* shown by frappe */ }
			this.share.busy = false;
		},

		openInvite(p) { this.inv = { show: true, p, busy: false }; },
		async doInvite() {
			this.inv.busy = true;
			try {
				const r = await this.api(API + 'invite_prospect', { prospect: this.inv.p.name });
				this.notify(r.message);
				this.inv.show = false;
				await this.load();
			} catch (e) { /* shown by frappe */ }
			this.inv.busy = false;
		}
	}
};
</script>

<style scoped>
.ts-head { display: flex; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 22px; }
.ts-head h1 { margin: 0; font-size: 26px; font-weight: 600; letter-spacing: -.02em; color: var(--wf-ink); }
.ts-head p { margin: 5px 0 0; color: var(--wf-mut); max-width: 72ch; }
.ts-head .btn { margin-left: auto; }
.kpis { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 12px; margin-bottom: 22px; }
.kpi { background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; padding: 16px; display: flex; flex-direction: column; }
.kpi .n { font-size: 28px; font-weight: 600; color: var(--wf-primary); line-height: 1.1; font-variant-numeric: tabular-nums; }
.kpi .l { font-size: 13px; color: var(--wf-mut); margin-top: 4px; }
.panel { background: #fff; border: 1px solid var(--wf-line); border-radius: 14px; }
.toolbar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; padding: 16px 20px 8px; }
.search { position: relative; flex: 1; min-width: 220px; }
.search svg { position: absolute; left: 12px; top: 11px; width: 18px; height: 18px; fill: none; stroke: var(--wf-mut-2); stroke-width: 1.8; }
.search .in { padding-left: 38px; }
.in { box-sizing: border-box; width: 100%; height: 40px; border: 1px solid var(--wf-line); border-radius: 9px; padding: 0 12px; background: #fff; font: inherit; color: var(--wf-ink); }
.in:focus { outline: none; border-color: var(--wf-primary-2); box-shadow: 0 0 0 3px var(--wf-primary-tint); }
.sel { width: auto; min-width: 200px; }
.ta { height: auto; padding: 10px 12px; }
.chips { display: flex; gap: 6px; flex-wrap: wrap; }
.chip { height: 32px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-mut); font: inherit; font-size: 13px; font-weight: 500; cursor: pointer; }
.chip .c { opacity: .7; margin-left: 2px; }
.chip.on { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.t { width: 100%; border-collapse: collapse; }
.t th { text-align: left; font-size: 12.5px; font-weight: 500; color: var(--wf-mut-2); padding: 12px 16px 10px; border-bottom: 1px solid var(--wf-line); }
.t td { padding: 13px 16px; border-bottom: 1px solid var(--wf-line-2); vertical-align: middle; }
.t tbody tr { cursor: pointer; }
.t tbody tr:hover td { background: #FAFAFD; }
.t th:first-child, .t td:first-child { padding-left: 20px; }
.ttl { font-weight: 600; color: var(--wf-ink); }
.sub { font-size: 13px; color: var(--wf-mut); }
.mr { margin-top: 3px; }
.acts { white-space: nowrap; text-align: right; }
.acts .btn + .btn { margin-left: 6px; }
.btn { height: 38px; padding: 0 15px; border-radius: 9px; border: 1px solid var(--wf-line); background: #fff; color: var(--wf-ink-2); font: inherit; font-weight: 500; font-size: 14px; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; }
.btn:hover { background: var(--wf-line-2); }
.btn.pri { background: var(--wf-primary); border-color: var(--wf-primary); color: #fff; }
.btn.pri:hover { background: var(--wf-primary-2); }
.btn.sm { height: 32px; padding: 0 11px; font-size: 13px; }
.btn:disabled { opacity: .45; cursor: not-allowed; }
.btn svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
.score { display: inline-grid; place-items: center; min-width: 44px; height: 24px; padding: 0 8px; border-radius: 6px; font-size: 12px; font-weight: 700; white-space: nowrap; }
.score.big { min-width: 64px; height: 40px; font-size: 16px; border-radius: 10px; }
.s-A { background: var(--wf-ok-tint); color: var(--wf-ok); }
.s-B { background: var(--wf-primary-tint); color: var(--wf-primary-2); }
.s-C, .s-D { background: var(--wf-hold-tint); color: var(--wf-hold); }
.s-X, .s-pend { background: #F3F4F6; color: var(--wf-mut); font-weight: 600; }
.empty { text-align: center; padding: 48px 20px; }
.empty h3 { margin: 0 0 6px; font-size: 17px; font-weight: 600; }
.empty p { margin: 0; color: var(--wf-mut); }
.fld { margin-bottom: 16px; }
.fld label { display: block; font-weight: 500; margin-bottom: 6px; }
.req { color: var(--wf-bad); }
.hint { font-size: 12.5px; color: var(--wf-mut); margin-top: 6px; }
.drop { width: 100%; border: 1.5px dashed var(--wf-line); border-radius: 12px; background: var(--wf-line-2); padding: 20px; text-align: center; cursor: pointer; font: inherit; color: var(--wf-mut); display: flex; flex-direction: column; gap: 4px; }
.drop b { color: var(--wf-ink); }
.drop:hover { border-color: var(--wf-primary-soft); }
.note { background: var(--wf-primary-tint); color: var(--wf-primary-2); border-radius: 10px; padding: 10px 14px; font-size: 13px; margin-bottom: 14px; }
.note.warn, .warn { background: var(--wf-amber-tint); color: var(--wf-amber-ink); border-radius: 10px; padding: 10px 14px; font-size: 13px; }
.result { background: var(--wf-ok-tint); color: var(--wf-ok); border-radius: 10px; padding: 12px 14px; font-size: 13.5px; }
.muted { color: var(--wf-mut); }
.pills { display: flex; gap: 10px; align-items: center; margin-bottom: 16px; }
.ai { display: flex; gap: 16px; align-items: flex-start; border: 1px solid var(--wf-line); border-radius: 12px; padding: 14px 16px; margin-bottom: 20px; }
.ai p { margin: 4px 0 0; }
.kv { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; margin: 0 0 20px; }
.kv dt { font-size: 12.5px; color: var(--wf-mut-2); }
.kv dd { margin: 2px 0 0; font-weight: 500; word-break: break-word; }
.sec { margin-bottom: 20px; }
.sec h4 { margin: 0 0 8px; font-size: 13.5px; font-weight: 600; }
.sec p { margin: 0 0 4px; }
.tags { display: flex; flex-wrap: wrap; gap: 6px; }
.tag { height: 26px; padding: 0 10px; border-radius: 7px; background: var(--wf-primary-tint); color: var(--wf-primary-2); display: inline-flex; align-items: center; font-size: 12.5px; font-weight: 500; }
@media (max-width: 900px) {
	.kpis { grid-template-columns: repeat(2, minmax(0, 1fr)); }
	.hs { display: none; }
	.kv { grid-template-columns: 1fr; }
}
</style>