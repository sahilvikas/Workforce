<template>
	<div class="jobs-tab">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<!-- Sub Navigation -->
		<div class="sub-nav">
			<button :class="{ active: subView === 'dashboard' }" @click="switchSubView('dashboard')">Hiring Dashboard</button>
			<button :class="{ active: subView === 'jobs' }" @click="switchSubView('jobs')">Job Openings</button>
			<button :class="{ active: subView === 'templates' }" @click="switchSubView('templates')">Interview Templates</button>
		</div>

		<!-- ==================== HIRING DASHBOARD VIEW ==================== -->
		<div v-if="subView === 'dashboard'">
			<div class="tab-header">
				<div>
					<h2>Hiring Dashboard</h2>
					<p class="tab-subtitle">Requisitions ready to publish, pending approvals, and live positions</p>
				</div>
			</div>

			<div class="kpi-row">
				<KpiCard label="Awaiting HR Review" :value="approvedRequisitions.length" />
				<KpiCard label="Pending Leadership" :value="pendingLeadershipRequisitions.length" />
				<KpiCard label="Live Positions" :value="livePositions.length" />
				<KpiCard label="On Hold" :value="onHoldPositions.length" />
				<KpiCard label="Filled/Closed" :value="closedPositions.length" />
			</div>

			<div v-if="approvedRequisitions.length > 0" class="section">
				<div class="section-header approved-header">
					<h3><span class="section-icon approved-icon">✓</span> Awaiting HR Review</h3>
					<span class="section-count">{{ approvedRequisitions.length }}</span>
					<span class="section-hint">Approved by leadership — ready to publish and assign to a recruiter</span>
				</div>
				<div class="req-cards">
					<div v-for="r in approvedRequisitions" :key="r.name" class="req-card approved-card">
						<div class="req-card-header">
							<div>
								<div class="req-title">{{ r.title }} <Badge label="Approved" /></div>
								<div class="req-meta">
									<span class="meta-item"><strong>{{ r.team }}</strong></span>
									<span class="meta-item">{{ r.position_level }}</span>
									<span class="meta-item">{{ r.employment_type }}</span>
									<span class="meta-item">{{ r.number_of_openings }} opening{{ r.number_of_openings > 1 ? 's' : '' }}</span>
									<span v-if="r.compensation_range" class="meta-item">{{ r.compensation_range }}</span>
								</div>
								<div class="req-sub">Requested by <strong>{{ r.requester_full_name || r.requester }}</strong> · Approved {{ formatDate(r.leadership_decision_on) }}</div>
							</div>
						</div>
						<div class="req-card-actions">
							<button class="btn-secondary" @click="openReqDetail(r)">View Details</button>
							<button class="btn-primary" @click="openPublishDialog(r)"><span class="btn-icon">🚀</span> Publish + Assign</button>
						</div>
					</div>
				</div>
			</div>

			<div v-if="pendingLeadershipRequisitions.length > 0" class="section">
				<div class="section-header pending-header">
					<h3><span class="section-icon pending-icon">⏳</span> Pending Leadership Approval</h3>
					<span class="section-count">{{ pendingLeadershipRequisitions.length }}</span>
					<span class="section-hint">Waiting on Priyesh · Read-only</span>
				</div>
				<div class="table-wrapper compact">
					<table class="wf-table">
						<thead>
							<tr><th>Position</th><th>Team</th><th>Openings</th><th>Requester</th><th>Days Pending</th></tr>
						</thead>
						<tbody>
							<tr v-for="r in pendingLeadershipRequisitions" :key="r.name" class="clickable-row" @click="openReqDetail(r)">
								<td class="req-title-cell">{{ r.title }} <span v-if="r.revision_count && r.revision_count > 0" class="rev-badge">v{{ r.revision_count + 1 }}</span></td>
								<td>{{ r.team }}</td>
								<td>{{ r.number_of_openings }}</td>
								<td>{{ r.requester_full_name || r.requester }}</td>
								<td :class="daysClass(r)">{{ r.days_pending }}d</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<div class="section">
				<div class="section-header live-header">
					<h3><span class="section-icon live-icon">🟢</span> Live Positions</h3>
					<span class="section-count">{{ livePositions.length }}</span>
					<span class="section-hint">Published positions currently accepting or paused</span>
				</div>

				<div class="filters-row" v-if="livePositions.length > 0 || onHoldPositions.length > 0">
					<input v-model="dashboardSearch" type="text" placeholder="Search live positions..." class="search-input" />
					<select v-model="dashboardStatusFilter" class="filter-select">
						<option value="">Open + On Hold</option>
						<option value="Open">Open only</option>
						<option value="On Hold">On Hold only</option>
						<option value="Closed">Closed</option>
					</select>
				</div>

				<div class="table-wrapper" v-if="filteredLivePositions.length > 0">
					<table class="wf-table">
						<thead>
							<tr><th>Position</th><th>Team</th><th>Openings</th><th>HR Owner</th><th>Priority</th><th>Applicants</th><th>Status</th><th>Days Live</th><th>Actions</th></tr>
						</thead>
						<tbody>
							<tr v-for="pos in filteredLivePositions" :key="pos.name" class="clickable-row" @click="openPositionDetail(pos)">
								<td class="req-title-cell">{{ pos.job_title }}</td>
								<td>{{ pos.department || '—' }}</td>
								<td>{{ pos.no_of_positions || 1 }}</td>
								<td>
									<span v-if="pos.assigned_hr" class="owner-chip">{{ pos.assigned_hr_name || pos.assigned_hr }}</span>
									<span v-else class="unassigned">Unassigned</span>
								</td>
								<td>
									<span v-if="pos.priority" :class="'priority-' + pos.priority.toLowerCase()">{{ pos.priority }}</span>
									<span v-else>—</span>
								</td>
								<td>{{ pos.applicant_count || 0 }}</td>
								<td><Badge :label="pos.status" /></td>
								<td>{{ daysSincePosted(pos.posted_on) }}d</td>
								<td @click.stop><button class="btn-link" @click="openPositionActionMenu(pos, $event)">Actions ▾</button></td>
							</tr>
						</tbody>
					</table>
				</div>
				<div v-else class="empty-state"><p>No live positions yet. Publish an approved requisition to create one.</p></div>
			</div>

			<div v-if="approvedRequisitions.length === 0 && pendingLeadershipRequisitions.length === 0 && livePositions.length === 0" class="empty-state large">
				<div class="empty-icon">📋</div>
				<h3>No active hiring activity</h3>
				<p>When managers submit requisitions, they'll appear here after Priyesh approves them.</p>
			</div>
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
						<tr><th>Job Title</th><th>Department</th><th>Positions</th><th>Template</th><th>Posted</th><th>Closing</th><th>Status</th><th>Actions</th></tr>
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
						<tr><th>Template Name</th><th>Rounds</th><th>Used By Jobs</th><th>Actions</th></tr>
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

		<!-- ==================== PUBLISH + ASSIGN DIALOG ==================== -->
		<Dialog :visible="showPublishDialog" title="Publish + Assign Requisition" submitLabel="Publish" :loading="publishing" size="md" @close="showPublishDialog = false" @submit="publishRequisition">
			<div v-if="publishReq" class="publish-preview">
				<div class="publish-title">{{ publishReq.title }}</div>
				<div class="publish-meta">{{ publishReq.team }} · {{ publishReq.number_of_openings }} opening{{ publishReq.number_of_openings > 1 ? 's' : '' }} · {{ publishReq.position_level }} · {{ publishReq.employment_type }}</div>
			</div>
			<div class="form-group full">
				<label>HR Owner *</label>
				<select v-model="publishForm.hr_owner" class="form-input">
					<option value="">— Select recruiter —</option>
					<optgroup label="Recruitment Coordinators">
						<option v-for="u in recruitmentCoordinators" :key="u.name" :value="u.name">{{ u.full_name || u.name }}</option>
					</optgroup>
					<optgroup label="HR Manager (Caretaker)">
						<option v-for="u in hrManagers" :key="u.name" :value="u.name">{{ u.full_name || u.name }} (self)</option>
					</optgroup>
				</select>
				<p class="field-hint">Recruiter will handle screening, interviews, and offers for this position.</p>
			</div>
			<div class="form-group full">
				<label>Priority</label>
				<div class="priority-picker">
					<label v-for="p in ['High', 'Medium', 'Low']" :key="p" class="priority-option" :class="{ selected: publishForm.priority === p, ['priority-' + p.toLowerCase()]: true }">
						<input type="radio" :value="p" v-model="publishForm.priority" />
						<span>{{ p }}</span>
					</label>
				</div>
			</div>
			<div class="form-group full">
				<label>Interview Template (optional)</label>
				<select v-model="publishForm.interview_template" class="form-input">
					<option value="">— Recruiter will set later —</option>
					<option v-for="t in templates" :key="t.name" :value="t.name">{{ t.template_name || t.name }}</option>
				</select>
				<p class="field-hint">Pre-selecting a template speeds up interview scheduling.</p>
			</div>
			<div class="dialog-note publish-note">This will create a Job Opening from this requisition and notify the assigned recruiter + requester.</div>
		</Dialog>

		<!-- ==================== POSITION ACTION DIALOG ==================== -->
		<Dialog :visible="showActionDialog" :title="actionDialogTitle" :submitLabel="actionSubmitLabel" :loading="actioning" size="md" @close="showActionDialog = false" @submit="submitPositionAction">
			<div v-if="actionPosition" class="publish-preview">
				<div class="publish-title">{{ actionPosition.job_title }}</div>
				<div class="publish-meta">Current status: <Badge :label="actionPosition.status" /></div>
			</div>
			<div v-if="actionType === 'hold' || actionType === 'close'" class="form-group full">
				<label>Reason *</label>
				<textarea v-model="actionForm.reason" class="form-input form-textarea" rows="3" :placeholder="actionType === 'hold' ? 'e.g. Budget review pending, waiting on client confirmation...' : 'e.g. Position filled internally, requirements changed...'"></textarea>
			</div>
			<div v-if="actionType === 'reassign'" class="form-group full">
				<label>New HR Owner *</label>
				<select v-model="actionForm.new_owner" class="form-input">
					<option value="">— Select new recruiter —</option>
					<optgroup label="Recruitment Coordinators">
						<option v-for="u in recruitmentCoordinators" :key="u.name" :value="u.name">{{ u.full_name || u.name }}</option>
					</optgroup>
					<optgroup label="HR Manager (Caretaker)">
						<option v-for="u in hrManagers" :key="u.name" :value="u.name">{{ u.full_name || u.name }}</option>
					</optgroup>
				</select>
				<p class="field-hint" v-if="actionPosition && actionPosition.assigned_hr">Currently assigned to {{ actionPosition.assigned_hr_name || actionPosition.assigned_hr }}</p>
			</div>
			<div v-if="actionType === 'reactivate'" class="dialog-note reactivate-note">This position will be Open again and start accepting new applications. Existing candidates in the pipeline are already active.</div>
			<div v-if="actionType === 'hold'" class="dialog-note hold-note">New applications will be blocked. Existing candidates in interviews/offers continue normally.</div>
			<div v-if="actionType === 'close'" class="dialog-note close-note">This position will be permanently closed. All recruitment activity stops.</div>
		</Dialog>

		<!-- ==================== ACTION MENU ==================== -->
		<div v-if="actionMenuVisible" class="action-menu-backdrop" @click="actionMenuVisible = false">
			<div class="action-menu" :style="actionMenuStyle" @click.stop>
				<button v-if="actionMenuPos.status === 'Open'" class="menu-item" @click="startAction('hold')"><span class="menu-icon">⏸</span> Put on Hold</button>
				<button v-if="actionMenuPos.status === 'On Hold'" class="menu-item" @click="startAction('reactivate')"><span class="menu-icon">▶</span> Reactivate</button>
				<button v-if="actionMenuPos.status !== 'Closed'" class="menu-item" @click="startAction('reassign')"><span class="menu-icon">↻</span> Reassign Owner</button>
				<button v-if="actionMenuPos.status !== 'Closed'" class="menu-item menu-danger" @click="startAction('close')"><span class="menu-icon">✗</span> Close Position</button>
			</div>
		</div>

		<!-- ==================== JOB CREATE/EDIT DIALOG ==================== -->
		<Dialog :visible="showDialog" :title="editingJob ? 'Edit Job Opening' : 'New Job Opening'" :submitLabel="editingJob ? 'Update' : 'Create'" :loading="saving" size="lg" @close="closeDialog" @submit="saveJob">
			<div class="form-grid">
				<div class="form-group full"><label>Job Title *</label><input v-model="form.job_title" type="text" class="form-input" placeholder="e.g. Senior Python Developer" /></div>
				<div class="form-group"><label>Department</label>
					<select v-model="form.department" class="form-input">
						<option value="">— Select Department —</option>
						<option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
					</select>
				</div>
				<div class="form-group"><label>Designation</label>
					<select v-model="form.designation" class="form-input">
						<option value="">— Select Designation —</option>
						<option v-for="d in designations" :key="d.name" :value="d.name">{{ d.name }}</option>
					</select>
				</div>
				<div class="form-group"><label>No. of Positions</label><input v-model.number="form.no_of_positions" type="number" min="1" class="form-input" /></div>
				<div class="form-group"><label>Status</label>
					<select v-model="form.status" class="form-input">
						<option value="Open">Open</option>
						<option value="On Hold">On Hold</option>
						<option value="Closed">Closed</option>
					</select>
				</div>
				<div class="form-group"><label>Posted On</label><input v-model="form.posted_on" type="date" class="form-input" /></div>
				<div class="form-group"><label>Closing Date</label><input v-model="form.closing_date" type="date" class="form-input" /></div>
				<div class="form-group full"><label>Interview Template</label>
					<select v-model="form.interview_template" class="form-input">
						<option value="">— None —</option>
						<option v-for="t in templates" :key="t.name" :value="t.name">{{ t.template_name || t.name }}</option>
					</select>
				</div>
				<div class="form-group full"><label>Description</label><textarea v-model="form.description" class="form-input form-textarea" rows="4" placeholder="Job description..."></textarea></div>
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
				<div class="form-group full"><label>Template Name *</label><input v-model="templateForm.template_name" type="text" class="form-input" placeholder="e.g. Engineering 3-Round Process" /></div>
				<div class="form-group full">
					<label>Interview Rounds</label>
					<div class="rounds-list">
						<div v-for="(round, i) in templateForm.rounds" :key="i" class="round-card">
							<div class="round-header">
								<span class="round-number">Round {{ i + 1 }}</span>
								<button class="btn-icon remove-btn" @click="removeRound(i)">&times;</button>
							</div>
							<div class="form-grid">
								<div class="form-group"><label>Round Name *</label><input v-model="round.round_name" type="text" class="form-input" placeholder="e.g. Technical Round" /></div>
								<div class="form-group"><label>Default Interviewer</label>
									<select v-model="round.default_interviewer" class="form-input">
										<option value="">— Select Interviewer —</option>
										<option v-for="u in interviewers" :key="u.name" :value="u.name">{{ u.full_name || u.name }}</option>
									</select>
								</div>
								<div class="form-group"><label>Duration (minutes)</label><input v-model.number="round.duration" type="number" min="15" class="form-input" placeholder="45" /></div>
							</div>
						</div>
					</div>
					<button class="btn-link" @click="addRound" style="margin-top: 8px;">+ Add Round</button>
				</div>
			</div>
		</Dialog>

		<!-- ==================== REQUISITION DETAIL PANEL ==================== -->
		<DetailPanel :visible="showReqDetailPanel" :title="selectedReq ? selectedReq.title : ''" size="lg" @close="showReqDetailPanel = false">
			<div v-if="reqDetailData" class="detail-content">
				<div class="detail-header-info">
					<Badge :label="reqDetailData.requisition.status" />
					<span class="detail-id">{{ reqDetailData.requisition.name }}</span>
				</div>
				<div class="detail-facts-grid">
					<div class="fact-item"><div class="fact-label">Team</div><div class="fact-value">{{ reqDetailData.requisition.team }}</div></div>
					<div class="fact-item"><div class="fact-label">Level</div><div class="fact-value">{{ reqDetailData.requisition.position_level }}</div></div>
					<div class="fact-item"><div class="fact-label">Type</div><div class="fact-value">{{ reqDetailData.requisition.employment_type }}</div></div>
					<div class="fact-item"><div class="fact-label">Openings</div><div class="fact-value">{{ reqDetailData.requisition.number_of_openings }}</div></div>
					<div class="fact-item"><div class="fact-label">CTC Range</div><div class="fact-value">{{ reqDetailData.requisition.compensation_range || '—' }}</div></div>
					<div class="fact-item"><div class="fact-label">Requester</div><div class="fact-value">{{ reqDetailData.requisition.requester_name }}</div></div>
				</div>
				<div class="detail-section highlight-section">
					<div class="section-title">Business Justification</div>
					<div class="section-body">{{ reqDetailData.requisition.business_justification }}</div>
				</div>
				<div class="detail-section">
					<div class="section-title">Job Description</div>
					<div class="section-body" v-html="reqDetailData.requisition.description"></div>
				</div>
				<div v-if="reqDetailData.requisition.required_skills" class="detail-section">
					<div class="section-title">Required Skills</div>
					<div class="section-body">{{ reqDetailData.requisition.required_skills }}</div>
				</div>
				<div class="detail-section">
					<div class="section-title">Timeline</div>
					<div class="timeline">
						<div v-for="(t, i) in reqDetailData.timeline" :key="i" class="timeline-item">
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
				<button v-if="reqDetailData && reqDetailData.permissions.can_publish" class="btn-primary" @click="openPublishFromDetail">Publish + Assign</button>
			</template>
		</DetailPanel>

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
				<div v-if="selectedJob.assigned_hr" class="detail-row"><span class="detail-label">HR Owner</span><span>{{ selectedJob.assigned_hr_name || selectedJob.assigned_hr }}</span></div>
				<div v-if="selectedJob.status_reason" class="detail-row"><span class="detail-label">Status Reason</span><span>{{ selectedJob.status_reason }}</span></div>
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
						<div class="round-detail-header"><strong>Round {{ i + 1 }}: {{ r.round_name }}</strong></div>
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
			subView: 'dashboard',
			requisitions: [],
			positions: [],
			dashboardSearch: '',
			dashboardStatusFilter: '',
			publishReq: null,
			publishForm: { hr_owner: '', priority: 'Medium', interview_template: '' },
			publishing: false,
			showPublishDialog: false,
			showReqDetailPanel: false,
			selectedReq: null,
			reqDetailData: null,
			hrManagers: [],
			recruitmentCoordinators: [],
			userNameMap: {},
			showActionDialog: false,
			actionType: '',
			actionPosition: null,
			actionForm: { reason: '', new_owner: '' },
			actioning: false,
			actionMenuVisible: false,
			actionMenuPos: {},
			actionMenuStyle: {},
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
		approvedRequisitions() { return this.requisitions.filter(r => r.status === 'Approved'); },
		pendingLeadershipRequisitions() { return this.requisitions.filter(r => r.status === 'Pending Approval'); },
		livePositions() { return this.positions.filter(p => p.status === 'Open' || p.status === 'On Hold'); },
		onHoldPositions() { return this.positions.filter(p => p.status === 'On Hold'); },
		closedPositions() { return this.positions.filter(p => p.status === 'Closed'); },
		filteredLivePositions() {
			let list = this.positions;
			if (this.dashboardStatusFilter) {
				list = list.filter(p => p.status === this.dashboardStatusFilter);
			} else {
				list = list.filter(p => p.status === 'Open' || p.status === 'On Hold');
			}
			if (this.dashboardSearch) {
				const q = this.dashboardSearch.toLowerCase();
				list = list.filter(p =>
					(p.job_title || '').toLowerCase().includes(q) ||
					(p.department || '').toLowerCase().includes(q) ||
					(p.assigned_hr_name || p.assigned_hr || '').toLowerCase().includes(q)
				);
			}
			return list;
		},
		filteredJobs() {
			return this.jobs.filter(j => {
				const matchSearch = !this.searchQuery ||
					j.job_title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
					(j.department || '').toLowerCase().includes(this.searchQuery.toLowerCase());
				const matchStatus = !this.statusFilter || j.status === this.statusFilter;
				return matchSearch && matchStatus;
			});
		},
		actionDialogTitle() {
			const titles = { hold: 'Put Position on Hold', close: 'Close Position', reactivate: 'Reactivate Position', reassign: 'Reassign HR Owner' };
			return titles[this.actionType] || 'Action';
		},
		actionSubmitLabel() {
			const labels = { hold: 'Put on Hold', close: 'Close Position', reactivate: 'Reactivate', reassign: 'Reassign' };
			return labels[this.actionType] || 'Confirm';
		}
	},

	mounted() {
		this.loadDashboardData();
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
			return { template_name: '', rounds: [{ round_name: '', default_interviewer: '', duration: 45 }] };
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

		async apiQuiet(method, params = {}) {
			// Like api() but suppresses Frappe's global error popup (for optional data)
			return new Promise((resolve) => {
				const call = frappe.call({
					method: method,
					args: params,
					async: true,
					callback: r => resolve(r.message),
					error: () => resolve(null)
				});
				if (call && typeof call.fail === 'function') {
					call.fail(() => resolve(null));
				}
			});
		},

		switchSubView(view) {
			this.subView = view;
			if (view === 'templates') this.loadTemplates();
			if (view === 'jobs') this.loadJobs();
			if (view === 'dashboard') this.loadDashboardData();
		},

		// ───── DASHBOARD ─────

		async loadDashboardData() {
			try {
				const reqRes = await this.api('wf_get_requisitions');
				this.requisitions = reqRes.requisitions || [];
				this.positions = await this.api('wf_get_job_openings');
				await this.loadHROwners();
				await this.enrichPositions();
			} catch (e) {
				this.showToast('Failed to load dashboard data', 'error');
			}
		},

		async enrichPositions() {
			const allKnownUsers = [...this.recruitmentCoordinators, ...this.hrManagers];
			allKnownUsers.forEach(u => {
				if (u.name && u.full_name) {
					this.userNameMap[u.name] = u.full_name;
				}
			});

			this.positions = this.positions.map(p => ({
				...p,
				assigned_hr_name: p.assigned_hr ? (this.userNameMap[p.assigned_hr] || p.assigned_hr.split('@')[0]) : ''
			}));

			for (const pos of this.positions) {
				if (pos.status !== 'Closed') {
					const count = await this.apiQuiet('frappe.client.get_count', {
						doctype: 'WF Applicant',
						filters: { job_opening: pos.name }
					});
					pos.applicant_count = count || 0;
				}
			}
			this.positions = [...this.positions];
		},

		async loadHROwners() {
			try {
				const res = await this.api('wf_get_hr_owners');
				this.recruitmentCoordinators = (res.recruitment_coordinators || []).map(u => ({
					name: u.email,
					full_name: u.full_name
				}));
				this.hrManagers = (res.hr_managers || []).map(u => ({
					name: u.email,
					full_name: u.full_name
				}));
			} catch (e) {
				this.recruitmentCoordinators = [];
				this.hrManagers = [];
			}
		},

		daysClass(r) {
			if (r.days_pending > 7) return 'days-overdue';
			if (r.days_pending > 4) return 'days-warning';
			return 'days-normal';
		},

		daysSincePosted(postedOn) {
			if (!postedOn) return 0;
			const posted = new Date(postedOn);
			const today = new Date();
			return Math.floor((today - posted) / (1000 * 60 * 60 * 24));
		},

		async openReqDetail(req) {
			this.selectedReq = req;
			this.reqDetailData = null;
			this.showReqDetailPanel = true;
			try {
				const res = await this.api('wf_get_requisition_detail', { requisition: req.name });
				this.reqDetailData = res;
			} catch (e) {
				this.showToast('Failed to load requisition details', 'error');
				this.showReqDetailPanel = false;
			}
		},

		openPublishDialog(req) {
			this.publishReq = req;
			this.publishForm = { hr_owner: '', priority: 'Medium', interview_template: '' };
			this.showPublishDialog = true;
		},

		openPublishFromDetail() {
			if (!this.reqDetailData) return;
			this.showReqDetailPanel = false;
			this.openPublishDialog(this.reqDetailData.requisition);
		},

		async publishRequisition() {
			if (!this.publishForm.hr_owner) {
				this.showToast('Please select an HR owner', 'error');
				return;
			}
			this.publishing = true;
			try {
				const res = await this.api('wf_hr_publish_requisition', {
					data: {
						requisition: this.publishReq.name,
						hr_owner: this.publishForm.hr_owner,
						priority: this.publishForm.priority,
						interview_template: this.publishForm.interview_template
					}
				});
				this.showToast(res.message || 'Requisition published');
				this.showPublishDialog = false;
				this.publishReq = null;
				await this.loadDashboardData();
			} catch (e) {
				this.showToast('Failed to publish: ' + (e.message || 'Please try again'), 'error');
			}
			this.publishing = false;
		},

		openPositionActionMenu(pos, event) {
			this.actionMenuPos = pos;
			const rect = event.target.getBoundingClientRect();
			this.actionMenuStyle = {
				top: (rect.bottom + window.scrollY + 4) + 'px',
				left: (rect.left + window.scrollX - 140) + 'px'
			};
			this.actionMenuVisible = true;
		},

		startAction(type) {
			this.actionType = type;
			this.actionPosition = this.actionMenuPos;
			this.actionForm = { reason: '', new_owner: '' };
			this.actionMenuVisible = false;
			this.showActionDialog = true;
		},

		async submitPositionAction() {
			if ((this.actionType === 'hold' || this.actionType === 'close') && !this.actionForm.reason.trim()) {
				this.showToast('Please provide a reason', 'error');
				return;
			}
			if (this.actionType === 'reassign' && !this.actionForm.new_owner) {
				this.showToast('Please select a new owner', 'error');
				return;
			}
			this.actioning = true;
			try {
				const payload = { job_opening: this.actionPosition.name, action: this.actionType };
				if (this.actionForm.reason) payload.reason = this.actionForm.reason.trim();
				if (this.actionForm.new_owner) payload.new_owner = this.actionForm.new_owner;
				const res = await this.api('wf_hr_position_action', { data: payload });
				this.showToast(res.message || 'Action completed');
				this.showActionDialog = false;
				this.actionType = '';
				this.actionPosition = null;
				await this.loadDashboardData();
			} catch (e) {
				this.showToast('Action failed: ' + (e.message || 'Please try again'), 'error');
			}
			this.actioning = false;
		},

		openPositionDetail(pos) {
			this.selectedJob = pos;
			this.showPanel = true;
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
			const res = await this.apiQuiet('frappe.client.get_list', {
				doctype: 'Department',
				fields: ['name'],
				limit_page_length: 0,
				order_by: 'name asc'
			});
			this.departments = res || [];
		},

		async loadDesignations() {
			const res = await this.apiQuiet('frappe.client.get_list', {
				doctype: 'Designation',
				fields: ['name'],
				limit_page_length: 0,
				order_by: 'name asc'
			});
			this.designations = res || [];
		},

		async loadInterviewers() {
			const res = await this.apiQuiet('frappe.client.get_list', {
				doctype: 'User',
				fields: ['name', 'full_name'],
				filters: { enabled: 1, user_type: 'System User' },
				limit_page_length: 0,
				order_by: 'full_name asc'
			});
			this.interviewers = res || [];
		},

		openCreateDialog() { this.editingJob = null; this.form = this.emptyForm(); this.showDialog = true; },
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
		closeDialog() { this.showDialog = false; this.editingJob = null; },
		addSkill() { this.form.required_skills.push({ skill_name: '', is_mandatory: false }); },
		removeSkill(index) { this.form.required_skills.splice(index, 1); },

		async saveJob() {
			if (!this.form.job_title.trim()) { this.showToast('Job title is required', 'error'); return; }
			this.saving = true;
			try {
				const data = {
					...this.form,
					required_skills: this.form.required_skills
						.filter(s => s.skill_name.trim())
						.map(s => ({ skill_name: s.skill_name.trim(), is_mandatory: s.is_mandatory ? 1 : 0 }))
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
				await this.api('wf_update_job_opening', { data: { name: job.name, status: newStatus } });
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

		openDetail(job) { this.selectedJob = job; this.showPanel = true; },

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

		addRound() { this.templateForm.rounds.push({ round_name: '', default_interviewer: '', duration: 45 }); },
		removeRound(index) { this.templateForm.rounds.splice(index, 1); },

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
				await this.api('wf_delete_interview_template', { template_name: template.name });
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
.sub-nav { display: flex; gap: 0; margin-bottom: 20px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; width: fit-content; }
.sub-nav button { padding: 10px 20px; border: none; background: #fff; font-size: 14px; font-weight: 500; color: #6b7280; cursor: pointer; }
.sub-nav button.active { background: #4f46e5; color: #fff; }
.sub-nav button:not(:last-child) { border-right: 1px solid #e5e7eb; }

.tab-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px; }
.tab-header h2 { margin: 0; font-size: 20px; font-weight: 600; }
.tab-subtitle { margin: 4px 0 0; color: #6b7280; font-size: 14px; }

.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; display: inline-flex; align-items: center; gap: 6px; }
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 14px; }
.btn-secondary:hover { background: #f9fafb; }
.btn-danger { background: #ef4444; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-link { background: none; border: none; color: #4f46e5; font-weight: 600; cursor: pointer; padding: 4px 8px; font-size: 13px; }
.btn-link-danger { color: #ef4444; }
.btn-icon { background: none; border: none; font-size: 20px; color: #ef4444; cursor: pointer; padding: 0 4px; }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 16px; margin-bottom: 24px; }

.section { margin-bottom: 32px; }
.section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; flex-wrap: wrap; }
.section-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #111827; display: flex; align-items: center; gap: 8px; }
.section-icon { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; font-size: 14px; }
.approved-icon { background: #d1fae5; color: #065f46; }
.pending-icon { background: #fef3c7; color: #92400e; }
.live-icon { background: #dbeafe; color: #1e40af; }
.section-count { background: #f3f4f6; color: #4b5563; padding: 2px 12px; border-radius: 12px; font-size: 13px; font-weight: 600; }
.section-hint { color: #6b7280; font-size: 13px; }

.req-cards { display: flex; flex-direction: column; gap: 12px; }
.req-card { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 18px 20px; transition: box-shadow 0.15s; }
.req-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.06); }
.approved-card { border-left: 4px solid #10b981; }

.req-card-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; }
.req-title { font-size: 16px; font-weight: 700; color: #111827; margin-bottom: 6px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.req-meta { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 4px; color: #4b5563; font-size: 13px; }
.meta-item::after { content: '·'; margin-left: 12px; color: #d1d5db; }
.meta-item:last-child::after { content: ''; margin: 0; }
.req-sub { color: #6b7280; font-size: 13px; }
.req-card-actions { display: flex; gap: 8px; justify-content: flex-end; }

.rev-badge { display: inline-block; padding: 2px 6px; margin-left: 4px; background: #fef3c7; color: #92400e; border-radius: 8px; font-size: 10px; font-weight: 700; }

.days-normal { color: #6b7280; font-size: 13px; }
.days-warning { color: #f59e0b; font-weight: 600; font-size: 13px; }
.days-overdue { color: #ef4444; font-weight: 700; font-size: 13px; }

.owner-chip { background: #eef2ff; color: #4338ca; padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
.unassigned { color: #ef4444; font-style: italic; font-size: 13px; }
.priority-high { background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.priority-medium { background: #fef3c7; color: #92400e; padding: 2px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; }
.priority-low { background: #f3f4f6; color: #4b5563; padding: 2px 8px; border-radius: 8px; font-size: 12px; font-weight: 600; }

.publish-preview { background: #f9fafb; padding: 12px 16px; border-radius: 8px; margin-bottom: 16px; border-left: 3px solid #4f46e5; }
.publish-title { font-weight: 700; color: #111827; margin-bottom: 4px; }
.publish-meta { color: #6b7280; font-size: 13px; display: flex; align-items: center; gap: 8px; }

.priority-picker { display: flex; gap: 8px; }
.priority-option { display: flex; align-items: center; gap: 6px; padding: 10px 16px; border: 2px solid #e5e7eb; border-radius: 8px; cursor: pointer; font-size: 14px; font-weight: 500; transition: all 0.15s; flex: 1; justify-content: center; }
.priority-option input { display: none; }
.priority-option.selected.priority-high { border-color: #ef4444; background: #fef2f2; color: #991b1b; }
.priority-option.selected.priority-medium { border-color: #f59e0b; background: #fffbeb; color: #92400e; }
.priority-option.selected.priority-low { border-color: #6b7280; background: #f9fafb; color: #4b5563; }
.priority-option:hover { border-color: #a5b4fc; }

.field-hint { margin: 4px 0 0; color: #9ca3af; font-size: 12px; }

.dialog-note { margin: 12px 0 0; padding: 10px 12px; border-radius: 6px; font-size: 12px; line-height: 1.5; }
.publish-note { background: #eff6ff; color: #1e40af; border-left: 3px solid #3b82f6; }
.hold-note { background: #fffbeb; color: #92400e; border-left: 3px solid #f59e0b; }
.close-note { background: #fef2f2; color: #991b1b; border-left: 3px solid #ef4444; }
.reactivate-note { background: #f0fdf4; color: #166534; border-left: 3px solid #10b981; }

.action-menu-backdrop { position: fixed; inset: 0; z-index: 150; }
.action-menu { position: absolute; background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; box-shadow: 0 10px 30px rgba(0,0,0,0.15); min-width: 180px; overflow: hidden; }
.menu-item { display: flex; align-items: center; gap: 8px; width: 100%; padding: 10px 14px; border: none; background: #fff; text-align: left; font-size: 13px; font-weight: 500; color: #374151; cursor: pointer; }
.menu-item:hover { background: #f9fafb; }
.menu-item.menu-danger { color: #ef4444; }
.menu-item.menu-danger:hover { background: #fef2f2; }
.menu-icon { font-size: 14px; width: 20px; }

.empty-state { background: #f9fafb; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 32px 20px; text-align: center; color: #9ca3af; font-size: 14px; }
.empty-state.large { padding: 60px 20px; }
.empty-state h3 { margin: 12px 0 6px; font-size: 16px; color: #374151; }
.empty-state p { margin: 0; font-size: 14px; }
.empty-icon { font-size: 36px; margin-bottom: 8px; }

.filters-row { display: flex; gap: 12px; margin-bottom: 12px; }
.search-input { flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; min-width: 0; }
.search-input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
.filter-select { padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; background: #fff; min-width: 160px; }

.table-wrapper { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow-x: auto; }
.table-wrapper.compact { margin-bottom: 8px; }
.wf-table { width: 100%; border-collapse: collapse; min-width: 700px; }
.wf-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.wf-table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: #f9fafb; }
.job-title-cell { font-weight: 600; color: #111827; }
.req-title-cell { font-weight: 600; color: #111827; }
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

.detail-header-info { display: flex; justify-content: space-between; align-items: center; padding-bottom: 16px; border-bottom: 1px solid #f3f4f6; }
.detail-id { font-family: monospace; font-size: 12px; color: #6b7280; }
.detail-facts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.fact-label { font-size: 11px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
.fact-value { font-size: 14px; color: #111827; font-weight: 500; }
.section-title { font-size: 12px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px; }
.section-body { color: #374151; font-size: 14px; line-height: 1.6; }
.highlight-section { background: #eff6ff; border-left: 3px solid #3b82f6; padding: 12px 16px; border-radius: 6px; }
.highlight-section .section-title { color: #1e40af; }

.timeline { position: relative; padding-left: 24px; }
.timeline::before { content: ''; position: absolute; left: 8px; top: 6px; bottom: 6px; width: 2px; background: #e5e7eb; }
.timeline-item { position: relative; padding-bottom: 16px; }
.timeline-item:last-child { padding-bottom: 0; }
.timeline-dot { position: absolute; left: -20px; top: 4px; width: 12px; height: 12px; border-radius: 50%; background: #4f46e5; border: 2px solid #fff; box-shadow: 0 0 0 2px #4f46e5; }
.timeline-content { padding-left: 4px; }
.timeline-event { font-weight: 600; font-size: 13px; color: #111827; }
.timeline-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
.timeline-comment { margin-top: 4px; font-size: 12px; color: #78350f; background: #fef3c7; padding: 6px 10px; border-radius: 4px; font-style: italic; }

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
	.req-card-actions { flex-direction: column; }
	.priority-picker { flex-direction: column; }
	.sub-nav { width: 100%; overflow-x: auto; }
	.detail-facts-grid { grid-template-columns: 1fr; }
}
</style>