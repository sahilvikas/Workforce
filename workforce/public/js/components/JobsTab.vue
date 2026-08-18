<template>
	<div class="jobs-tab">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="tab-header">
			<h2>Job Openings</h2>
			<button class="btn-primary" @click="openCreateDialog">+ New Job Opening</button>
		</div>

		<div class="kpi-row">
			<KpiCard label="Total Jobs" :value="jobs.length" />
			<KpiCard label="Open" :value="jobs.filter(j => j.status === 'Open').length" />
			<KpiCard label="On Hold" :value="jobs.filter(j => j.status === 'On Hold').length" />
			<KpiCard label="Closed" :value="jobs.filter(j => j.status === 'Closed').length" />
		</div>

		<div class="filters-row">
			<input v-model="searchQuery" type="text" placeholder="Search by title, department..." class="search-input" />
			<select v-model="statusFilter" class="filter-select">
				<option value="">All Statuses</option>
				<option value="Open">Open</option>
				<option value="On Hold">On Hold</option>
				<option value="Closed">Closed</option>
			</select>
		</div>

		<div class="table-wrapper">
			<table class="wf-table">
				<thead>
					<tr>
						<th>Job Title</th>
						<th>Department</th>
						<th>Positions</th>
						<th>Posted</th>
						<th>Closing</th>
						<th>Status</th>
						<th>Actions</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading">
						<td colspan="7" class="center-text">Loading...</td>
					</tr>
					<tr v-else-if="filteredJobs.length === 0">
						<td colspan="7" class="center-text">No job openings found</td>
					</tr>
					<tr v-for="job in filteredJobs" :key="job.name" class="clickable-row" @click="openDetail(job)">
						<td class="job-title-cell">{{ job.job_title }}</td>
						<td>{{ job.department || '—' }}</td>
						<td>{{ job.no_of_positions || 1 }}</td>
						<td>{{ formatDate(job.posted_on) }}</td>
						<td>{{ formatDate(job.closing_date) }}</td>
						<td><Badge :label="job.status" /></td>
						<td @click.stop>
							<select :value="job.status" @change="changeStatus(job, $event.target.value)" class="status-select">
								<option value="Open">Open</option>
								<option value="On Hold">On Hold</option>
								<option value="Closed">Closed</option>
							</select>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<Dialog :visible="showDialog" :title="editingJob ? 'Edit Job Opening' : 'New Job Opening'" :submitLabel="editingJob ? 'Update' : 'Create'" :loading="saving" size="lg" @close="closeDialog" @submit="saveJob">
			<div class="form-grid">
				<div class="form-group full">
					<label>Job Title *</label>
					<input v-model="form.job_title" type="text" class="form-input" placeholder="e.g. Senior Python Developer" />
				</div>
				<div class="form-group">
					<label>Department</label>
					<input v-model="form.department" type="text" class="form-input" placeholder="e.g. Engineering" />
				</div>
				<div class="form-group">
					<label>Designation</label>
					<input v-model="form.designation" type="text" class="form-input" placeholder="e.g. Software Engineer" />
				</div>
				<div class="form-group">
					<label>No. of Positions</label>
					<input v-model.number="form.no_of_positions" type="number" min="1" class="form-input" />
				</div>
				<div class="form-group">
					<label>Status</label>
					<select v-model="form.status" class="form-input">
						<option value="Open">Open</option>
						<option value="On Hold">On Hold</option>
						<option value="Closed">Closed</option>
					</select>
				</div>
				<div class="form-group">
					<label>Posted On</label>
					<input v-model="form.posted_on" type="date" class="form-input" />
				</div>
				<div class="form-group">
					<label>Closing Date</label>
					<input v-model="form.closing_date" type="date" class="form-input" />
				</div>
				<div class="form-group full">
					<label>Description</label>
					<textarea v-model="form.description" class="form-input form-textarea" rows="4" placeholder="Job description..."></textarea>
				</div>
				<div class="form-group full">
					<label>Interview Template</label>
					<input v-model="form.interview_template" type="text" class="form-input" placeholder="e.g. WF-IT-2026-00001" />
				</div>
				<div class="form-group full">
					<label>Required Skills</label>
					<div class="skills-list">
						<div v-for="(skill, i) in form.required_skills" :key="i" class="skill-row">
							<input v-model="skill.skill_name" type="text" class="form-input skill-input" placeholder="Skill name" />
							<label class="checkbox-label">
								<input type="checkbox" v-model="skill.is_mandatory" /> Mandatory
							</label>
							<button class="btn-icon remove-btn" @click="removeSkill(i)">&times;</button>
						</div>
					</div>
					<button class="btn-link" @click="addSkill">+ Add Skill</button>
				</div>
			</div>
		</Dialog>

		<DetailPanel :visible="showPanel" :title="selectedJob ? selectedJob.job_title : ''" @close="showPanel = false">
			<div v-if="selectedJob" class="detail-content">
				<div class="detail-row"><span class="detail-label">Status</span><Badge :label="selectedJob.status" /></div>
				<div class="detail-row"><span class="detail-label">Department</span><span>{{ selectedJob.department || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Designation</span><span>{{ selectedJob.designation || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Positions</span><span>{{ selectedJob.no_of_positions || 1 }}</span></div>
				<div class="detail-row"><span class="detail-label">Posted</span><span>{{ formatDate(selectedJob.posted_on) }}</span></div>
				<div class="detail-row"><span class="detail-label">Closing</span><span>{{ formatDate(selectedJob.closing_date) }}</span></div>
				<div v-if="selectedJob.description" class="detail-section">
					<span class="detail-label">Description</span>
					<div class="detail-desc" v-html="selectedJob.description"></div>
				</div>
				<div v-if="selectedJob.required_skills && selectedJob.required_skills.length" class="detail-section">
					<span class="detail-label">Required Skills</span>
					<div class="skills-tags">
						<span v-for="s in selectedJob.required_skills" :key="s.skill_name" class="skill-tag" :class="{ mandatory: s.is_mandatory }">
							{{ s.skill_name }}<span v-if="s.is_mandatory" class="mandatory-star">*</span>
						</span>
					</div>
				</div>
			</div>
			<template #actions>
				<button class="btn-primary" @click="openEditDialog(selectedJob)">Edit</button>
				<button class="btn-danger" @click="deleteJob(selectedJob)">Delete</button>
			</template>
		</DetailPanel>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import KpiCard from './shared/KpiCard.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';

export default {
	name: 'JobsTab',
	components: { Badge, KpiCard, Dialog, DetailPanel, Toast },

	data() {
		return {
			jobs: [],
			loading: false,
			saving: false,
			searchQuery: '',
			statusFilter: '',
			showDialog: false,
			showPanel: false,
			editingJob: null,
			selectedJob: null,
			toast: { show: false, msg: '', type: 'success' },
			form: this.emptyForm()
		};
	},

	computed: {
		filteredJobs() {
			return this.jobs.filter(j => {
				const matchSearch = !this.searchQuery ||
					j.job_title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
					(j.department || '').toLowerCase().includes(this.searchQuery.toLowerCase());
				const matchStatus = !this.statusFilter || j.status === this.statusFilter;
				return matchSearch && matchStatus;
			});
		}
	},

	mounted() {
		this.loadJobs();
	},

	methods: {
		emptyForm() {
			return {
				job_title: '', department: '', designation: '',
				no_of_positions: 1, status: 'Open',
				posted_on: new Date().toISOString().split('T')[0],
				closing_date: '', description: '', interview_template: '',
				required_skills: []
			};
		},

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
			this.loading = true;
			try {
				const list = await this.api('frappe.client.get_list', {
					doctype: 'WF Job Opening',
					fields: ['name', 'job_title', 'department', 'designation', 'no_of_positions', 'status', 'posted_on', 'closing_date', 'interview_template'],
					limit_page_length: 0,
					order_by: 'creation desc'
				});
				for (let job of list) {
					const full = await this.api('frappe.client.get', {
						doctype: 'WF Job Opening',
						name: job.name
					});
					job.required_skills = full.required_skills || [];
					job.description = full.description || '';
				}
				this.jobs = list;
			} catch (e) {
				this.showToast('Failed to load jobs', 'error');
			}
			this.loading = false;
		},

		openCreateDialog() {
			this.editingJob = null;
			this.form = this.emptyForm();
			this.showDialog = true;
		},

		openEditDialog(job) {
			this.editingJob = job;
			this.form = {
				job_title: job.job_title,
				department: job.department || '',
				designation: job.designation || '',
				no_of_positions: job.no_of_positions || 1,
				status: job.status,
				posted_on: job.posted_on || '',
				closing_date: job.closing_date || '',
				description: job.description || '',
				interview_template: job.interview_template || '',
				required_skills: (job.required_skills || []).map(s => ({
					skill_name: s.skill_name,
					is_mandatory: s.is_mandatory ? true : false
				}))
			};
			this.showPanel = false;
			this.showDialog = true;
		},

		closeDialog() {
			this.showDialog = false;
			this.editingJob = null;
		},

		addSkill() {
			this.form.required_skills.push({ skill_name: '', is_mandatory: false });
		},

		removeSkill(index) {
			this.form.required_skills.splice(index, 1);
		},

		async saveJob() {
			if (!this.form.job_title.trim()) {
				this.showToast('Job title is required', 'error');
				return;
			}
			this.saving = true;
			try {
				const doc = {
					doctype: 'WF Job Opening',
					...this.form,
					required_skills: this.form.required_skills
						.filter(s => s.skill_name.trim())
						.map(s => ({
							doctype: 'WF Required Skill',
							skill_name: s.skill_name.trim(),
							is_mandatory: s.is_mandatory ? 1 : 0
						}))
				};
				if (this.editingJob) {
					doc.name = this.editingJob.name;
					await this.api('frappe.client.save', { doc });
					this.showToast('Job updated successfully');
				} else {
					await this.api('frappe.client.insert', { doc });
					this.showToast('Job created successfully');
				}
				this.closeDialog();
				await this.loadJobs();
			} catch (e) {
				this.showToast('Failed to save: ' + (e.message || e), 'error');
			}
			this.saving = false;
		},

		async changeStatus(job, newStatus) {
			try {
				await this.api('frappe.client.save', {
					doc: { doctype: 'WF Job Opening', name: job.name, status: newStatus }
				});
				job.status = newStatus;
				this.showToast('Status changed to ' + newStatus);
			} catch (e) {
				this.showToast('Failed to update status', 'error');
			}
		},

		async deleteJob(job) {
			if (!confirm('Delete "' + job.job_title + '"? This cannot be undone.')) return;
			try {
				await this.api('frappe.client.delete', {
					doctype: 'WF Job Opening', name: job.name
				});
				this.showPanel = false;
				this.showToast('Job deleted');
				await this.loadJobs();
			} catch (e) {
				this.showToast('Failed to delete', 'error');
			}
		},

		openDetail(job) {
			this.selectedJob = job;
			this.showPanel = true;
		},

		formatDate(d) {
			if (!d) return '—';
			return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		},

		showToast(msg, type = 'success') {
			this.toast = { show: true, msg, type };
		}
	}
};
</script>

<style scoped>
.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tab-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #4338ca; }
.btn-danger { background: #ef4444; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-link { background: none; border: none; color: #4f46e5; font-weight: 600; cursor: pointer; padding: 8px 0; font-size: 13px; }
.btn-icon { background: none; border: none; font-size: 20px; color: #ef4444; cursor: pointer; padding: 0 4px; }
.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 20px; }
.filters-row { display: flex; gap: 12px; margin-bottom: 20px; }
.search-input { flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; min-width: 0; }
.search-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.filter-select { padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; background: #fff; min-width: 140px; }
.table-wrapper { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow-x: auto; }
.wf-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.wf-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.wf-table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: #f9fafb; }
.job-title-cell { font-weight: 600; color: #111827; }
.center-text { text-align: center; color: #9ca3af; padding: 40px 16px !important; }
.status-select { padding: 4px 8px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 13px; background: #fff; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.form-textarea { resize: vertical; font-family: inherit; }
.skills-list { display: flex; flex-direction: column; gap: 8px; }
.skill-row { display: flex; align-items: center; gap: 10px; }
.skill-input { flex: 1; }
.checkbox-label { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #6b7280; white-space: nowrap; }
.remove-btn { flex-shrink: 0; }
.detail-content { display: flex; flex-direction: column; gap: 16px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.detail-label { font-size: 13px; font-weight: 600; color: #6b7280; }
.detail-section { padding: 8px 0; }
.detail-desc { margin-top: 8px; font-size: 14px; color: #374151; line-height: 1.6; }
.skills-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.skill-tag { padding: 4px 12px; border-radius: 16px; font-size: 12px; font-weight: 500; background: #eef2ff; color: #4338ca; }
.skill-tag.mandatory { background: #fef3c7; color: #92400e; }
.mandatory-star { color: #ef4444; margin-left: 2px; }

@media (max-width: 1024px) {
	.kpi-row { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
	.wf-table { min-width: 640px; }
	.wf-table th, .wf-table td { padding: 10px 12px; }
}
@media (max-width: 768px) {
	.filters-row { flex-direction: column; gap: 8px; }
	.filter-select { width: 100%; min-width: auto; }
	.form-grid { grid-template-columns: 1fr; }
	.form-group.full { grid-column: 1; }
	.skill-row { flex-wrap: wrap; }
}
</style>