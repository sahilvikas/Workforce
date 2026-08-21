<template>
	<div class="candidates-tab">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="tab-header">
			<h2>Candidates</h2>
			<div class="view-toggle">
				<button :class="{ active: view === 'pipeline' }" @click="view = 'pipeline'">Pipeline</button>
				<button :class="{ active: view === 'table' }" @click="view = 'table'">Table</button>
			</div>
		</div>

		<div class="kpi-row">
			<KpiCard label="Total" :value="candidates.length" />
			<KpiCard label="Shortlisted" :value="countByStatus('Shortlisted')" />
			<KpiCard label="In Interviews" :value="countByStatus('Interview Scheduled') + countByStatus('Interview In Progress')" />
			<KpiCard label="Selected" :value="countByStatus('Selected')" />
			<KpiCard label="Offer Sent" :value="countByStatus('Offer Sent')" />
		</div>

		<div class="filters-row">
			<input v-model="searchQuery" type="text" placeholder="Search by name, email..." class="search-input" />
			<select v-model="jobFilter" class="filter-select">
				<option value="">All Jobs</option>
				<option v-for="j in jobs" :key="j.name" :value="j.name">{{ j.job_title }}</option>
			</select>
			<select v-model="statusFilter" class="filter-select">
				<option value="">All Statuses</option>
				<option v-for="s in allStatuses" :key="s" :value="s">{{ s }}</option>
			</select>
		</div>

		<!-- Pipeline Views -->
		<div v-if="view === 'pipeline'" class="pipeline">
			<div v-for="stage in pipelineStages" :key="stage" class="pipeline-column">
				<div class="pipeline-header">
					<span>{{ stage }}</span>
					<span class="pipeline-count">{{ candidatesInStage(stage).length }}</span>
				</div>
				<div class="pipeline-cards">
					<div v-for="c in candidatesInStage(stage)" :key="c.name" class="pipeline-card" @click="openDetail(c)">
						<div class="card-name">{{ c.applicant_name }}</div>
						<div class="card-job">{{ c.job_title || c.job_opening }}</div>
						<div class="card-footer">
							<span v-if="c.ai_score" class="card-score">Score: {{ c.ai_score }}</span>
							<Badge :label="c.status" />
						</div>
					</div>
					<div v-if="candidatesInStage(stage).length === 0" class="empty-stage">No candidates</div>
				</div>
			</div>
		</div>

		<!-- Table View -->
		<div v-else class="table-wrapper">
			<table class="wf-table">
				<thead>
					<tr>
						<th>Name</th>
						<th>Email</th>
						<th>Job Opening</th>
						<th>Source</th>
						<th>Score</th>
						<th>Status</th>
						<th>Applied</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading"><td colspan="7" class="center-text">Loading...</td></tr>
					<tr v-else-if="filteredCandidates.length === 0"><td colspan="7" class="center-text">No candidates found</td></tr>
					<tr v-for="c in filteredCandidates" :key="c.name" class="clickable-row" @click="openDetail(c)">
						<td class="name-cell">{{ c.applicant_name }}</td>
						<td>{{ c.email }}</td>
						<td>{{ c.job_title || c.job_opening }}</td>
						<td>{{ c.source || '—' }}</td>
						<td>
							<span v-if="c.ai_score" class="score-badge" :class="scoreClass(c.ai_score)">{{ c.ai_score }}</span>
							<span v-else>—</span>
						</td>
						<td><Badge :label="c.status" /></td>
						<td>{{ formatDate(c.creation) }}</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Detail Panel -->
		<DetailPanel :visible="showPanel" :title="selected ? selected.applicant_name : ''" @close="closePanel">
			<div v-if="selected" class="detail-content">
				<div class="detail-row"><span class="detail-label">Status</span><Badge :label="selected.status" /></div>
				<div class="detail-row"><span class="detail-label">Email</span><span>{{ selected.email }}</span></div>
				<div class="detail-row"><span class="detail-label">Phone</span><span>{{ selected.phone || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Job Opening</span><span>{{ selected.job_title || selected.job_opening }}</span></div>
				<div class="detail-row"><span class="detail-label">Source</span><span>{{ selected.source || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">AI Score</span>
					<span v-if="selected.ai_score" class="score-badge" :class="scoreClass(selected.ai_score)">{{ selected.ai_score }}</span>
					<span v-else>—</span>
				</div>
				<div class="detail-row"><span class="detail-label">AI Grade</span><span>{{ selected.ai_grade || '—' }}</span></div>

				<div v-if="selected.screening_notes" class="detail-section">
					<span class="detail-label">Screening Notes</span>
					<div class="detail-desc">{{ selected.screening_notes }}</div>
				</div>
				<div v-if="selected.skills" class="detail-section">
					<span class="detail-label">Skills</span>
					<div class="detail-desc">{{ selected.skills }}</div>
				</div>
				<div v-if="selected.cover_letter" class="detail-section">
					<span class="detail-label">Cover Letter</span>
					<div class="detail-desc">{{ selected.cover_letter }}</div>
				</div>
				<div v-if="selected.resume" class="detail-section">
					<a :href="selected.resume" target="_blank" class="btn-link">View Resume</a>
				</div>

				<!-- Change Status -->
				<div class="detail-section">
					<span class="detail-label">Change Status</span>
					<select v-model="newStatus" class="form-input" style="margin-top: 6px;">
						<option v-for="s in allStatuses" :key="s" :value="s">{{ s }}</option>
					</select>
					<div class="status-actions">
						<button class="btn-primary btn-sm" @click="changeStatus" :disabled="newStatus === selected.status">Update Status</button>
						<button v-if="selected.status === 'Shortlisted'" class="btn-success btn-sm" @click="showScheduleDialog = true">Schedule Interview</button>
						<button v-if="selected.status === 'Selected'" class="btn-success btn-sm" @click="showOfferDialog = true">Create Offer</button>
					</div>
				</div>

				<!-- Interview History -->
				<div v-if="interviews.length" class="detail-section">
					<span class="detail-label">Interview History</span>
					<div v-for="iv in interviews" :key="iv.name" class="interview-card">
						<div class="iv-header">
							<span>Round {{ iv.round_number }}: {{ iv.round_name || 'Interview' }}</span>
							<Badge :label="iv.status" />
						</div>
						<div class="iv-details">
							<span>{{ formatDate(iv.scheduled_date) }}</span>
							<span v-if="iv.interviewer"> · {{ iv.interviewer }}</span>
							<span v-if="iv.rating"> · Rating: {{ iv.rating }}/5</span>
						</div>
						<a v-if="iv.google_meet_link" :href="iv.google_meet_link" target="_blank" class="btn-link" style="display:inline-block; margin-top:6px;">Join Google Meet</a>
						<div v-if="iv.recommendation" class="iv-rec"><Badge :label="iv.recommendation" /></div>
					</div>
				</div>
			</div>

		</DetailPanel>

		<!-- Schedule Interview Dialog -->
		<Dialog :visible="showScheduleDialog" title="Schedule Interviews" submitLabel="Schedule All" :loading="saving" size="lg" @close="showScheduleDialog = false" @submit="scheduleInterviews">
			<div v-if="templateRounds.length === 0" class="empty-msg">No interview template found. Add rounds manually:</div>
			<div class="rounds-list">
				<div v-for="(round, i) in scheduleForm.rounds" :key="i" class="round-row">
					<h4>Round {{ i + 1 }}: {{ round.round_name || 'Interview' }}</h4>
					<div class="form-grid">
						<div class="form-group"><label>Round Name</label><input v-model="round.round_name" class="form-input" placeholder="e.g. Technical Round" /></div>
						<div class="form-group"><label>Interviewer (User email)</label><input v-model="round.interviewer" class="form-input" placeholder="e.g. john@company.com" /></div>
						<div class="form-group"><label>Date *</label><input v-model="round.date" type="date" class="form-input" /></div>
						<div class="form-group"><label>Time</label><input v-model="round.time" type="time" class="form-input" /></div>
						<div class="form-group"><label>Duration (min)</label><input v-model.number="round.duration_minutes" type="number" class="form-input" placeholder="30" /></div>
					</div>
				</div>
			</div>
			<button class="btn-link" @click="addRound" style="margin-top: 8px;">+ Add Round</button>
		</Dialog>

		<!-- Create Offer Dialog -->
		<Dialog :visible="showOfferDialog" title="Create Offer Letter" submitLabel="Send Offer" :loading="saving" size="md" @close="showOfferDialog = false" @submit="createOffer">
			<div class="form-grid">
				<div class="form-group full"><label>Designation</label><input v-model="offerForm.designation" class="form-input" placeholder="e.g. Software Engineer" /></div>
				<div class="form-group"><label>Annual CTC</label><input v-model="offerForm.annual_ctc" type="number" class="form-input" placeholder="e.g. 800000" /></div>
				<div class="form-group"><label>Start Date</label><input v-model="offerForm.start_date" type="date" class="form-input" /></div>
				<div class="form-group full"><label>Terms & Notes</label><textarea v-model="offerForm.terms" class="form-input form-textarea" rows="4" placeholder="Offer terms..."></textarea></div>
			</div>
		</Dialog>
	</div>
</template>

<script>

// Deploy trigger: Google Meet integration - Aug 21

import Badge from './shared/Badge.vue';
import KpiCard from './shared/KpiCard.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';

export default {
	name: 'CandidatesTab',
	components: { Badge, KpiCard, Dialog, DetailPanel, Toast },

	data() {
		return {
			candidates: [],
			jobs: [],
			interviews: [],
			loading: false,
			saving: false,
			view: 'table',
			searchQuery: '',
			jobFilter: '',
			statusFilter: '',
			showPanel: false,
			selected: null,
			newStatus: '',
			showScheduleDialog: false,
			showOfferDialog: false,
			templateRounds: [],
			scheduleForm: { rounds: [] },
			offerForm: { designation: '', annual_ctc: '', start_date: '', terms: '' },
			toast: { show: false, msg: '', type: 'success' },
			allStatuses: [
				'Applied', 'Under Screening', 'Shortlisted', 'Rejected at Screening',
				'Interview Scheduled', 'Interview In Progress', 'All Rounds Complete',
				'Selected', 'Not Selected', 'Offer Sent', 'Offer Accepted', 'Offer Declined',
				'Onboarding Initiated'
			],
			pipelineStages: ['Applied', 'Shortlisted', 'Interview Scheduled', 'Selected', 'Offer Sent', 'Offer Accepted']
		};
	},

	computed: {
		filteredCandidates() {
			return this.candidates.filter(c => {
				const q = this.searchQuery.toLowerCase();
				const matchSearch = !q || c.applicant_name.toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
				const matchJob = !this.jobFilter || c.job_opening === this.jobFilter;
				const matchStatus = !this.statusFilter || c.status === this.statusFilter;
				return matchSearch && matchJob && matchStatus;
			});
		}
	},

	mounted() {
		this.loadCandidates();
		this.loadJobs();
	},

	methods: {
		countByStatus(status) { return this.candidates.filter(c => c.status === status).length; },
		candidatesInStage(stage) { return this.filteredCandidates.filter(c => c.status === stage); },
		scoreClass(score) { if (score >= 70) return 'score-high'; if (score >= 40) return 'score-mid'; return 'score-low'; },

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

		async loadCandidates() {
			this.loading = true;
			try {
				// Use custom API — returns enriched data with job_title joined
				const res = await this.api('wf_get_dashboard_data');
				this.candidates = res.applicants || res || [];
			} catch (e) {
				// Fallback to generic API
				try {
					this.candidates = await this.api('frappe.client.get_list', {
						doctype: 'WF Applicant',
						fields: ['name', 'applicant_name', 'email', 'phone', 'job_opening', 'source', 'skills', 'ai_score', 'ai_grade', 'status', 'screening_notes', 'cover_letter', 'resume', 'creation'],
						limit_page_length: 0,
						order_by: 'creation desc'
					});
				} catch (e2) {
					this.showToast('Failed to load candidates', 'error');
				}
			}
			this.loading = false;
		},

		async loadJobs() {
			try {
				const res = await this.api('wf_get_open_positions');
				this.jobs = res || [];
			} catch (e) {
				try {
					this.jobs = await this.api('wf_get_job_openings');
				} catch (e2) { /* silent */ }
			}
		},

		async openDetail(candidate) {
			this.selected = candidate;
			this.newStatus = candidate.status;
			this.showPanel = true;
			try {
				this.interviews = await this.api('frappe.client.get_list', {
					doctype: 'WF Interview',
					fields: ['name', 'round_number', 'round_name', 'interviewer', 'scheduled_date', 'scheduled_time', 'status', 'rating', 'recommendation', 'feedback', 'google_meet_link'],
					filters: { applicant: candidate.name },
					order_by: 'round_number asc'
				});
			} catch (e) {
				this.interviews = [];
			}
			// Load template rounds if job has interview_template
			this.templateRounds = [];
			this.scheduleForm.rounds = [];
			if (candidate.job_opening) {
				try {
					const job = await this.api('frappe.client.get', {
						doctype: 'WF Job Opening', name: candidate.job_opening
					});
					if (job.interview_template) {
						const tmpl = await this.api('frappe.client.get', {
							doctype: 'WF Interview Template', name: job.interview_template
						});
						this.templateRounds = tmpl.rounds || [];
						this.scheduleForm.rounds = this.templateRounds.map(r => ({
							round_name: r.round_name || '',
							interviewer: r.default_interviewer || '',
							date: '',
							time: '',
							duration_minutes: r.duration || 30
						}));
					}
				} catch (e) { /* no template — user adds manually */ }
			}
			if (this.scheduleForm.rounds.length === 0) {
				this.scheduleForm.rounds = [{ round_name: '', interviewer: '', date: '', time: '', duration_minutes: 30 }];
			}
		},

		closePanel() {
			this.showPanel = false;
			this.selected = null;
			this.interviews = [];
		},

		async changeStatus() {
			if (!this.selected || this.newStatus === this.selected.status) return;
			try {
				await this.api('wf_update_applicant_status', {
					applicant_name: this.selected.name,
					status: this.newStatus
				});
				this.selected.status = this.newStatus;
				this.showToast('Status changed to ' + this.newStatus);
			} catch (e) {
				this.showToast('Failed to update status', 'error');
			}
		},

		addRound() {
			this.scheduleForm.rounds.push({ round_name: '', interviewer: '', date: '', time: '', duration_minutes: 30 });
		},

		async scheduleInterviews() {
			const valid = this.scheduleForm.rounds.every(r => r.date);
			if (!valid) { this.showToast('All rounds need a date', 'error'); return; }
			this.saving = true;
			try {
				await this.api('wf_schedule_interviews', {
					data: {
						applicant: this.selected.name,
						job_opening: this.selected.job_opening,
						rounds: this.scheduleForm.rounds.map((r, idx) => ({
							round_name: r.round_name,
							round_number: idx + 1,
							interviewer: r.interviewer,
							scheduled_date: r.date,
							scheduled_time: r.time,
							duration_minutes: r.duration_minutes || 30
						}))
					}
				});
				this.selected.status = 'Interview Scheduled';
				this.showScheduleDialog = false;
				this.showToast('Interviews scheduled!');
				this.openDetail(this.selected);
			} catch (e) {
				this.showToast('Failed to schedule: ' + (e.message || e), 'error');
			}
			this.saving = false;
		},

		async createOffer() {
			if (!this.offerForm.designation) { this.showToast('Designation is required', 'error'); return; }
			this.saving = true;
			try {
				await this.api('wf_create_offer', {
					data: {
						applicant: this.selected.name,
						job_opening: this.selected.job_opening,
						designation: this.offerForm.designation,
						annual_ctc: this.offerForm.annual_ctc,
						start_date: this.offerForm.start_date,
						terms: this.offerForm.terms
					}
				});
				this.selected.status = 'Offer Sent';
				this.showOfferDialog = false;
				this.showToast('Offer letter created!');
			} catch (e) {
				this.showToast('Failed to create offer: ' + (e.message || e), 'error');
			}
			this.saving = false;
		},

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
.view-toggle { display: flex; border: 1px solid #d1d5db; border-radius: 8px; overflow: hidden; }
.view-toggle button { padding: 8px 16px; border: none; background: #fff; font-size: 13px; font-weight: 500; cursor: pointer; color: #6b7280; }
.view-toggle button.active { background: #4f46e5; color: #fff; }
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px; }
.filters-row { display: flex; gap: 12px; margin-bottom: 20px; }
.search-input { flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; min-width: 0; }
.search-input:focus { border-color: #4f46e5; }
.filter-select { padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff; min-width: 130px; }
.pipeline { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 10px; }
.pipeline-column { min-width: 200px; flex: 1; }
.pipeline-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 12px; background: #f9fafb; border-radius: 8px 8px 0 0; font-size: 13px; font-weight: 600; color: #374151; border: 1px solid #e5e7eb; border-bottom: none; }
.pipeline-count { background: #e5e7eb; padding: 2px 8px; border-radius: 10px; font-size: 12px; }
.pipeline-cards { border: 1px solid #e5e7eb; border-radius: 0 0 8px 8px; padding: 8px; min-height: 120px; background: #fff; display: flex; flex-direction: column; gap: 8px; }
.pipeline-card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; cursor: pointer; transition: box-shadow 0.15s; }
.pipeline-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.card-name { font-weight: 600; font-size: 14px; color: #111827; }
.card-job { font-size: 12px; color: #6b7280; margin-top: 4px; }
.card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.card-score { font-size: 12px; font-weight: 600; color: #4f46e5; }
.empty-stage { text-align: center; padding: 20px; color: #9ca3af; font-size: 13px; }
.table-wrapper { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow-x: auto; }
.wf-table { width: 100%; border-collapse: collapse; min-width: 750px; }
.wf-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.wf-table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: #f9fafb; }
.name-cell { font-weight: 600; color: #111827; }
.center-text { text-align: center; color: #9ca3af; padding: 40px 16px !important; }
.score-badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 700; }
.score-high { background: #dcfce7; color: #166534; }
.score-mid { background: #ffedd5; color: #9a3412; }
.score-low { background: #fee2e2; color: #991b1b; }
.detail-content { display: flex; flex-direction: column; gap: 16px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.detail-label { font-size: 13px; font-weight: 600; color: #6b7280; }
.detail-section { padding: 8px 0; }
.detail-desc { margin-top: 6px; font-size: 14px; color: #374151; line-height: 1.5; }
.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-sm { padding: 6px 14px; font-size: 13px; }
.btn-link { background: none; border: none; color: #4f46e5; font-weight: 600; cursor: pointer; font-size: 13px; }
.interview-card { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 8px; }
.iv-header { display: flex; justify-content: space-between; align-items: center; font-weight: 600; font-size: 14px; }
.iv-details { font-size: 13px; color: #6b7280; margin-top: 4px; }
.iv-rec { margin-top: 6px; }
.rounds-list { display: flex; flex-direction: column; gap: 20px; }
.round-row { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; }
.round-row h4 { margin: 0 0 12px; font-size: 15px; color: #374151; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-group { display: flex; flex-direction: column; gap: 4px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: #4f46e5; }
.form-textarea { resize: vertical; font-family: inherit; }
.empty-msg { color: #9ca3af; font-size: 14px; margin-bottom: 12px; }

.status-actions { display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.btn-success { background: #10b981; color: #fff; border: none; padding: 6px 14px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 13px; }
.btn-success:hover { background: #059669; }

@media (max-width: 1024px) {
	.kpi-row { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
	.pipeline-column { min-width: 180px; }
	.wf-table th, .wf-table td { padding: 10px 12px; }
}
@media (max-width: 768px) {
	.filters-row { flex-direction: column; gap: 8px; }
	.filter-select { width: 100%; min-width: auto; }
	.pipeline { flex-direction: column; }
	.pipeline-column { min-width: 100%; }
	.form-grid { grid-template-columns: 1fr; }
	.form-group.full { grid-column: 1; }
}
</style>