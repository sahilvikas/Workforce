<template>
	<div class="approvals-tab">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="tab-header">
			<div>
				<h2>{{ isCMO ? 'Team Approvals' : 'Approval Queue' }}</h2>
				<p class="tab-subtitle">
					{{ isCMO
						? 'Requisitions from your team — approve to send on to Priyesh for final approval'
						: 'Requisitions awaiting your review' }}
				</p>
			</div>
		</div>

		<!-- Empty state -->
		<div v-if="!loading && pendingRequisitions.length === 0 && historyRequisitions.length === 0" class="empty-state">
			<div class="empty-icon">✓</div>
			<h3>All caught up</h3>
			<p>No requisitions are waiting for your review right now.</p>
		</div>

		<!-- Pending section -->
		<div v-if="pendingRequisitions.length > 0" class="section">
			<div class="section-header">
				<h3>
					<span class="section-icon pending-icon">⏳</span>
					Awaiting your review
				</h3>
				<span class="section-count">{{ pendingRequisitions.length }}</span>
				<span v-if="isCMO" class="section-hint">You are the first approver — Priyesh sees these only after you approve</span>
			</div>

			<div class="requisition-cards">
				<div v-for="r in pendingRequisitions" :key="r.name" class="req-card" :class="{ overdue: r.days_pending > 7 }">
					<div class="req-card-header">
						<div>
							<div class="req-title">
								{{ r.title }}
								<span v-if="r.revision_count && r.revision_count > 0" class="rev-badge">Revision v{{ r.revision_count + 1 }}</span>
							</div>
							<div class="req-meta">
								<span class="meta-item"><strong>{{ r.team }}</strong></span>
								<span class="meta-item">{{ r.position_level }}</span>
								<span class="meta-item">{{ r.employment_type }}</span>
								<span class="meta-item">{{ r.number_of_openings }} opening{{ r.number_of_openings > 1 ? 's' : '' }}</span>
								<span v-if="r.compensation_range" class="meta-item">{{ r.compensation_range }}</span>
							</div>
							<div class="req-sub">
								Requested by <strong>{{ r.requester_full_name || r.requester }}</strong> ·
								<span :class="daysClass(r)">{{ r.days_pending }} day{{ r.days_pending === 1 ? '' : 's' }} pending</span>
								<span v-if="r.days_pending > 7" class="overdue-badge">Overdue</span>
							</div>
						</div>
						<button class="btn-view-details" @click="openDetail(r)">View full details →</button>
					</div>

					<div class="req-card-body">
						<div class="body-section">
							<div class="body-label">Description</div>
							<div class="body-text">{{ shortDesc(r.description) }}</div>
						</div>
					</div>

					<div class="req-card-actions">
						<button class="btn-approve" @click="openApproveDialog(r)">
							<span class="btn-icon">✓</span> {{ isCMO ? 'Approve & send to Priyesh' : 'Approve' }}
						</button>
						<button class="btn-request-changes" @click="openRequestChangesDialog(r)">
							<span class="btn-icon">↻</span> Request Changes
						</button>
						<button class="btn-reject" @click="openRejectDialog(r)">
							<span class="btn-icon">✗</span> Reject
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- History section -->
		<div v-if="historyRequisitions.length > 0" class="section">
			<div class="section-header">
				<h3>
					<span class="section-icon history-icon">📋</span>
					Recent decisions
				</h3>
				<span class="section-count">{{ historyRequisitions.length }}</span>
			</div>

			<div class="table-wrapper">
				<table class="wf-table">
					<thead>
						<tr>
							<th>Position</th>
							<th>Team</th>
							<th>Requester</th>
							<th v-if="!isCMO">Your Decision</th>
							<th v-if="!isCMO">Decided On</th>
							<th>Current Status</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="r in historyRequisitions" :key="r.name" class="clickable-row" @click="openDetail(r)">
							<td class="req-title-cell">{{ r.title }}</td>
							<td>{{ r.team }}</td>
							<td>{{ r.requester_full_name || r.requester }}</td>
							<td v-if="!isCMO"><Badge :label="r.leadership_decision || '—'" /></td>
							<td v-if="!isCMO">{{ formatDate(r.leadership_decision_on) }}</td>
							<td><Badge :label="r.status" /></td>
						</tr>
					</tbody>
				</table>
			</div>
		</div>

		<!-- Loading state -->
		<div v-if="loading" class="loading-state">Loading...</div>

		<!-- ==================== DETAIL PANEL ==================== -->
		<DetailPanel :visible="showPanel" :title="selectedReq ? selectedReq.title : ''" size="lg" @close="closePanel">
			<div v-if="detailData" class="detail-content">
				<!-- Header info -->
				<div class="detail-header-info">
					<Badge :label="detailData.requisition.status" />
					<span class="detail-id">{{ detailData.requisition.name }}</span>
				</div>

				<!-- Key facts -->
				<div class="detail-facts-grid">
					<div class="fact-item">
						<div class="fact-label">Team</div>
						<div class="fact-value">{{ detailData.requisition.team }}</div>
					</div>
					<div class="fact-item">
						<div class="fact-label">Level</div>
						<div class="fact-value">{{ detailData.requisition.position_level }}</div>
					</div>
					<div class="fact-item">
						<div class="fact-label">Type</div>
						<div class="fact-value">{{ detailData.requisition.employment_type }}</div>
					</div>
					<div class="fact-item">
						<div class="fact-label">Openings</div>
						<div class="fact-value">{{ detailData.requisition.number_of_openings }}</div>
					</div>
					<div class="fact-item">
						<div class="fact-label">CTC Range</div>
						<div class="fact-value">{{ detailData.requisition.compensation_range || '—' }}</div>
					</div>
					<div class="fact-item">
						<div class="fact-label">Target Start</div>
						<div class="fact-value">{{ formatDate(detailData.requisition.target_start_date) }}</div>
					</div>
					<div class="fact-item">
						<div class="fact-label">Reason</div>
						<div class="fact-value">{{ detailData.requisition.reason }}</div>
					</div>
					<div class="fact-item">
						<div class="fact-label">Requester</div>
						<div class="fact-value">{{ detailData.requisition.requester_name }}</div>
					</div>
					<div class="fact-item" v-if="detailData.requisition.approving_manager_name">
						<div class="fact-label">First Approver</div>
						<div class="fact-value">{{ detailData.requisition.approving_manager_name }}</div>
					</div>
				</div>

				<!-- Description -->
				<div class="detail-section highlight-section">
					<div class="section-title">Job Description</div>
					<div class="section-body" v-html="detailData.requisition.description"></div>
				</div>

				<!-- Required skills -->
				<div v-if="detailData.requisition.required_skills" class="detail-section">
					<div class="section-title">Required Skills</div>
					<div class="section-body">{{ detailData.requisition.required_skills }}</div>
				</div>

				<!-- Previous comment (if revision) -->
				<div v-if="detailData.requisition.revision_count > 0 && detailData.requisition.leadership_comment" class="detail-section revision-history">
					<div class="section-title">
						Previous comment (before revision)
					</div>
					<div class="section-body">{{ detailData.requisition.leadership_comment }}</div>
				</div>

				<!-- Timeline -->
				<div class="detail-section">
					<div class="section-title">Timeline</div>
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
				<template v-if="detailData && canDecideOn(detailData.permissions)">
					<button class="btn-reject" @click="openRejectDialog(detailData.requisition)">Reject</button>
					<button class="btn-request-changes" @click="openRequestChangesDialog(detailData.requisition)">Request Changes</button>
					<button class="btn-approve" @click="openApproveDialog(detailData.requisition)">Approve</button>
				</template>
			</template>
		</DetailPanel>

		<!-- ==================== APPROVE DIALOG ==================== -->
		<Dialog :visible="showApproveDialog" :title="isCMO ? 'Approve & Send to Priyesh' : 'Approve Requisition'"
			:submitLabel="isCMO ? 'Approve & Send' : 'Approve'"
			:loading="deciding" size="sm" @close="showApproveDialog = false" @submit="submitDecision('Approved')">
			<p class="dialog-intro">
				Approve <strong>{{ actionReq && actionReq.title }}</strong> for {{ actionReq && (actionReq.requester_full_name || actionReq.requester) }}?
			</p>
			<div class="form-group full">
				<label>Comment (optional)</label>
				<textarea v-model="decisionComment" class="form-input form-textarea" rows="3"
					:placeholder="isCMO ? 'Any context for Priyesh...' : 'Any notes for HR...'"></textarea>
			</div>
			<p class="dialog-note approve-note">
				{{ isCMO
					? 'This goes to Priyesh for final approval. It is not live until he approves and HR publishes it.'
					: 'HR will be notified and can proceed to publish + assign a recruiter.' }}
			</p>
		</Dialog>

		<!-- ==================== REQUEST CHANGES DIALOG ==================== -->
		<Dialog :visible="showRequestChangesDialog" title="Request Changes" submitLabel="Send Back for Revision"
			:loading="deciding" size="sm" @close="showRequestChangesDialog = false" @submit="submitDecision('Request Changes')">
			<p class="dialog-intro">
				Send <strong>{{ actionReq && actionReq.title }}</strong> back to the manager with your feedback:
			</p>
			<div class="form-group full">
				<label>What needs to change? *</label>
				<textarea v-model="decisionComment" class="form-input form-textarea" rows="4"
					placeholder="e.g. Reduce CTC to Rs 12L, or clarify why this seniority is needed..."></textarea>
			</div>
			<p class="dialog-note request-note">
				The manager can edit and resubmit. You'll see the revised version back in your queue.
			</p>
		</Dialog>

		<!-- ==================== REJECT DIALOG ==================== -->
		<Dialog :visible="showRejectDialog" title="Reject Requisition" submitLabel="Confirm Reject"
			:loading="deciding" size="sm" @close="showRejectDialog = false" @submit="submitDecision('Rejected')">
			<p class="dialog-intro">
				Reject <strong>{{ actionReq && actionReq.title }}</strong>? This will close the requisition permanently.
			</p>
			<div class="form-group full">
				<label>Reason for rejection *</label>
				<textarea v-model="decisionComment" class="form-input form-textarea" rows="4"
					placeholder="Explain why this position is being rejected..."></textarea>
			</div>
			<p class="dialog-note reject-note">
				{{ isCMO
					? 'The requisition stops here — it will not go to Priyesh. The manager will be notified and would need to raise a new one.'
					: 'The manager will be notified. To hire for this role later, they\'ll need to create a new requisition.' }}
			</p>
		</Dialog>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import Dialog from './shared/Dialog.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';

