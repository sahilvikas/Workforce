<template>
	<div class="talent-tab">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="tab-header">
			<h2>Talent Search</h2>
			<button v-if="eligibleCount" class="btn-primary" @click="bulkInvite" :disabled="saving">
				Bulk Invite 80%+ ({{ eligibleCount }})
			</button>
		</div>

		<!-- Upload -->
		<div class="upload-section">
			<div class="upload-card">
				<h3>Import Candidates from CSV</h3>
				<div class="upload-row">
					<div class="form-group">
						<label>Job Opening *</label>
						<select v-model="selectedJob" class="form-input">
							<option value="">Select job opening...</option>
							<option v-for="j in jobs" :key="j.name" :value="j.name">{{ j.job_title }}</option>
						</select>
					</div>
					<div class="form-group">
						<label>CSV File *</label>
						<input type="file" accept=".csv" @change="handleFile" class="form-input file-input" ref="fileInput" />
					</div>
				</div>
				<p class="csv-hint">CSV columns: name, email, phone, skills, experience_years, current_company, source_portal, profile_url</p>

				<div v-if="csvPreview.length" class="preview-section">
					<h4>Preview ({{ csvPreview.length }} rows)</h4>
					<div class="preview-table-wrap">
						<table class="wf-table preview-table">
							<thead><tr><th v-for="col in csvColumns" :key="col">{{ col }}</th></tr></thead>
							<tbody>
								<tr v-for="(row, i) in csvPreview.slice(0, 5)" :key="i">
									<td v-for="col in csvColumns" :key="col">{{ row[col] || '—' }}</td>
								</tr>
								<tr v-if="csvPreview.length > 5"><td :colspan="csvColumns.length" class="center-text">... and {{ csvPreview.length - 5 }} more rows</td></tr>
							</tbody>
						</table>
					</div>
					<button class="btn-primary" @click="importProspects" :disabled="!selectedJob || saving" style="margin-top: 12px;">
						{{ saving ? 'Importing...' : 'Import & Auto-Match' }}
					</button>
				</div>
			</div>
		</div>

		<!-- KPIs -->
		<div v-if="prospects.length" class="kpi-row">
			<KpiCard label="Total Prospects" :value="prospects.length" />
			<KpiCard label="80%+ Match" :value="prospects.filter(p => p.match_score >= 80).length" />
			<KpiCard label="Invited" :value="prospects.filter(p => p.outreach_status === 'Invited').length" />
			<KpiCard label="Applied" :value="prospects.filter(p => p.outreach_status === 'Applied').length" />
		</div>

		<!-- Filters -->
		<div v-if="prospects.length" class="filters-row">
			<input v-model="searchQuery" type="text" placeholder="Search by name, email, skills..." class="search-input" />
			<select v-model="scoreFilter" class="filter-select">
				<option value="">All Scores</option>
				<option value="80">80%+ Match</option>
				<option value="50">50%+ Match</option>
				<option value="low">Below 50%</option>
			</select>
			<select v-model="outreachFilter" class="filter-select">
				<option value="">All Statuses</option>
				<option value="Pending">Pending</option>
				<option value="Invited">Invited</option>
				<option value="Responded">Responded</option>
				<option value="Applied">Applied</option>
				<option value="Declined">Declined</option>
			</select>
		</div>

		<!-- Prospects Table -->
		<div v-if="prospects.length" class="table-wrapper">
			<table class="wf-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Email</th>
						<th>Skills</th>
						<th>Experience</th>
						<th>Source</th>
						<th>Match Score</th>
						<th>Status</th>
						<th>Action</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="p in filteredProspects" :key="p.name || p.email" class="clickable-row" @click="openDetail(p)">
						<td class="name-cell">{{ p.prospect_name }}</td>
						<td>{{ p.email }}</td>
						<td class="skills-cell">{{ truncate(p.skills, 40) }}</td>
						<td>{{ p.experience_years ? p.experience_years + ' yrs' : '—' }}</td>
						<td>{{ p.source_portal || '—' }}</td>
						<td><span class="score-badge" :class="scoreClass(p.match_score)">{{ p.match_score }}%</span></td>
						<td><Badge :label="p.outreach_status || 'Pending'" /></td>
						<td @click.stop>
							<button v-if="p.outreach_status === 'Pending'" class="btn-invite" @click="sendInvite(p)" :disabled="saving">Send Invite</button>
							<span v-else class="text-muted">{{ p.outreach_status }}</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Empty state -->
		<div v-if="!prospects.length && !csvPreview.length" class="empty-state">
			<div class="empty-icon">🔍</div>
			<h3>No prospects yet</h3>
			<p>Upload a CSV file to import candidates and auto-match them against job requirements</p>
		</div>

		<!-- Detail Panel -->
		<DetailPanel :visible="showPanel" :title="selectedProspect ? selectedProspect.prospect_name : ''" @close="showPanel = false">
			<div v-if="selectedProspect" class="detail-content">
				<div class="detail-row"><span class="detail-label">Status</span><Badge :label="selectedProspect.outreach_status || 'Pending'" /></div>
				<div class="detail-row"><span class="detail-label">Email</span><span>{{ selectedProspect.email }}</span></div>
				<div class="detail-row"><span class="detail-label">Phone</span><span>{{ selectedProspect.phone || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Experience</span><span>{{ selectedProspect.experience_years ? selectedProspect.experience_years + ' years' : '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Current Company</span><span>{{ selectedProspect.current_company || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Source</span><span>{{ selectedProspect.source_portal || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Match Score</span><span class="score-badge" :class="scoreClass(selectedProspect.match_score)">{{ selectedProspect.match_score }}%</span></div>
				<div class="detail-row"><span class="detail-label">Matched Job</span><span>{{ selectedProspect.matched_job || '—' }}</span></div>
				<div v-if="selectedProspect.profile_url" class="detail-row">
					<span class="detail-label">Profile</span>
					<a :href="selectedProspect.profile_url" target="_blank" class="profile-link">View Profile</a>
				</div>
				<div v-if="selectedProspect.skills" class="detail-section">
					<span class="detail-label">Skills</span>
					<div class="skills-tags">
						<span v-for="s in selectedProspect.skills.split(',')" :key="s" class="skill-tag">{{ s.trim() }}</span>
					</div>
				</div>
				<div v-if="selectedProspect.invited_on" class="detail-row"><span class="detail-label">Invited On</span><span>{{ formatDate(selectedProspect.invited_on) }}</span></div>
			</div>
			<template #actions>
				<button v-if="selectedProspect && selectedProspect.outreach_status === 'Pending'" class="btn-primary" @click="sendInvite(selectedProspect)" :disabled="saving">Send Invite</button>
			</template>
		</DetailPanel>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import KpiCard from './shared/KpiCard.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';

export default {
	name: 'TalentSearchTab',
	components: { Badge, KpiCard, DetailPanel, Toast },

	data() {
		return {
			jobs: [],
			prospects: [],
			selectedJob: '',
			csvPreview: [],
			csvColumns: [],
			csvRaw: [],
			loading: false,
			saving: false,
			searchQuery: '',
			scoreFilter: '',
			outreachFilter: '',
			showPanel: false,
			selectedProspect: null,
			toast: { show: false, msg: '', type: 'success' }
		};
	},

	computed: {
		eligibleCount() {
			return this.prospects.filter(p => p.match_score >= 80 && p.outreach_status === 'Pending').length;
		},
		filteredProspects() {
			return this.prospects.filter(p => {
				const q = this.searchQuery.toLowerCase();
				const matchSearch = !q || (p.prospect_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q) || (p.skills || '').toLowerCase().includes(q);
				let matchScore = true;
				if (this.scoreFilter === '80') matchScore = p.match_score >= 80;
				else if (this.scoreFilter === '50') matchScore = p.match_score >= 50;
				else if (this.scoreFilter === 'low') matchScore = p.match_score < 50;
				const matchOutreach = !this.outreachFilter || p.outreach_status === this.outreachFilter;
				return matchSearch && matchScore && matchOutreach;
			});
		}
	},

	mounted() {
		this.loadJobs();
		this.loadProspects();
	},

	methods: {
		scoreClass(score) { if (score >= 80) return 'score-high'; if (score >= 50) return 'score-mid'; return 'score-low'; },
		truncate(str, len) { if (!str) return '—'; return str.length > len ? str.slice(0, len) + '...' : str; },

		async api(method, params = {}) {
			return new Promise((resolve, reject) => {
				frappe.call({
					method: method,
					args: params,
					async: true,
					callback: r => resolve(r.message),
					error: reject
				});
			});
		},

		async loadJobs() {
			try {
				const res = await this.api('wf_get_open_positions');
				this.jobs = res || [];
			} catch (e) {
				try {
					this.jobs = await this.api('frappe.client.get_list', {
						doctype: 'WF Job Opening',
						fields: ['name', 'job_title'],
						filters: { status: 'Open' },
						limit_page_length: 0
					});
				} catch (e2) { /* silent */ }
			}
		},

		async loadProspects() {
			try {
				this.prospects = await this.api('frappe.client.get_list', {
					doctype: 'WF Prospect',
					fields: ['*'],
					limit_page_length: 0,
					order_by: 'match_score desc'
				});
			} catch (e) { /* WF Prospect doctype may not exist yet */ }
		},

		handleFile(e) {
			const file = e.target.files[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (evt) => {
				const lines = evt.target.result.split('\n').filter(l => l.trim());
				if (lines.length < 2) { this.showToast('CSV must have header + at least 1 row', 'error'); return; }
				const headers = this.parseCSVLine(lines[0]);
				this.csvColumns = headers;
				this.csvRaw = [];
				this.csvPreview = [];
				for (let i = 1; i < lines.length; i++) {
					const values = this.parseCSVLine(lines[i]);
					const row = {};
					headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim(); });
					this.csvRaw.push(row);
					this.csvPreview.push(row);
				}
				this.showToast('Parsed ' + this.csvPreview.length + ' rows', 'info');
			};
			reader.readAsText(file);
		},

		parseCSVLine(line) {
			const result = [];
			let current = '';
			let inQuotes = false;
			for (let i = 0; i < line.length; i++) {
				const ch = line[i];
				if (ch === '"') { inQuotes = !inQuotes; }
				else if (ch === ',' && !inQuotes) { result.push(current); current = ''; }
				else { current += ch; }
			}
			result.push(current);
			return result;
		},

		async importProspects() {
			if (!this.selectedJob) { this.showToast('Select a job opening first', 'error'); return; }
			if (!this.csvRaw.length) { this.showToast('No CSV data to import', 'error'); return; }
			this.saving = true;
			try {
				// Call custom Server Script API
				const res = await this.api('wf_import_prospects', {
					job_opening: this.selectedJob,
					prospects: JSON.stringify(this.csvRaw)
				});
				this.csvPreview = [];
				this.csvRaw = [];
				this.csvColumns = [];
				if (this.$refs.fileInput) this.$refs.fileInput.value = '';
				this.showToast('Prospects imported & scored!');
				await this.loadProspects();
			} catch (e) {
				this.showToast('Import failed: ' + (e.message || e), 'error');
			}
			this.saving = false;
		},

		async sendInvite(prospect) {
			this.saving = true;
			try {
				await this.api('wf_send_invite', {
					prospect_name: prospect.name
				});
				prospect.outreach_status = 'Invited';
				prospect.invited_on = new Date().toISOString();
				this.showToast('Invite sent to ' + prospect.prospect_name);
			} catch (e) {
				this.showToast('Failed to send invite', 'error');
			}
			this.saving = false;
		},

		async bulkInvite() {
			const eligible = this.prospects.filter(p => p.match_score >= 80 && p.outreach_status === 'Pending');
			if (!eligible.length) return;
			if (!confirm('Send invites to ' + eligible.length + ' prospects with 80%+ match?')) return;
			this.saving = true;
			try {
				await this.api('wf_bulk_invite', {
					prospect_names: JSON.stringify(eligible.map(p => p.name))
				});
				eligible.forEach(p => {
					p.outreach_status = 'Invited';
					p.invited_on = new Date().toISOString();
				});
				this.showToast(eligible.length + ' invites sent!');
			} catch (e) {
				this.showToast('Bulk invite failed', 'error');
			}
			this.saving = false;
		},

		openDetail(prospect) { this.selectedProspect = prospect; this.showPanel = true; },

		formatDate(d) {
			if (!d) return '—';
			return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		},

		showToast(msg, type = 'success') { this.toast = { show: true, msg, type }; }
	}
};
</script>

<style scoped>
.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tab-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.upload-section { margin-bottom: 24px; }
.upload-card { background: #fff; border: 2px dashed #d1d5db; border-radius: 12px; padding: 24px; }
.upload-card h3 { margin: 0 0 16px; font-size: 16px; font-weight: 600; color: #374151; }
.upload-row { display: flex; gap: 16px; margin-bottom: 12px; }
.csv-hint { font-size: 12px; color: #9ca3af; margin: 8px 0 0; }
.form-group { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: #4f46e5; }
.file-input { padding: 8px; }
.preview-section { margin-top: 16px; }
.preview-section h4 { margin: 0 0 10px; font-size: 14px; color: #374151; }
.preview-table-wrap { overflow-x: auto; border: 1px solid #e5e7eb; border-radius: 8px; }
.preview-table { font-size: 13px; min-width: 600px; }
.preview-table th { padding: 8px 12px; font-size: 11px; }
.preview-table td { padding: 8px 12px; font-size: 13px; }
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px; }
.filters-row { display: flex; gap: 12px; margin-bottom: 20px; }
.search-input { flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; min-width: 0; }
.search-input:focus { border-color: #4f46e5; }
.filter-select { padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff; min-width: 130px; }
.table-wrapper { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow-x: auto; }
.wf-table { width: 100%; border-collapse: collapse; min-width: 850px; }
.wf-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.wf-table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: #f9fafb; }
.name-cell { font-weight: 600; color: #111827; }
.skills-cell { color: #6b7280; font-size: 13px; }
.center-text { text-align: center; color: #9ca3af; }
.text-muted { color: #9ca3af; font-size: 13px; }
.score-badge { display: inline-block; padding: 2px 10px; border-radius: 10px; font-size: 12px; font-weight: 700; }
.score-high { background: #dcfce7; color: #166534; }
.score-mid { background: #ffedd5; color: #9a3412; }
.score-low { background: #fee2e2; color: #991b1b; }
.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-invite { background: #10b981; color: #fff; border: none; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; }
.btn-invite:hover { background: #059669; }
.btn-invite:disabled { opacity: 0.6; cursor: not-allowed; }
.detail-content { display: flex; flex-direction: column; gap: 16px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.detail-label { font-size: 13px; font-weight: 600; color: #6b7280; }
.detail-section { padding: 8px 0; }
.profile-link { color: #4f46e5; font-weight: 600; text-decoration: none; }
.profile-link:hover { text-decoration: underline; }
.skills-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.skill-tag { padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; background: #eef2ff; color: #4338ca; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-state h3 { font-size: 18px; color: #374151; margin: 0 0 8px; }
.empty-state p { color: #9ca3af; font-size: 14px; }

@media (max-width: 1024px) {
	.kpi-row { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
	.wf-table th, .wf-table td { padding: 10px 12px; }
}
@media (max-width: 768px) {
	.tab-header { flex-direction: column; align-items: flex-start; gap: 12px; }
	.upload-row { flex-direction: column; gap: 10px; }
	.filters-row { flex-direction: column; gap: 8px; }
	.filter-select { width: 100%; min-width: auto; }
	.upload-card { padding: 16px; }
}
</style>