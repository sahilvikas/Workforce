<template>
	<div class="requisitions-tab">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="tab-header">
			<h2>{{ headerTitle }}</h2>
			<button v-if="canCreate" class="btn-primary" @click="openCreateDialog">+ New Requisition</button>
		</div>

		<!-- KPIs -->
		<div class="kpi-row">
			<KpiCard label="Total" :value="kpis.total || 0" />
			<KpiCard v-if="showDraftKpi" label="Draft" :value="kpis.draft || 0" />
			<KpiCard label="Pending Approval" :value="kpis.pending_approval || 0" />
			<KpiCard label="Needs Revision" :value="kpis.needs_revision || 0" />
			<KpiCard label="Approved" :value="kpis.approved || 0" />
			<KpiCard label="Published" :value="kpis.published || 0" />
			<KpiCard v-if="kpis.overdue_pending" label="Overdue (>7d)" :value="kpis.overdue_pending || 0" />
		</div>

		<!-- Filters -->
		<div class="filters-row">
			<input v-model="searchQuery" type="text" placeholder="Search by title, team, requester..." class="search-input" />
			<select v-model="statusFilter" class="filter-select">
				<option value="">All Statuses</option>
				<option value="Draft">Draft</option>
				<option value="Pending Approval">Pending Approval</option>
				<option value="Needs Revision">Needs Revision</option>
				<option value="Approved">Approved</option>
				<option value="Published">Published</option>
				<option value="Rejected">Rejected</option>
				<option value="Cancelled">Cancelled</option>
			</select>
		</div>

		<!-- Table -->
		<div class="table-wrapper">
			<table class="wf-table">
				<thead>
					<tr>
						<th>ID</th>
						<th>Position Title</th>
						<th>Team</th>
						<th>Openings</th>
						<th>Level / Type</th>
						<th>CTC</th>
						<th>Requester</th>
						<th v-if="roleView === 'hr_manager'">HR Owner</th>
						<th>Status</th>
						<th>Days</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading"><td :colspan="colSpan" class="center-text">Loading...</td></tr>
					<tr v-else-if="filteredRequisitions.length === 0">
						<td :colspan="colSpan" class="center-text">{{ emptyMessage }}</td>
					</tr>
					<tr v-for="r in filteredRequisitions" :key="r.name" class="clickable-row" @click="openDetail(r)">
						<td class="req-id">{{ r.name }}</td>
						<td class="req-title-cell">
							{{ r.title }}
							<span v-if="r.revision_count && r.revision_count > 0" class="rev-badge">v{{ r.revision_count + 1 }}</span>
						</td>
						<td>{{ r.team || '—' }}</td>
						<td>{{ r.number_of_openings || 1 }}</td>
						<td>
							<span class="level-chip">{{ r.position_level || '—' }}</span>
							<span class="type-chip">{{ r.employment_type || '' }}</span>
						</td>
						<td>{{ r.compensation_range || '—' }}</td>
						<td>{{ r.requester_full_name || r.requester || '—' }}</td>
						<td v-if="roleView === 'hr_manager'">{{ r.hr_owner_name || '—' }}</td>
						<td><Badge :label="r.status" /></td>
						<td>
							<span :class="daysClass(r)">{{ r.days_pending }}d</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- ==================== CREATE / EDIT DIALOG ==================== -->
		<Dialog :visible="showDialog" :title="dialogTitle" :submitLabel="dialogSubmitLabel"
			:loading="saving" size="lg" @close="closeDialog" @submit="saveRequisition">

			<div v-if="editingReq && editingReq.status === 'Needs Revision' && editingReq.leadership_comment" class="revision-note">
				<div class="revision-header">
					<span class="revision-icon">⚠️</span>
					<strong>Leadership requested changes:</strong>
				</div>
				<p class="revision-comment">{{ editingReq.leadership_comment }}</p>
			</div>

			<div class="form-grid">
				<div class="form-group full">
					<label>Position Title *</label>
					<input v-model="form.title" type="text" class="form-input" placeholder="e.g. Senior Backend Engineer" />
				</div>

				<div class="form-group">
					<label>Team / Department *</label>
					<select v-model="form.team" class="form-input">
						<option value="">— Select team —</option>
						<option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
					</select>
				</div>

				<div class="form-group">
					<label>Position Level *</label>
					<select v-model="form.position_level" class="form-input">
						<option value="">— Select level —</option>
						<option value="Intern">Intern</option>
						<option value="Junior">Junior</option>
						<option value="Mid">Mid</option>
						<option value="Senior">Senior</option>
						<option value="Lead">Lead</option>
						<option value="Manager">Manager</option>
					</select>
				</div>

				<div class="form-group">
					<label>Employment Type *</label>
					<select v-model="form.employment_type" class="form-input">
						<option value="Full-time">Full-time</option>
						<option value="Part-time">Part-time</option>
						<option value="Contract">Contract</option>
						<option value="Internship">Internship</option>
					</select>
				</div>

				<div class="form-group">
					<label>Number of Openings *</label>
					<input v-model.number="form.number_of_openings" type="number" min="1" class="form-input" />
				</div>

				<div class="form-group">
					<label>Reason for Hiring *</label>
					<select v-model="form.reason" class="form-input">
						<option value="">— Select reason —</option>
						<option value="New position">New position</option>
						<option value="Replacement">Replacement</option>
					</select>
				</div>

				<div class="form-group">
					<label>CTC Range</label>
					<input v-model="form.compensation_range" type="text" class="form-input" placeholder="e.g. Rs 8-12L" />
				</div>

				<div class="form-group">
					<label>Target Start Date</label>
					<input v-model="form.target_start_date" type="date" class="form-input" />
				</div>

				<div class="form-group full">
					<label>Job Description *</label>
					<textarea v-model="form.description" class="form-input form-textarea" rows="4"
						placeholder="What will they do, what skills needed, what experience..."></textarea>
				</div>

				<div class="form-group full">
					<label>Required Skills</label>
					<input v-model="form.required_skills" type="text" class="form-input"
						placeholder="Comma-separated e.g. Python, SQL, React" />
				</div>
			</div>

			<div class="approval-info">
				<span class="info-icon">ℹ️</span>
				<div>
					After submission, this goes to <strong>Priyesh</strong> for approval,
					then to <strong>HR Manager</strong> to publish and assign a recruiter.
				</div>
			</div>

			<template #footer-extra>
				<button v-if="!editingReq || editingReq.status === 'Draft' || editingReq.status === 'Needs Revision'"
					class="btn-secondary" @click="saveAsDraft" :disabled="saving">
					Save as Draft
				</button>
			</template>
		</Dialog>

		<!-- ==================== DETAIL PANEL ==================== -->
		<DetailPanel :visible="showPanel" :title="selectedReq ? selectedReq.title : ''" @close="closePanel">
			<div v-if="selectedReq && detailData" class="detail-content">
				<!-- Status + Basic -->
				<div class="detail-row"><span class="detail-label">Status</span><Badge :label="detailData.requisition.status" /></div>
				<div class="detail-row"><span class="detail-label">Requisition ID</span><span>{{ detailData.requisition.name }}</span></div>
				<div class="detail-row"><span class="detail-label">Team</span><span>{{ detailData.requisition.team }}</span></div>
				<div class="detail-row"><span class="detail-label">Level</span><span>{{ detailData.requisition.position_level }}</span></div>
				<div class="detail-row"><span class="detail-label">Employment Type</span><span>{{ detailData.requisition.employment_type }}</span></div>
				<div class="detail-row"><span class="detail-label">Openings</span><span>{{ detailData.requisition.number_of_openings }}</span></div>
				<div class="detail-row"><span class="detail-label">CTC Range</span><span>{{ detailData.requisition.compensation_range || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Target Start</span><span>{{ formatDate(detailData.requisition.target_start_date) }}</span></div>
				<div class="detail-row"><span class="detail-label">Requester</span><span>{{ detailData.requisition.requester_name }}</span></div>

				<!-- Description -->
				<div class="detail-section">
					<span class="detail-label">Job Description</span>
					<div class="detail-desc" v-html="detailData.requisition.description"></div>
				</div>

				<!-- Skills -->
				<div v-if="detailData.requisition.required_skills" class="detail-section">
					<span class="detail-label">Required Skills</span>
					<div class="detail-desc">{{ detailData.requisition.required_skills }}</div>
				</div>

				<!-- Leadership Comment (if any) -->
				<div v-if="detailData.requisition.leadership_comment" class="detail-section leadership-comment">
					<span class="detail-label">
						Leadership Comment
						<Badge v-if="detailData.requisition.leadership_decision" :label="detailData.requisition.leadership_decision" />
					</span>
					<div class="detail-desc">{{ detailData.requisition.leadership_comment }}</div>
				</div>

				<!-- Published Job Opening (if linked) -->
				<div v-if="detailData.job_opening" class="detail-section linked-job">
					<span class="detail-label">Published as Job Opening</span>
					<div class="linked-job-card">
						<div class="linked-job-header">
							<strong>{{ detailData.job_opening.name }}</strong>
							<Badge :label="detailData.job_opening.status" />
						</div>
						<div class="linked-job-meta">
							{{ detailData.job_opening.no_of_positions }} openings ·
							Owner: {{ hrOwnerNameFromEmail(detailData.job_opening.assigned_hr) }} ·
							Priority: {{ detailData.job_opening.priority || 'Medium' }}
						</div>
						<div v-if="detailData.job_opening.status_reason" class="status-reason">
							Reason: {{ detailData.job_opening.status_reason }}
						</div>
						<div class="candidate-count">
							{{ detailData.candidate_count }} candidate{{ detailData.candidate_count === 1 ? '' : 's' }} applied
						</div>
					</div>
				</div>

				<!-- Timeline -->
				<div class="detail-section">
					<span class="detail-label">Approval Timeline</span>
					<div class="timeline">
						<div v-for="(t, i) in detailData.timeline" :key="i" class="timeline-item">
							<div class="timeline-dot"></div>
							<div class="timeline-content">
								<div class="timeline-event">{{ t.event }}</div>
								<div class="timeline-meta">by {{ t.by }} · {{ formatDateTime(t.at) }}</div>
								<div v-if="t.comment" class="timeline-comment">"{{ t.comment }}"</div>
							</div>
						</div>
					</div>
				</div>
			</div>

			<template #actions>
				<button v-if="detailData && detailData.permissions.can_edit" class="btn-primary" @click="editFromDetail">
					{{ selectedReq && selectedReq.status === 'Needs Revision' ? 'Edit & Resubmit' : 'Edit' }}
				</button>
				<button v-if="detailData && detailData.permissions.can_cancel" class="btn-danger" @click="openCancelDialog">
					Cancel
				</button>
			</template>
		</DetailPanel>

		<!-- ==================== CANCEL DIALOG ==================== -->
		<Dialog :visible="showCancelDialog" title="Cancel Requisition" submitLabel="Confirm Cancel"
			:loading="cancelling" size="sm" @close="showCancelDialog = false" @submit="confirmCancel">
			<div class="form-group full">
				<label>Reason for cancellation *</label>
				<textarea v-model="cancelReason" class="form-input form-textarea" rows="3"
					placeholder="Why are you cancelling this requisition?"></textarea>
			</div>
			<p class="cancel-warning">
				This will mark the requisition as Cancelled.
				{{ selectedReq && selectedReq.status === 'Pending Approval' ? 'Leadership will be notified to remove from queue.' : '' }}
			</p>
		</Dialog>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import KpiCard from './shared/KpiCard.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';

export default {
	name: 'RequisitionsTab',
	components: { Badge, KpiCard, Dialog, DetailPanel, Toast },

	data() {
		return {
			requisitions: [],
			kpis: {},
			roleView: 'none',
			currentUser: '',
			departments: [],
			userMap: {},  // email → full_name
			loading: false,
			saving: false,
			cancelling: false,
			searchQuery: '',
			statusFilter: '',
			showDialog: false,
			showPanel: false,
			showCancelDialog: false,
			editingReq: null,
			selectedReq: null,
			detailData: null,
			form: this.emptyForm(),
			cancelReason: '',
			toast: { show: false, msg: '', type: 'success' }
		};
	},

	computed: {
		canCreate() {
			return this.roleView === 'manager' || this.roleView === 'hr_manager';
		},

		showDraftKpi() {
			return this.roleView === 'manager' || this.roleView === 'hr_manager';
		},

		headerTitle() {
			if (this.roleView === 'manager') return 'My Requisitions';
			if (this.roleView === 'hr_manager') return 'Job Requisitions';
			if (this.roleView === 'leadership') return 'Requisitions';
			return 'Requisitions';
		},

		emptyMessage() {
			if (this.roleView === 'manager') return 'No requisitions yet. Click "+ New Requisition" to create one.';
			if (this.roleView === 'none') return 'You do not have permission to view requisitions.';
			return 'No requisitions found.';
		},

		colSpan() {
			return this.roleView === 'hr_manager' ? 10 : 9;
		},

		dialogTitle() {
			if (!this.editingReq) return 'New Requisition';
			if (this.editingReq.status === 'Needs Revision') return 'Revise Requisition — ' + this.editingReq.name;
			return 'Edit Requisition — ' + this.editingReq.name;
		},

		dialogSubmitLabel() {
			if (!this.editingReq) return 'Submit for Approval';
			if (this.editingReq.status === 'Needs Revision') return 'Resubmit for Approval';
			return 'Save & Submit';
		},

		filteredRequisitions() {
			const q = this.searchQuery.toLowerCase();
			return this.requisitions.filter(r => {
				const matchSearch = !q ||
					(r.title || '').toLowerCase().includes(q) ||
					(r.team || '').toLowerCase().includes(q) ||
					(r.requester_full_name || '').toLowerCase().includes(q) ||
					(r.name || '').toLowerCase().includes(q);
				const matchStatus = !this.statusFilter || r.status === this.statusFilter;
				return matchSearch && matchStatus;
			});
		}
	},

	mounted() {
		this.loadRequisitions();
		this.loadDepartments();
	},

	methods: {
		emptyForm() {
			return {
				title: '',
				team: '',
				position_level: '',
				employment_type: 'Full-time',
				number_of_openings: 1,
				reason: '',
				compensation_range: '',
				target_start_date: '',
				description: '',
				required_skills: ''
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

		async loadRequisitions() {
			this.loading = true;
			try {
				const res = await this.api('wf_get_requisitions');
				this.requisitions = res.requisitions || [];
				this.kpis = res.kpis || {};
				this.roleView = res.role_view || 'none';
				this.currentUser = res.user || '';
			} catch (e) {
				this.showToast('Failed to load requisitions', 'error');
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

		hrOwnerNameFromEmail(email) {
			if (!email) return '—';
			// Try to find in current requisitions
			const r = this.requisitions.find(x => x.hr_owner === email);
			if (r && r.hr_owner_name) return r.hr_owner_name;
			return email.split('@')[0];
		},

		daysClass(r) {
			if (r.status !== 'Pending Approval') return 'days-normal';
			if (r.days_pending > 7) return 'days-overdue';
			if (r.days_pending > 4) return 'days-warning';
			return 'days-normal';
		},

		openCreateDialog() {
			this.editingReq = null;
			this.form = this.emptyForm();
			this.showDialog = true;
		},

		openEditDialog(req) {
			this.editingReq = req;
			this.form = {
				title: req.title || '',
				team: req.team || '',
				position_level: req.position_level || '',
				employment_type: req.employment_type || 'Full-time',
				number_of_openings: req.number_of_openings || 1,
				reason: req.reason || '',
				compensation_range: req.compensation_range || '',
				target_start_date: req.target_start_date || '',
				description: req.description || '',
				required_skills: req.required_skills || ''
			};
			this.showPanel = false;
			this.showDialog = true;
		},

		editFromDetail() {
			if (!this.detailData) return;
			const req = this.detailData.requisition;
			this.openEditDialog(req);
		},

		closeDialog() {
			this.showDialog = false;
			this.editingReq = null;
			this.form = this.emptyForm();
		},

		validateForm() {
			if (!this.form.title.trim()) { this.showToast('Position title is required', 'error'); return false; }
			if (!this.form.team) { this.showToast('Team is required', 'error'); return false; }
			if (!this.form.position_level) { this.showToast('Position level is required', 'error'); return false; }
			if (!this.form.reason) { this.showToast('Reason for hiring is required', 'error'); return false; }
			if (!this.form.number_of_openings || this.form.number_of_openings < 1) {
				this.showToast('Number of openings must be at least 1', 'error'); return false;
			}
			if (!this.form.description.trim()) { this.showToast('Job description is required', 'error'); return false; }
			return true;
		},

		async saveRequisition() {
			if (!this.validateForm()) return;
			await this.doSave(true);
		},

		async saveAsDraft() {
			if (!this.form.title.trim()) { this.showToast('At least the title is required to save as draft', 'error'); return; }
			await this.doSave(false);
		},

		async doSave(submitForApproval) {
			this.saving = true;
			try {
				const payload = { ...this.form, submit_for_approval: submitForApproval };

				if (this.editingReq) {
					// Edit existing
					payload.requisition = this.editingReq.name;
					const res = await this.api('wf_hiring_manager_edit_requisition', { data: payload });
					this.showToast(res.message || 'Requisition updated');
				} else {
					// Create new
					const res = await this.api('wf_create_requisition', { data: payload });
					this.showToast(res.message || 'Requisition created');
				}

				this.closeDialog();
				await this.loadRequisitions();
			} catch (e) {
				this.showToast('Failed to save: ' + (e.message || 'Please try again'), 'error');
			}
			this.saving = false;
		},

		async openDetail(req) {
			this.selectedReq = req;
			this.detailData = null;
			this.showPanel = true;
			try {
				const res = await this.api('wf_get_requisition_detail', { requisition: req.name });
				this.detailData = res;
			} catch (e) {
				this.showToast('Failed to load requisition details', 'error');
				this.showPanel = false;
			}
		},

		closePanel() {
			this.showPanel = false;
			this.selectedReq = null;
			this.detailData = null;
		},

		openCancelDialog() {
			this.cancelReason = '';
			this.showCancelDialog = true;
		},

		async confirmCancel() {
			if (!this.cancelReason.trim()) {
				this.showToast('Please provide a reason', 'error');
				return;
			}
			this.cancelling = true;
			try {
				await this.api('wf_manager_action', {
					data: {
						requisition: this.selectedReq.name,
						action: 'cancel',
						reason: this.cancelReason.trim()
					}
				});
				this.showToast('Requisition cancelled');
				this.showCancelDialog = false;
				this.showPanel = false;
				await this.loadRequisitions();
			} catch (e) {
				this.showToast('Failed to cancel', 'error');
			}
			this.cancelling = false;
		},

		formatDate(d) {
			if (!d) return '—';
			return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
		},

		formatDateTime(d) {
			if (!d) return '—';
			const date = new Date(d);
			return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
				' at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
		},

		showToast(msg, type = 'success') {
			this.toast = { show: true, msg, type };
		}
	}
};
</script>

<style scoped>
.requisitions-tab { padding-bottom: 40px; }

.tab-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.tab-header h2 { margin: 0; font-size: 20px; font-weight: 600; }

.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 14px; }
.btn-secondary:hover { background: #f9fafb; }
.btn-danger { background: #ef4444; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-danger:hover { background: #dc2626; }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 12px; margin-bottom: 20px; }

.filters-row { display: flex; gap: 12px; margin-bottom: 20px; }
.search-input { flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; min-width: 0; }
.search-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.filter-select { padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; background: #fff; min-width: 160px; }

.table-wrapper { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow-x: auto; }
.wf-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.wf-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.wf-table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: #f9fafb; }
.center-text { text-align: center; color: #9ca3af; padding: 40px 16px !important; }

.req-id { font-family: monospace; font-size: 12px; color: #6b7280; }
.req-title-cell { font-weight: 600; color: #111827; }
.rev-badge { display: inline-block; padding: 2px 6px; margin-left: 6px; background: #fef3c7; color: #92400e; border-radius: 8px; font-size: 10px; font-weight: 700; }

.level-chip { display: inline-block; padding: 2px 8px; background: #eef2ff; color: #4338ca; border-radius: 8px; font-size: 11px; font-weight: 600; margin-right: 4px; }
.type-chip { display: inline-block; font-size: 11px; color: #6b7280; }

.days-normal { color: #6b7280; font-size: 13px; }
.days-warning { color: #f59e0b; font-weight: 600; font-size: 13px; }
.days-overdue { color: #ef4444; font-weight: 700; font-size: 13px; }

.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; display: flex; justify-content: space-between; align-items: center; }
.form-group label .hint { font-weight: 400; color: #9ca3af; font-size: 11px; }
.form-input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.form-textarea { resize: vertical; font-family: inherit; }

.revision-note { background: #fffbeb; border: 1px solid #f59e0b; border-radius: 8px; padding: 12px 16px; margin-bottom: 16px; }
.revision-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; color: #92400e; }
.revision-icon { font-size: 18px; }
.revision-comment { margin: 0; color: #78350f; font-size: 13px; line-height: 1.5; }

.approval-info { display: flex; gap: 10px; align-items: flex-start; background: #eff6ff; border-left: 3px solid #3b82f6; padding: 12px 16px; margin-top: 16px; border-radius: 6px; font-size: 13px; color: #1e40af; }
.info-icon { font-size: 16px; }

/* Detail Panel styles */
.detail-content { display: flex; flex-direction: column; gap: 12px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.detail-label { font-size: 13px; font-weight: 600; color: #6b7280; }
.detail-section { padding: 12px 0; }
.detail-desc { margin-top: 8px; font-size: 14px; color: #374151; line-height: 1.6; }

.leadership-comment { background: #fffbeb; padding: 12px; border-radius: 8px; border-left: 3px solid #f59e0b; }
.leadership-comment .detail-label { display: flex; gap: 8px; align-items: center; }

.linked-job-card { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 12px; margin-top: 8px; }
.linked-job-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.linked-job-meta { font-size: 13px; color: #4b5563; margin-bottom: 6px; }
.status-reason { font-size: 12px; color: #92400e; background: #fef3c7; padding: 4px 8px; border-radius: 4px; margin-top: 4px; }
.candidate-count { font-size: 13px; color: #166534; font-weight: 600; margin-top: 8px; }

/* Timeline */
.timeline { margin-top: 12px; position: relative; padding-left: 24px; }
.timeline::before { content: ''; position: absolute; left: 8px; top: 6px; bottom: 6px; width: 2px; background: #e5e7eb; }
.timeline-item { position: relative; padding-bottom: 16px; }
.timeline-item:last-child { padding-bottom: 0; }
.timeline-dot { position: absolute; left: -20px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: #4f46e5; border: 2px solid #fff; box-shadow: 0 0 0 2px #4f46e5; }
.timeline-content { padding-left: 4px; }
.timeline-event { font-weight: 600; font-size: 13px; color: #111827; }
.timeline-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
.timeline-comment { margin-top: 4px; font-size: 12px; color: #78350f; background: #fef3c7; padding: 6px 10px; border-radius: 4px; font-style: italic; }

.cancel-warning { margin-top: 12px; padding: 10px; background: #fef2f2; border-left: 3px solid #ef4444; color: #991b1b; font-size: 13px; border-radius: 4px; }

@media (max-width: 1024px) {
	.kpi-row { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); }
	.wf-table { min-width: 700px; }
}
@media (max-width: 768px) {
	.filters-row { flex-direction: column; gap: 8px; }
	.filter-select { width: 100%; min-width: auto; }
	.form-grid { grid-template-columns: 1fr; }
	.form-group.full { grid-column: 1; }
}
</style>