export default {
	name: 'ApprovalsTab',
	components: { Badge, Dialog, DetailPanel, Toast },

	data() {
		return {
			requisitions: [],
			roleView: '',
			loading: false,
			deciding: false,
			showPanel: false,
			showApproveDialog: false,
			showRequestChangesDialog: false,
			showRejectDialog: false,
			selectedReq: null,
			detailData: null,
			actionReq: null,
			decisionComment: '',
			toast: { show: false, msg: '', type: 'success' }
		};
	},

	computed: {
		// The API decides the view: 'cmo' for an approving manager (Samarth),
		// 'leadership' for Priyesh, 'hr_manager' for HR/System Manager.
		isCMO() {
			return this.roleView === 'cmo';
		},

		pendingRequisitions() {
			const waitingStatus = this.isCMO ? 'Pending CMO Approval' : 'Pending Approval';
			return this.requisitions
				.filter(r => {
					if (r.status !== waitingStatus) return false;
					// CMO only acts on requisitions actually routed to him
					if (this.isCMO && !r.awaiting_me) return false;
					return true;
				})
				.sort((a, b) => (b.days_pending || 0) - (a.days_pending || 0));  // oldest first
		},

		historyRequisitions() {
			const done = this.isCMO
				? ['Pending Approval', 'Approved', 'Rejected by CMO', 'Needs Revision', 'Published', 'Rejected']
				: ['Approved', 'Rejected', 'Needs Revision', 'Published'];
			return this.requisitions
				.filter(r => done.includes(r.status))
				.sort((a, b) => {
					const dateA = new Date(a.leadership_decision_on || a.creation || 0);
					const dateB = new Date(b.leadership_decision_on || b.creation || 0);
					return dateB - dateA;  // most recent first
				})
				.slice(0, 20);  // last 20 decisions
		}
	},

	mounted() {
		this.loadRequisitions();
	},

	methods: {
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
				this.roleView = res.role_view || '';
			} catch (e) {
				this.showToast('Failed to load requisitions', 'error');
			}
			this.loading = false;
		},

		// Either approver can act, depending on which stage the requisition is at
		canDecideOn(perms) {
			if (!perms) return false;
			return !!(perms.can_approve || perms.can_cmo_decide);
		},

		daysClass(r) {
			if (r.days_pending > 7) return 'days-overdue';
			if (r.days_pending > 4) return 'days-warning';
			return 'days-normal';
		},

		shortDesc(text) {
			const t = (text || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
			if (!t) return 'Not provided';
			return t.length > 500 ? t.slice(0, 500) + ' …' : t;
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

		openApproveDialog(req) {
			this.actionReq = req;
			this.decisionComment = '';
			this.showApproveDialog = true;
		},

		openRequestChangesDialog(req) {
			this.actionReq = req;
			this.decisionComment = '';
			this.showRequestChangesDialog = true;
		},

		openRejectDialog(req) {
			this.actionReq = req;
			this.decisionComment = '';
			this.showRejectDialog = true;
		},

		async submitDecision(decision) {
			if (decision === 'Request Changes' && !this.decisionComment.trim()) {
				this.showToast('Please explain what needs to change', 'error');
				return;
			}
			if (decision === 'Rejected' && !this.decisionComment.trim()) {
				this.showToast('Please provide a rejection reason', 'error');
				return;
			}

			// Route to the right decision API for this stage.
			// A requisition at "Pending CMO Approval" is always the CMO's call,
			// even if a System Manager is the one clicking.
			const atCmoStage = this.actionReq && this.actionReq.status === 'Pending CMO Approval';
			const method = (this.isCMO || atCmoStage) ? 'wf_cmo_decide' : 'wf_leadership_decide';

			this.deciding = true;
			try {
				await this.api(method, {
					data: {
						requisition: this.actionReq.name,
						decision: decision,
						comment: this.decisionComment.trim()
					}
				});

				const cmoMessages = {
					'Approved': 'Approved — sent to Priyesh for final approval',
					'Request Changes': 'Sent back to the manager for revision',
					'Rejected': 'Requisition rejected'
				};
				const leadMessages = {
					'Approved': 'Requisition approved',
					'Request Changes': 'Sent back to manager for revision',
					'Rejected': 'Requisition rejected'
				};
				const messages = (method === 'wf_cmo_decide') ? cmoMessages : leadMessages;
				this.showToast(messages[decision] || 'Decision recorded');

				this.showApproveDialog = false;
				this.showRequestChangesDialog = false;
				this.showRejectDialog = false;
				this.showPanel = false;
				this.actionReq = null;
				this.decisionComment = '';

				await this.loadRequisitions();
			} catch (e) {
				this.showToast('Failed to submit decision: ' + (e.message || 'Please try again'), 'error');
			}
			this.deciding = false;
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
.approvals-tab { padding-bottom: 40px; }

.tab-header { margin-bottom: 24px; }
.tab-header h2 { margin: 0; font-size: 22px; font-weight: 700; color: #111827; }
.tab-subtitle { margin: 4px 0 0; color: #6b7280; font-size: 14px; }

.empty-state {
	background: #fff;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 60px 20px;
	text-align: center;
}
.empty-icon {
	font-size: 48px;
	color: #10b981;
	width: 80px;
	height: 80px;
	border-radius: 50%;
	background: #d1fae5;
	display: inline-flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 16px;
}
.empty-state h3 { margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #111827; }
.empty-state p { margin: 0; color: #6b7280; font-size: 14px; }

.section { margin-bottom: 32px; }
.section-header {
	display: flex;
	align-items: center;
	gap: 12px;
	margin-bottom: 16px;
	flex-wrap: wrap;
}
.section-header h3 {
	margin: 0;
	font-size: 16px;
	font-weight: 700;
	color: #111827;
	display: flex;
	align-items: center;
	gap: 8px;
}
.section-icon {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 28px;
	height: 28px;
	border-radius: 50%;
	font-size: 14px;
}
.pending-icon { background: #fef3c7; color: #92400e; }
.history-icon { background: #f3f4f6; color: #4b5563; }
.section-count {
	background: #f3f4f6;
	color: #4b5563;
	padding: 2px 12px;
	border-radius: 12px;
	font-size: 13px;
	font-weight: 600;
}
.section-hint { color: #6b7280; font-size: 13px; }

.requisition-cards { display: flex; flex-direction: column; gap: 16px; }

.req-card {
	background: #fff;
	border: 1px solid #e5e7eb;
	border-radius: 12px;
	padding: 20px;
	transition: box-shadow 0.15s;
}
.req-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.req-card.overdue { border-left: 4px solid #ef4444; }

.req-card-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 16px;
	margin-bottom: 16px;
}
.req-title {
	font-size: 17px;
	font-weight: 700;
	color: #111827;
	margin-bottom: 6px;
	display: flex;
	align-items: center;
	gap: 8px;
	flex-wrap: wrap;
}
.rev-badge {
	display: inline-block;
	padding: 2px 8px;
	background: #fef3c7;
	color: #92400e;
	border-radius: 8px;
	font-size: 11px;
	font-weight: 700;
}
.req-meta {
	display: flex;
	gap: 12px;
	flex-wrap: wrap;
	margin-bottom: 4px;
	color: #4b5563;
	font-size: 13px;
}
.meta-item::after {
	content: '·';
	margin-left: 12px;
	color: #d1d5db;
}
.meta-item:last-child::after { content: ''; margin: 0; }
.req-sub {
	color: #6b7280;
	font-size: 13px;
	display: flex;
	gap: 8px;
	align-items: center;
	flex-wrap: wrap;
}
.days-normal { color: #6b7280; }
.days-warning { color: #f59e0b; font-weight: 600; }
.days-overdue { color: #ef4444; font-weight: 700; }
.overdue-badge {
	background: #fee2e2;
	color: #991b1b;
	padding: 2px 8px;
	border-radius: 8px;
	font-size: 11px;
	font-weight: 700;
}

.btn-view-details {
	background: transparent;
	color: #4f46e5;
	border: none;
	font-size: 13px;
	font-weight: 600;
	cursor: pointer;
	white-space: nowrap;
	padding: 4px 8px;
}
.btn-view-details:hover { color: #4338ca; text-decoration: underline; }

.req-card-body {
	background: #f9fafb;
	border-radius: 8px;
	padding: 12px 14px;
	margin-bottom: 16px;
}
.body-section { margin-bottom: 8px; }
.body-section:last-child { margin-bottom: 0; }
.body-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.body-text { color: #374151; font-size: 13px; line-height: 1.5; }

.req-card-actions {
	display: flex;
	gap: 8px;
	flex-wrap: wrap;
}

.btn-approve, .btn-request-changes, .btn-reject {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 10px 20px;
	border: none;
	border-radius: 8px;
	font-weight: 600;
	font-size: 14px;
	cursor: pointer;
	transition: all 0.15s;
}
.btn-approve { background: #10b981; color: #fff; }
.btn-approve:hover { background: #059669; }
.btn-request-changes { background: #f59e0b; color: #fff; }
.btn-request-changes:hover { background: #d97706; }
.btn-reject { background: #fff; color: #ef4444; border: 1.5px solid #ef4444; }
.btn-reject:hover { background: #ef4444; color: #fff; }
.btn-icon { font-size: 15px; font-weight: 700; }

.loading-state {
	text-align: center;
	padding: 40px;
	color: #6b7280;
}

.table-wrapper { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow-x: auto; }
.wf-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.wf-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.wf-table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: #f9fafb; }
.req-title-cell { font-weight: 600; color: #111827; }

/* Detail Panel */
.detail-content { display: flex; flex-direction: column; gap: 20px; }

.detail-header-info {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding-bottom: 16px;
	border-bottom: 1px solid #f3f4f6;
}
.detail-id { font-family: monospace; font-size: 12px; color: #6b7280; }

.detail-facts-grid {
	display: grid;
	grid-template-columns: 1fr 1fr;
	gap: 16px;
}
.fact-item { }
.fact-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.fact-value { font-size: 14px; color: #111827; font-weight: 500; }

.detail-section { }
.section-title {
	font-size: 12px;
	font-weight: 700;
	color: #6b7280;
	text-transform: uppercase;
	letter-spacing: 0.5px;
	margin-bottom: 8px;
}
.section-body {
	color: #374151;
	font-size: 14px;
	line-height: 1.6;
}
.highlight-section {
	background: #eff6ff;
	border-left: 3px solid #3b82f6;
	padding: 12px 16px;
	border-radius: 6px;
}
.highlight-section .section-title { color: #1e40af; }

.revision-history {
	background: #fffbeb;
	border-left: 3px solid #f59e0b;
	padding: 12px 16px;
	border-radius: 6px;
}
.revision-history .section-title { color: #92400e; }

.timeline { position: relative; padding-left: 24px; }
.timeline::before { content: ''; position: absolute; left: 8px; top: 6px; bottom: 6px; width: 2px; background: #e5e7eb; }
.timeline-item { position: relative; padding-bottom: 16px; }
.timeline-item:last-child { padding-bottom: 0; }
.timeline-dot { position: absolute; left: -20px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: #4f46e5; border: 2px solid #fff; box-shadow: 0 0 0 2px #4f46e5; }
.timeline-content { padding-left: 4px; }
.timeline-event { font-weight: 600; font-size: 13px; color: #111827; }
.timeline-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
.timeline-comment { margin-top: 4px; font-size: 12px; color: #78350f; background: #fef3c7; padding: 6px 10px; border-radius: 4px; font-style: italic; }

/* Dialog content */
.dialog-intro { margin: 0 0 16px; font-size: 14px; color: #374151; line-height: 1.5; }
.dialog-note {
	margin: 12px 0 0;
	padding: 10px 12px;
	border-radius: 6px;
	font-size: 12px;
	line-height: 1.5;
}
.approve-note { background: #f0fdf4; color: #166534; border-left: 3px solid #10b981; }
.request-note { background: #fffbeb; color: #92400e; border-left: 3px solid #f59e0b; }
.reject-note { background: #fef2f2; color: #991b1b; border-left: 3px solid #ef4444; }

.form-group { display: flex; flex-direction: column; gap: 6px; }
.form-group.full { grid-column: 1 / -1; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.form-textarea { resize: vertical; font-family: inherit; }

@media (max-width: 768px) {
	.req-card-header { flex-direction: column; align-items: stretch; }
	.req-card-actions { flex-direction: column; }
	.btn-approve, .btn-request-changes, .btn-reject { justify-content: center; }
	.detail-facts-grid { grid-template-columns: 1fr; }
}
</style>