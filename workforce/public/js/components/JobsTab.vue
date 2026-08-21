<template>
	<div class="jobs-tab">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<!-- Sub Navigation -->
		<div class="sub-nav">
			<button :class="{ active: subView === 'jobs' }" @click="subView = 'jobs'">Job Openings</button>
			<button :class="{ active: subView === 'templates' }" @click="subView = 'templates'; loadTemplates()">Interview Templates</button>
		</div>

		<!-- ==================== JOB OPENINGS VIEW ==================== -->
		<div v-if="subView === 'jobs'">
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
							<th>Template</th>
							<th>Posted</th>
							<th>Closing</th>
							<th>Status</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						<tr v-if="loading"><td colspan="8" class="center-text">Loading...</td></tr>
						<tr v-else-if="filteredJobs.length === 0"><td colspan="8" class="center-text">No job openings found</td></tr>
						<tr v-for="job in filteredJobs" :key="job.name" class="clickable-row" @click="openDetail(job)">
							<td class="job-title-cell">{{ job.job_title }}</td>
							<td>{{ job.department || '—' }}</td>
							<td>{{ job.no_of_positions || 1 }}</td>
							<td>{{ job.template_name || '—' }}</td>
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
		</div>

		<!-- ==================== INTERVIEW TEMPLATES VIEW ==================== -->
		<div v-if="subView === 'templates'">
			<div class="tab-header">
				<h2>Interview Templates</h2>
				<button class="btn-primary" @click="openTemplateDialog()">+ New Template</button>
			</div>

			<div class="table-wrapper">
				<table class="wf-table">
					<thead>
						<tr>
							<th>Template Name</th>
							<th>Rounds</th>
							<th>Used By Jobs</th>
							<th>Actions</th>
						</tr>
					</thead>
					<tbody>
						<tr v-if="templatesLoading"><td colspan="4" class="center-text">Loading...</td></tr>
						<tr v-else-if="templates.length === 0"><td colspan="4" class="center-text">No templates found. Create one to define interview rounds.</td></tr>
						<tr v-for="t in templates" :key="t.name" class="clickable-row" @click="openTemplateDetail(t)">
							<td class="job-title-cell">{{ t.template_name || t.name }}</td>
							<td>{{ (t.rounds || []).length }} rounds</td>
							<td>{{ t.job_count || 0 }} jobs</td>
							<td @click.stop>
								<button class="btn-link" @click="openTemplateDialog(t)">Edit</button>
								<button class="btn-link btn-link-danger" @click="deleteTemplate(t)">Delete</button>
							</td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- ==================== JOB CREATE/EDIT DIALOG ==================== -->
		<Dialog :visible="showDialog" :title="editingJob ? 'Edit Job Opening' : 'New Job Opening'" :submitLabel="editingJob ? 'Update' : 'Create'" :loading="saving" size="lg" @close="closeDialog" @submit="saveJob">
			<div class="form-grid">
				<div class="form-group full">
					<label>Job Title *</label>
					<input v-model="form.job_title" type="text" class="form-input" placeholder="e.g. Senior Python Developer" />
				</div>
				<div class="form-group">
					<label>Department</label>
					<select v-model="form.department" class="form-input">
						<option value="">— Select Department —</option>
						<option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
					</select>
				</div>
				<div class="form-group">
					<label>Designation</label>
					<select v-model="form.designation" class="form-input">
						<option value="">— Select Designation —</option>
						<option v-for="d in designations" :key="d.name" :value="d.name">{{ d.name }}</option>
					</select>
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
					<label>Interview Template</label>
					<select v-model="form.interview_template" class="form-input">
						<option value="">— None —</option>
						<option v-for="t in templates" :key="t.name" :value="t.name">{{ t.template_name || t.name }}</option>
					</select>
				</div>
				<div class="form-group full">
					<label>Description</label>
					<textarea v-model="form.description" class="form-input form-textarea" rows="4" placeholder="Job description..."></textarea>
				</div>
				<div class="form-group full">
					<label>Required Skills</label>
					<div class="skills-list">
						<div v-for="(skill, i) in form.required_skills" :key="i" class="skill-row">
							<input v-model="skill.skill_name" type="text" class="form-input skill-input" placeholder="Skill name" />
							<label class="checkbox-label"><input type="checkbox" v-model="skill.is_mandatory" /> Mandatory</label>
							<button class="btn-icon remove-btn" @click="removeSkill(i)">&times;</button>
						</div>
					</div>
					<button class="btn-link" @click="addSkill">+ Add Skill</button>
				</div>
			</div>
		</Dialog>

		<!-- ==================== TEMPLATE CREATE/EDIT DIALOG ==================== -->
		<Dialog :visible="showTemplateDialog" :title="editingTemplate ? 'Edit Interview Template' : 'New Interview Template'" :submitLabel="editingTemplate ? 'Update' : 'Create'" :loading="saving" size="lg" @close="showTemplateDialog = false" @submit="saveTemplate">
			<div class="form-grid">
				<div class="form-group full">
					<label>Template Name *</label>
					<input v-model="templateForm.template_name" type="text" class="form-input" placeholder="e.g. Engineering 3-Round Process" />
				</div>
				<div class="form-group full">
					<label>Interview Rounds</label>
					<div class="rounds-list">
						<div v-for="(round, i) in templateForm.rounds" :key="i" class="round-card">
							<div class="round-header">
								<span class="round-number">Round {{ i + 1 }}</span>
								<button class="btn-icon remove-btn" @click="removeRound(i)">&times;</button>
							</div>
							<div class="form-grid">
								<div class="form-group">
									<label>Round Name *</label>
									<input v-model="round.round_name" type="text" class="form-input" placeholder="e.g. Technical Round" />
								</div>
								<div class="form-group">
									<label>Default Interviewer</label>
									<select v-model="round.default_interviewer" class="form-input">
										<option value="">— Select Interviewer —</option>
										<option v-for="u in interviewers" :key="u.name" :value="u.name">{{ u.full_name || u.name }}</option>
									</select>
								</div>
								<div class="form-group">
									<label>Duration (minutes)</label>
									<input v-model.number="round.duration" type="number" min="15" class="form-input" placeholder="45" />
								</div>
							</div>
						</div>
					</div>
					<button class="btn-link" @click="addRound" style="margin-top: 8px;">+ Add Round</button>
				</div>
			</div>
		</Dialog>

		<!-- ==================== JOB DETAIL PANEL ==================== -->
		<DetailPanel :visible="showPanel" :title="selectedJob ? selectedJob.job_title : ''" @close="showPanel = false">
			<div v-if="selectedJob" class="detail-content">
				<div class="detail-row"><span class="detail-label">Status</span><Badge :label="selectedJob.status" /></div>
				<div class="detail-row"><span class="detail-label">Department</span><span>{{ selectedJob.department || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Designation</span><span>{{ selectedJob.designation || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Positions</span><span>{{ selectedJob.no_of_positions || 1 }}</span></div>
				<div class="detail-row"><span class="detail-label">Interview Template</span><span>{{ selectedJob.template_name || selectedJob.interview_template || '—' }}</span></div>
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

		<!-- ==================== TEMPLATE DETAIL PANEL ==================== -->
		<DetailPanel :visible="showTemplatePanel" :title="selectedTemplate ? (selectedTemplate.template_name || selectedTemplate.name) : ''" @close="showTemplatePanel = false">
			<div v-if="selectedTemplate" class="detail-content">
				<div class="detail-row"><span class="detail-label">Template ID</span><span>{{ selectedTemplate.name }}</span></div>
				<div class="detail-row"><span class="detail-label">Total Rounds</span><span>{{ (selectedTemplate.rounds || []).length }}</span></div>
				<div v-if="selectedTemplate.rounds && selectedTemplate.rounds.length" class="detail-section">
					<span class="detail-label">Rounds</span>
					<div v-for="(r, i) in selectedTemplate.rounds" :key="i" class="round-detail">
						<div class="round-detail-header">
							<strong>Round {{ i + 1 }}: {{ r.round_name }}</strong>
						</div>
						<div class="round-detail-info">
							<span v-if="r.default_interviewer">Interviewer: {{ r.default_interviewer }}</span>
							<span v-if="r.duration"> · {{ r.duration }} min</span>
						</div>
					</div>
				</div>
			</div>
			<template #actions>
				<button class="btn-primary" @click="openTemplateDialog(selectedTemplate)">Edit</button>
				<button class="btn-danger" @click="deleteTemplate(selectedTemplate)">Delete</button>
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
			subView: 'jobs',
			jobs: [],
			loading: false,
			saving: false,
			searchQuery: '',
			statusFilter: '',
			showDialog: false,
			showPanel: false,
			editingJob: null,
			selectedJob: null,
			form: this.emptyForm(),
			templates: [],
			templatesLoading: false,
			showTemplateDialog: false,
			showTemplatePanel: false,
			editingTemplate: null,
			selectedTemplate: null,
			templateForm: this.emptyTemplateForm(),
			departments: [],
			designations: [],
			interviewers: [],
			toast: { show: false, msg: '', type: 'success' }
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
		this.loadTemplates();
		this.loadDepartments();
		this.loadDesignations();
		this.loadInterviewers();
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

		emptyTemplateForm() {
			return {
				template_name: '',
				rounds: [{ round_name: '', default_interviewer: '', duration: 45 }]
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

		// ───── JOBS ─────

		async loadJobs() {
			this.loading = true;
			try {
				this.jobs = await this.api('wf_get_job_openings');
			} catch (e) {
				this.showToast('Failed to load jobs', 'error');
			}
			this.loading = false;
		},

		async loadDepartments() {
			try {
				this.departments = await this.api('frappe.client.get_list', {
					doctype: 'Department',
					fields: ['name'],
					limit_page_length: 0,
					order_by: 'name asc'
				});
			} catch (e) { this.departments = []; }
		},

		async loadDesignations() {
			try {
				this.designations = await this.api('frappe.client.get_list', {
					doctype: 'Designation',
					fields: ['name'],
					limit_page_length: 0,
					order_by: 'name asc'
				});
			} catch (e) { this.designations = []; }
		},

		async loadInterviewers() {
			try {
				this.interviewers = await this.api('frappe.client.get_list', {
					doctype: 'User',
					fields: ['name', 'full_name'],
					filters: { enabled: 1, user_type: 'System User' },
					limit_page_length: 0,
					order_by: 'full_name asc'
				});
			} catch (e) { this.interviewers = []; }
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
				const data = {
					...this.form,
					required_skills: this.form.required_skills
						.filter(s => s.skill_name.trim())
						.map(s => ({
							skill_name: s.skill_name.trim(),
							is_mandatory: s.is_mandatory ? 1 : 0
						}))
				};
				if (this.editingJob) {
					data.name = this.editingJob.name;
					await this.api('wf_update_job_opening', { data: data });
					this.showToast('Job updated successfully');
				} else {
					await this.api('wf_create_job_opening', { data: data });
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
				await this.api('wf_update_job_opening', {
					data: { name: job.name, status: newStatus }
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
				await this.api('wf_delete_job_opening', { job_name: job.name });
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

		// ───── TEMPLATES ─────

		async loadTemplates() {
			this.templatesLoading = true;
			try {
				this.templates = await this.api('wf_get_interview_templates');
			} catch (e) {
				this.showToast('Failed to load templates', 'error');
			}
			this.templatesLoading = false;
		},

		openTemplateDialog(template) {
			if (template) {
				this.editingTemplate = template;
				this.templateForm = {
					template_name: template.template_name || '',
					rounds: (template.rounds || []).map(r => ({
						round_name: r.round_name || '',
						default_interviewer: r.default_interviewer || '',
						duration: r.duration || 45
					}))
				};
			} else {
				this.editingTemplate = null;
				this.templateForm = this.emptyTemplateForm();
			}
			this.showTemplatePanel = false;
			this.showTemplateDialog = true;
		},

		addRound() {
			this.templateForm.rounds.push({ round_name: '', default_interviewer: '', duration: 45 });
		},

		removeRound(index) {
			this.templateForm.rounds.splice(index, 1);
		},

		async saveTemplate() {
			if (!this.templateForm.template_name.trim()) {
				this.showToast('Template name is required', 'error');
				return;
			}
			if (this.templateForm.rounds.length === 0 || !this.templateForm.rounds[0].round_name.trim()) {
				this.showToast('At least one round with a name is required', 'error');
				return;
			}
			this.saving = true;
			try {
				const data = {
					template_name: this.templateForm.template_name.trim(),
					rounds: this.templateForm.rounds
						.filter(r => r.round_name.trim())
						.map(r => ({
							round_name: r.round_name.trim(),
							default_interviewer: r.default_interviewer || '',
							duration: r.duration || 45
						}))
				};
				if (this.editingTemplate) {
					data.name = this.editingTemplate.name;
				}
				await this.api('wf_save_interview_template', { data: data });
				this.showToast(this.editingTemplate ? 'Template updated' : 'Template created');
				this.showTemplateDialog = false;
				this.editingTemplate = null;
				await this.loadTemplates();
			} catch (e) {
				this.showToast('Failed to save template: ' + (e.message || e), 'error');
			}
			this.saving = false;
		},

		async deleteTemplate(template) {
			if (!confirm('Delete template "' + (template.template_name || template.name) + '"?')) return;
			try {
				await this.api('wf_delete_interview_template', {
					template_name: template.name
				});
				this.showTemplatePanel = false;
				this.showToast('Template deleted');
				await this.loadTemplates();
			} catch (e) {
				this.showToast('Failed to delete', 'error');
			}
		},

		openTemplateDetail(template) {
			this.selectedTemplate = template;
			this.showTemplatePanel = true;
		},

		// ───── SHARED ─────

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
.sub-nav {
	display: flex;
	gap: 0;
	margin-bottom: 20px;
	border: 1px solid #e5e7eb;
	border-radius: 8px;
	overflow: hidden;
	width: fit-content;
}
.sub-nav button {
	padding: 10px 20px;
	border: none;
	background: #fff;
	font-size: 14px;
	font-weight: 500;
	color: #6b7280;
	cursor: pointer;
}
.sub-nav button.active { background: #4f46e5; color: #fff; }
.sub-nav button:not(:last-child) { border-right: 1px solid #e5e7eb; }

.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tab-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #4338ca; }
.btn-danger { background: #ef4444; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-link { background: none; border: none; color: #4f46e5; font-weight: 600; cursor: pointer; padding: 4px 8px; font-size: 13px; }
.btn-link-danger { color: #ef4444; }
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

.rounds-list { display: flex; flex-direction: column; gap: 12px; }
.round-card { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
.round-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.round-number { font-weight: 600; font-size: 14px; color: #4f46e5; }
.round-detail { padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 8px; }
.round-detail-header { display: flex; justify-content: space-between; align-items: center; }
.round-detail-info { font-size: 13px; color: #6b7280; margin-top: 4px; }

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