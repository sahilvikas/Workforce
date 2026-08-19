<template>
	<div class="interviews-tab">
		<Toast :visible="toast.show" :message="toast.msg" :type="toast.type" @hide="toast.show = false" />

		<div class="tab-header">
			<h2>Interviews</h2>
			<div class="view-toggle">
				<button :class="{ active: view === 'calendar' }" @click="view = 'calendar'">Calendar</button>
				<button :class="{ active: view === 'list' }" @click="view = 'list'">List</button>
			</div>
		</div>

		<div class="kpi-row">
			<KpiCard label="Total" :value="interviews.length" />
			<KpiCard label="Scheduled" :value="countByStatus('Scheduled')" />
			<KpiCard label="Completed" :value="countByStatus('Completed')" />
			<KpiCard label="Cancelled" :value="countByStatus('Cancelled')" />
		</div>

		<div class="filters-row">
			<input v-model="searchQuery" type="text" placeholder="Search by candidate, interviewer..." class="search-input" />
			<select v-model="statusFilter" class="filter-select">
				<option value="">All Statuses</option>
				<option value="Scheduled">Scheduled</option>
				<option value="In Progress">In Progress</option>
				<option value="Completed">Completed</option>
				<option value="Cancelled">Cancelled</option>
			</select>
		</div>

		<!-- Calendar -->
		<div v-if="view === 'calendar'" class="calendar-section">
			<div class="cal-nav">
				<button class="cal-nav-btn" @click="prevWeek">&larr;</button>
				<h3>{{ weekLabel }}</h3>
				<button class="cal-nav-btn" @click="nextWeek">&rarr;</button>
				<button class="cal-today-btn" @click="goToday">Today</button>
			</div>
			<div class="cal-grid">
				<div v-for="day in weekDays" :key="day.date" class="cal-day" :class="{ today: day.isToday }">
					<div class="cal-day-header">
						<span class="cal-day-name">{{ day.dayName }}</span>
						<span class="cal-day-date">{{ day.dateLabel }}</span>
					</div>
					<div class="cal-day-events">
						<div v-for="iv in interviewsOnDate(day.date)" :key="iv.name" class="cal-event" :class="'event-' + iv.status.toLowerCase().replace(/ /g, '-')" @click="openDetail(iv)">
							<div class="event-time">{{ iv.scheduled_time || 'TBD' }}</div>
							<div class="event-name">{{ iv.applicant_name || iv.applicant }}</div>
							<div class="event-round">R{{ iv.round_number }} · {{ iv.round_name || 'Interview' }}</div>
						</div>
						<div v-if="interviewsOnDate(day.date).length === 0" class="cal-empty">—</div>
					</div>
				</div>
			</div>
		</div>

		<!-- List -->
		<div v-else class="table-wrapper">
			<table class="wf-table">
				<thead>
					<tr>
						<th>Candidate</th>
						<th>Job Opening</th>
						<th>Round</th>
						<th>Interviewer</th>
						<th>Date</th>
						<th>Time</th>
						<th>Rating</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading"><td colspan="8" class="center-text">Loading...</td></tr>
					<tr v-else-if="filteredInterviews.length === 0"><td colspan="8" class="center-text">No interviews found</td></tr>
					<tr v-for="iv in filteredInterviews" :key="iv.name" class="clickable-row" @click="openDetail(iv)">
						<td class="name-cell">{{ iv.applicant_name || iv.applicant }}</td>
						<td>{{ iv.job_title || iv.job_opening || '—' }}</td>
						<td>R{{ iv.round_number }} · {{ iv.round_name || 'Interview' }}</td>
						<td>{{ iv.interviewer || '—' }}</td>
						<td>{{ formatDate(iv.scheduled_date) }}</td>
						<td>{{ iv.scheduled_time || '—' }}</td>
						<td>
							<span v-if="iv.rating" class="rating-stars">{{ '★'.repeat(iv.rating) }}{{ '☆'.repeat(5 - iv.rating) }}</span>
							<span v-else class="text-muted">—</span>
						</td>
						<td><Badge :label="iv.status" /></td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Detail Panel -->
		<DetailPanel :visible="showPanel" :title="selected ? (selected.applicant_name || selected.applicant) : ''" @close="closePanel">
			<div v-if="selected" class="detail-content">
				<div class="detail-row"><span class="detail-label">Status</span><Badge :label="selected.status" /></div>
				<div class="detail-row"><span class="detail-label">Round</span><span>Round {{ selected.round_number }}: {{ selected.round_name || 'Interview' }}</span></div>
				<div class="detail-row"><span class="detail-label">Interviewer</span><span>{{ selected.interviewer || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Date</span><span>{{ formatDate(selected.scheduled_date) }}</span></div>
				<div class="detail-row"><span class="detail-label">Time</span><span>{{ selected.scheduled_time || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Duration</span><span>{{ selected.duration_minutes ? selected.duration_minutes + ' min' : '—' }}</span></div>
				<div v-if="selected.google_meet_link" class="detail-row">
					<span class="detail-label">Meeting Link</span>
					<a :href="selected.google_meet_link" target="_blank" class="meet-link">Join Google Meet</a>
				</div>

				<!-- Completed feedback (read-only) -->
				<div v-if="selected.status === 'Completed'" class="detail-section">
					<div class="detail-row"><span class="detail-label">Rating</span><span class="rating-stars">{{ '★'.repeat(selected.rating || 0) }}{{ '☆'.repeat(5 - (selected.rating || 0)) }}</span></div>
					<div class="detail-row"><span class="detail-label">Recommendation</span><Badge v-if="selected.recommendation && selected.recommendation !== 'Pending'" :label="selected.recommendation" /><span v-else>—</span></div>
					<div v-if="selected.feedback" class="detail-section"><span class="detail-label">Feedback</span><div class="detail-desc" v-html="selected.feedback"></div></div>
				</div>

				<!-- Feedback Form -->
				<div v-if="selected.status === 'Scheduled' || selected.status === 'In Progress'" class="feedback-form">
					<h4>Submit Feedback</h4>
					<div class="form-group">
						<label>Rating *</label>
						<div class="star-picker">
							<span v-for="n in 5" :key="n" class="star" :class="{ filled: feedbackForm.rating >= n }" @click="feedbackForm.rating = n">★</span>
						</div>
					</div>
					<div class="form-group">
						<label>Recommendation *</label>
						<select v-model="feedbackForm.recommendation" class="form-input">
							<option value="">Select...</option>
							<option value="Strongly Recommend">Strongly Recommend</option>
							<option value="Recommend">Recommend</option>
							<option value="Neutral">Neutral</option>
							<option value="Do Not Recommend">Do Not Recommend</option>
						</select>
					</div>
					<div class="form-group">
						<label>Feedback</label>
						<textarea v-model="feedbackForm.feedback" class="form-input form-textarea" rows="4" placeholder="Detailed feedback..."></textarea>
					</div>
					<button class="btn-primary" @click="submitFeedback" :disabled="saving || !feedbackForm.rating || !feedbackForm.recommendation">
						{{ saving ? 'Saving...' : 'Submit & Complete' }}
					</button>
				</div>

				<!-- Reschedule -->
				<div v-if="selected.status === 'Scheduled'" class="detail-section reschedule-section">
					<h4>Reschedule</h4>
					<div class="form-row">
						<div class="form-group"><label>New Date</label><input v-model="rescheduleForm.date" type="date" class="form-input" /></div>
						<div class="form-group"><label>New Time</label><input v-model="rescheduleForm.time" type="time" class="form-input" /></div>
					</div>
					<button class="btn-secondary" @click="reschedule" :disabled="saving || !rescheduleForm.date">{{ saving ? 'Saving...' : 'Reschedule' }}</button>
				</div>

				<div v-if="selected.status === 'Scheduled'" class="detail-section">
					<button class="btn-danger" @click="cancelInterview">Cancel Interview</button>
				</div>
			</div>
		</DetailPanel>
	</div>
</template>

<script>
import Badge from './shared/Badge.vue';
import KpiCard from './shared/KpiCard.vue';
import DetailPanel from './shared/DetailPanel.vue';
import Toast from './shared/Toast.vue';

export default {
	name: 'InterviewsTab',
	components: { Badge, KpiCard, DetailPanel, Toast },

	data() {
		return {
			interviews: [],
			loading: false,
			saving: false,
			view: 'calendar',
			searchQuery: '',
			statusFilter: '',
			showPanel: false,
			selected: null,
			weekOffset: 0,
			feedbackForm: { rating: 0, recommendation: '', feedback: '' },
			rescheduleForm: { date: '', time: '' },
			toast: { show: false, msg: '', type: 'success' }
		};
	},

	computed: {
		filteredInterviews() {
			return this.interviews.filter(iv => {
				const q = this.searchQuery.toLowerCase();
				const matchSearch = !q ||
					(iv.applicant_name || iv.applicant || '').toLowerCase().includes(q) ||
					(iv.interviewer || '').toLowerCase().includes(q) ||
					(iv.round_name || '').toLowerCase().includes(q);
				const matchStatus = !this.statusFilter || iv.status === this.statusFilter;
				return matchSearch && matchStatus;
			});
		},
		weekStart() {
			const d = new Date();
			d.setDate(d.getDate() - d.getDay() + 1 + this.weekOffset * 7);
			d.setHours(0, 0, 0, 0);
			return d;
		},
		weekDays() {
			const days = [];
			const today = new Date().toISOString().split('T')[0];
			for (let i = 0; i < 7; i++) {
				const d = new Date(this.weekStart);
				d.setDate(d.getDate() + i);
				const dateStr = d.toISOString().split('T')[0];
				days.push({
					date: dateStr,
					dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
					dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
					isToday: dateStr === today
				});
			}
			return days;
		},
		weekLabel() { return this.weekDays[0].dateLabel + ' — ' + this.weekDays[6].dateLabel; }
	},

	mounted() { this.loadInterviews(); },

	methods: {
		countByStatus(status) { return this.interviews.filter(iv => iv.status === status).length; },
		interviewsOnDate(date) { return this.filteredInterviews.filter(iv => iv.scheduled_date === date); },
		prevWeek() { this.weekOffset--; },
		nextWeek() { this.weekOffset++; },
		goToday() { this.weekOffset = 0; },

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

		async loadInterviews() {
			this.loading = true;
			try {
				// Use custom API — returns enriched data with applicant_name, job_title
				const res = await this.api('wf_get_interview_calendar_data');
				this.interviews = res.interviews || res || [];
			} catch (e) {
				// Fallback to generic API
				try {
					this.interviews = await this.api('frappe.client.get_list', {
						doctype: 'WF Interview',
						fields: ['name', 'applicant', 'job_opening', 'round_number', 'round_name', 'interviewer', 'scheduled_date', 'scheduled_time', 'duration_minutes', 'status', 'rating', 'recommendation', 'feedback', 'google_meet_link'],
						limit_page_length: 0,
						order_by: 'scheduled_date desc'
					});
				} catch (e2) {
					this.showToast('Failed to load interviews', 'error');
				}
			}
			this.loading = false;
		},

		openDetail(iv) {
			this.selected = iv;
			this.feedbackForm = { rating: iv.rating || 0, recommendation: iv.recommendation || '', feedback: iv.feedback || '' };
			this.rescheduleForm = { date: '', time: '' };
			this.showPanel = true;
		},

		closePanel() { this.showPanel = false; this.selected = null; },

		async submitFeedback() {
			if (!this.feedbackForm.rating || !this.feedbackForm.recommendation) {
				this.showToast('Rating and recommendation are required', 'error');
				return;
			}
			this.saving = true;
			try {
				await this.api('frappe.client.save', {
					doc: {
						doctype: 'WF Interview', name: this.selected.name,
						rating: this.feedbackForm.rating,
						recommendation: this.feedbackForm.recommendation,
						feedback: this.feedbackForm.feedback,
						status: 'Completed'
					}
				});
				this.selected.rating = this.feedbackForm.rating;
				this.selected.recommendation = this.feedbackForm.recommendation;
				this.selected.feedback = this.feedbackForm.feedback;
				this.selected.status = 'Completed';
				this.showToast('Feedback submitted!');
			} catch (e) {
				this.showToast('Failed to submit feedback', 'error');
			}
			this.saving = false;
		},

		async reschedule() {
			if (!this.rescheduleForm.date) { this.showToast('New date is required', 'error'); return; }
			this.saving = true;
			try {
				await this.api('frappe.client.save', {
					doc: {
						doctype: 'WF Interview', name: this.selected.name,
						scheduled_date: this.rescheduleForm.date,
						scheduled_time: this.rescheduleForm.time || this.selected.scheduled_time
					}
				});
				this.selected.scheduled_date = this.rescheduleForm.date;
				if (this.rescheduleForm.time) this.selected.scheduled_time = this.rescheduleForm.time;
				this.showToast('Interview rescheduled!');
			} catch (e) {
				this.showToast('Failed to reschedule', 'error');
			}
			this.saving = false;
		},

		async cancelInterview() {
			if (!confirm('Cancel this interview?')) return;
			this.saving = true;
			try {
				await this.api('frappe.client.save', {
					doc: { doctype: 'WF Interview', name: this.selected.name, status: 'Cancelled' }
				});
				this.selected.status = 'Cancelled';
				this.showToast('Interview cancelled');
			} catch (e) {
				this.showToast('Failed to cancel', 'error');
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
.calendar-section { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow: hidden; }
.cal-nav { display: flex; align-items: center; gap: 12px; padding: 16px 20px; border-bottom: 1px solid #e5e7eb; }
.cal-nav h3 { margin: 0; font-size: 16px; font-weight: 600; flex: 1; text-align: center; }
.cal-nav-btn { background: #fff; border: 1px solid #d1d5db; border-radius: 6px; padding: 6px 12px; cursor: pointer; font-size: 16px; }
.cal-nav-btn:hover { background: #f9fafb; }
.cal-today-btn { background: #4f46e5; color: #fff; border: none; border-radius: 6px; padding: 6px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }
.cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); }
.cal-day { border-right: 1px solid #f3f4f6; min-height: 140px; }
.cal-day:last-child { border-right: none; }
.cal-day.today { background: #faf5ff; }
.cal-day-header { padding: 10px 8px; text-align: center; border-bottom: 1px solid #f3f4f6; background: #f9fafb; }
.cal-day-name { font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; display: block; }
.cal-day-date { font-size: 14px; font-weight: 700; color: #111827; }
.cal-day-events { padding: 6px; display: flex; flex-direction: column; gap: 4px; }
.cal-event { padding: 6px 8px; border-radius: 6px; cursor: pointer; font-size: 12px; border-left: 3px solid; }
.cal-event:hover { opacity: 0.85; }
.event-scheduled { background: #eff6ff; border-color: #3b82f6; }
.event-in-progress { background: #fff7ed; border-color: #f59e0b; }
.event-completed { background: #f0fdf4; border-color: #22c55e; }
.event-cancelled { background: #f9fafb; border-color: #9ca3af; }
.event-time { font-weight: 700; color: #374151; }
.event-name { font-weight: 600; color: #111827; margin-top: 2px; }
.event-round { color: #6b7280; }
.cal-empty { text-align: center; color: #d1d5db; padding: 10px; font-size: 13px; }
.table-wrapper { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow-x: auto; }
.wf-table { width: 100%; border-collapse: collapse; min-width: 800px; }
.wf-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.wf-table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: #f9fafb; }
.name-cell { font-weight: 600; color: #111827; }
.center-text { text-align: center; color: #9ca3af; padding: 40px 16px !important; }
.text-muted { color: #9ca3af; }
.rating-stars { color: #f59e0b; font-size: 14px; letter-spacing: 1px; }
.detail-content { display: flex; flex-direction: column; gap: 16px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.detail-label { font-size: 13px; font-weight: 600; color: #6b7280; }
.detail-section { padding: 8px 0; }
.detail-desc { margin-top: 6px; font-size: 14px; color: #374151; line-height: 1.6; }
.meet-link { color: #4f46e5; font-weight: 600; text-decoration: none; }
.meet-link:hover { text-decoration: underline; }
.feedback-form { margin-top: 8px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
.feedback-form h4 { margin: 0 0 14px; font-size: 15px; color: #374151; }
.star-picker { display: flex; gap: 4px; }
.star { font-size: 28px; cursor: pointer; color: #d1d5db; transition: color 0.15s; }
.star.filled { color: #f59e0b; }
.star:hover { color: #f59e0b; }
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: #4f46e5; }
.form-textarea { resize: vertical; font-family: inherit; }
.reschedule-section { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
.reschedule-section h4 { margin: 0 0 12px; font-size: 15px; color: #374151; }
.form-row { display: flex; gap: 12px; margin-bottom: 12px; }
.form-row .form-group { flex: 1; margin-bottom: 0; }
.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 14px; }
.btn-secondary:hover { background: #f9fafb; }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-danger { background: #ef4444; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }

@media (max-width: 1024px) {
	.kpi-row { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
	.cal-event { font-size: 11px; padding: 4px 6px; }
	.cal-day { min-height: 120px; }
	.wf-table th, .wf-table td { padding: 10px 12px; }
}
@media (max-width: 768px) {
	.filters-row { flex-direction: column; gap: 8px; }
	.filter-select { width: 100%; min-width: auto; }
	.cal-grid { grid-template-columns: repeat(4, 1fr); }
	.cal-day { min-height: 100px; }
	.form-row { flex-direction: column; gap: 8px; }
}
</style>