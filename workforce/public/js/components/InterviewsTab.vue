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

		<!-- Pending Feedback Banner (for interviewers) -->
		<div v-if="pendingFeedback.length" class="pending-banner">
			<div class="pending-header">
				<span class="pending-icon">⚡</span>
				<h3>Pending Feedback ({{ pendingFeedback.length }})</h3>
				<span class="pending-hint">These interviews are completed but awaiting your feedback</span>
			</div>
			<div class="pending-cards">
				<div v-for="iv in pendingFeedback" :key="iv.name" class="pending-card" @click="openDetail(iv)">
					<div class="pending-card-left">
						<div class="pending-name">{{ iv.applicant_name || iv.applicant }}</div>
						<div class="pending-meta">R{{ iv.round_number }} · {{ iv.round_name || 'Interview' }} · {{ formatDate(iv.scheduled_date) }}</div>
					</div>
					<button class="btn-feedback" @click.stop="openDetail(iv)">Give Feedback</button>
				</div>
			</div>
		</div>

		<!-- KPIs -->
		<div class="kpi-row">
			<KpiCard label="Total" :value="interviews.length" />
			<KpiCard label="Scheduled" :value="countByStatus('Scheduled')" />
			<KpiCard label="Completed" :value="countByStatus('Completed')" />
			<KpiCard label="Cancelled" :value="countByStatus('Cancelled')" />
		</div>

		<!-- Filters -->
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

		<!-- Calendar View -->
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

		<!-- List View -->
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
						<th>Feedback</th>
					</tr>
				</thead>
				<tbody>
					<tr v-if="loading"><td colspan="9" class="center-text">Loading...</td></tr>
					<tr v-else-if="filteredInterviews.length === 0"><td colspan="9" class="center-text">No interviews found</td></tr>
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
						<td @click.stop>
							<span v-if="iv.status === 'Completed' && iv.rating" class="feedback-done">✓ Done</span>
							<button v-else-if="iv.status === 'Scheduled' || iv.status === 'In Progress'" class="btn-feedback-sm" @click="openDetail(iv)">Give Feedback</button>
							<span v-else class="text-muted">—</span>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Detail Panel -->
		<DetailPanel :visible="showPanel" :title="selected ? (selected.applicant_name || selected.applicant) : ''" @close="closePanel">
			<div v-if="selected" class="detail-content">
				<!-- Interview Info -->
				<div class="detail-row"><span class="detail-label">Status</span><Badge :label="selected.status" /></div>
				<div class="detail-row"><span class="detail-label">Candidate</span><span>{{ selected.applicant_name || selected.applicant }}</span></div>
				<div class="detail-row"><span class="detail-label">Job Opening</span><span>{{ selected.job_title || selected.job_opening || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Round</span><span>Round {{ selected.round_number }}: {{ selected.round_name || 'Interview' }}</span></div>
				<div class="detail-row"><span class="detail-label">Interviewer</span><span>{{ selected.interviewer || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Date</span><span>{{ formatDate(selected.scheduled_date) }}</span></div>
				<div class="detail-row"><span class="detail-label">Time</span><span>{{ selected.scheduled_time || '—' }}</span></div>
				<div class="detail-row"><span class="detail-label">Duration</span><span>{{ selected.duration_minutes ? selected.duration_minutes + ' min' : '—' }}</span></div>
				<div v-if="selected.google_meet_link" class="detail-row">
					<span class="detail-label">Meeting Link</span>
					<a :href="selected.google_meet_link" target="_blank" class="meet-link">Join Google Meet</a>
				</div>

				<!-- Previous Round Feedback (show for context) -->
				<div v-if="previousRounds.length" class="detail-section">
					<span class="detail-label">Previous Rounds</span>
					<div v-for="pr in previousRounds" :key="pr.name" class="prev-round-card">
						<div class="prev-round-header">
							<span>R{{ pr.round_number }}: {{ pr.round_name || 'Interview' }}</span>
							<span v-if="pr.rating" class="rating-stars-sm">{{ '★'.repeat(pr.rating) }}{{ '☆'.repeat(5 - pr.rating) }}</span>
						</div>
						<div v-if="pr.recommendation" class="prev-round-rec"><Badge :label="pr.recommendation" /></div>
						<div v-if="pr.feedback" class="prev-round-feedback">{{ truncate(pr.feedback, 150) }}</div>
					</div>
				</div>

				<!-- Completed feedback (read-only) -->
				<div v-if="selected.status === 'Completed'" class="detail-section completed-section">
					<h4>Feedback Submitted</h4>
					<div class="detail-row"><span class="detail-label">Rating</span><span class="rating-stars">{{ '★'.repeat(selected.rating || 0) }}{{ '☆'.repeat(5 - (selected.rating || 0)) }}</span></div>
					<div class="detail-row"><span class="detail-label">Recommendation</span><Badge v-if="selected.recommendation && selected.recommendation !== 'Pending'" :label="selected.recommendation" /><span v-else>—</span></div>
					<div v-if="selected.feedback" class="detail-section"><span class="detail-label">Feedback Notes</span><div class="detail-desc" v-html="selected.feedback"></div></div>
				</div>

				<!-- Feedback Form (when Scheduled or In Progress) -->
				<div v-if="selected.status === 'Scheduled' || selected.status === 'In Progress'" class="feedback-form">
					<h4>Submit Interview Feedback</h4>

					<div class="form-group">
						<label>Overall Rating *</label>
						<div class="star-picker">
							<span v-for="n in 5" :key="n" class="star" :class="{ filled: feedbackForm.rating >= n }" @click="feedbackForm.rating = n" @mouseenter="hoverRating = n" @mouseleave="hoverRating = 0">★</span>
							<span class="rating-label">{{ ratingLabel }}</span>
						</div>
					</div>

					<div class="form-group">
						<label>Recommendation *</label>
						<div class="rec-options">
							<label v-for="rec in recommendations" :key="rec.value" class="rec-option" :class="{ selected: feedbackForm.recommendation === rec.value, [rec.color]: true }">
								<input type="radio" :value="rec.value" v-model="feedbackForm.recommendation" />
								<span class="rec-icon">{{ rec.icon }}</span>
								<span>{{ rec.label }}</span>
							</label>
						</div>
					</div>

					<div class="form-group">
						<label>Technical Skills (if applicable)</label>
						<div class="skill-rating-row">
							<span class="skill-label">Problem Solving</span>
							<div class="mini-stars">
								<span v-for="n in 5" :key="n" class="mini-star" :class="{ filled: feedbackForm.problemSolving >= n }" @click="feedbackForm.problemSolving = n">★</span>
							</div>
						</div>
						<div class="skill-rating-row">
							<span class="skill-label">Communication</span>
							<div class="mini-stars">
								<span v-for="n in 5" :key="n" class="mini-star" :class="{ filled: feedbackForm.communication >= n }" @click="feedbackForm.communication = n">★</span>
							</div>
						</div>
						<div class="skill-rating-row">
							<span class="skill-label">Domain Knowledge</span>
							<div class="mini-stars">
								<span v-for="n in 5" :key="n" class="mini-star" :class="{ filled: feedbackForm.domainKnowledge >= n }" @click="feedbackForm.domainKnowledge = n">★</span>
							</div>
						</div>
					</div>

					<div class="form-group">
						<label>Strengths</label>
						<textarea v-model="feedbackForm.strengths" class="form-input form-textarea" rows="2" placeholder="What stood out positively..."></textarea>
					</div>

					<div class="form-group">
						<label>Areas for Improvement</label>
						<textarea v-model="feedbackForm.improvements" class="form-input form-textarea" rows="2" placeholder="What could be better..."></textarea>
					</div>

					<div class="form-group">
						<label>Detailed Feedback</label>
						<textarea v-model="feedbackForm.feedback" class="form-input form-textarea" rows="4" placeholder="Detailed notes from the interview..."></textarea>
					</div>

					<div class="feedback-actions">
						<button class="btn-primary" @click="submitFeedback" :disabled="saving || !feedbackForm.rating || !feedbackForm.recommendation">
							{{ saving ? 'Submitting...' : 'Submit Feedback' }}
						</button>
						<span class="feedback-hint">Submitting will mark this interview as Completed</span>
					</div>
				</div>

				<!-- Reschedule (HR only, when Scheduled) -->
				<div v-if="selected.status === 'Scheduled' && isHR" class="detail-section reschedule-section">
					<h4>Reschedule</h4>
					<div class="form-row">
						<div class="form-group"><label>New Date</label><input v-model="rescheduleForm.date" type="date" class="form-input" /></div>
						<div class="form-group"><label>New Time</label><input v-model="rescheduleForm.time" type="time" class="form-input" /></div>
					</div>
					<button class="btn-secondary" @click="reschedule" :disabled="saving || !rescheduleForm.date">{{ saving ? 'Saving...' : 'Reschedule' }}</button>
				</div>

				<!-- Cancel (HR only, when Scheduled) -->
				<div v-if="selected.status === 'Scheduled' && isHR" class="detail-section">
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
			previousRounds: [],
			loading: false,
			saving: false,
			isHR: false,
			view: 'calendar',
			searchQuery: '',
			statusFilter: '',
			showPanel: false,
			selected: null,
			weekOffset: 0,
			hoverRating: 0,
			feedbackForm: {
				rating: 0,
				recommendation: '',
				feedback: '',
				strengths: '',
				improvements: '',
				problemSolving: 0,
				communication: 0,
				domainKnowledge: 0
			},
			rescheduleForm: { date: '', time: '' },
			toast: { show: false, msg: '', type: 'success' },
			recommendations: [
				{ value: 'Strongly Recommend', label: 'Strong Yes', icon: '👍👍', color: 'rec-green' },
				{ value: 'Recommend', label: 'Yes', icon: '👍', color: 'rec-green' },
				{ value: 'Neutral', label: 'Maybe', icon: '🤔', color: 'rec-orange' },
				{ value: 'Do Not Recommend', label: 'No', icon: '👎', color: 'rec-red' }
			]
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

		pendingFeedback() {
			return this.interviews.filter(iv =>
				(iv.status === 'Scheduled' || iv.status === 'In Progress') &&
				!iv.rating &&
				iv.interviewer === frappe.session.user
			);
		},

		ratingLabel() {
			const labels = { 1: 'Poor', 2: 'Below Average', 3: 'Average', 4: 'Good', 5: 'Excellent' };
			const r = this.hoverRating || this.feedbackForm.rating;
			return labels[r] || '';
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

		truncate(str, len) {
			if (!str) return '';
			return str.length > len ? str.slice(0, len) + '...' : str;
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

		async loadInterviews() {
			this.loading = true;
			try {
				const res = await this.api('wf_get_interview_calendar_data');
				const allInterviews = res.interviews || res || [];

				// Check if user is HR Manager
				try {
					const roles = await this.api('frappe.client.get_list', {
						doctype: 'Has Role',
						filters: { parent: frappe.session.user, role: 'WF HR Manager' },
						fields: ['name'],
						limit_page_length: 1
					});
					this.isHR = roles && roles.length > 0;
				} catch (e) { this.isHR = false; }

				if (this.isHR) {
					this.interviews = allInterviews;
				} else {
					this.interviews = allInterviews.filter(
						iv => iv.interviewer === frappe.session.user
					);
				}
			} catch (e) {
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

		async openDetail(iv) {
			this.selected = iv;
			this.feedbackForm = {
				rating: iv.rating || 0,
				recommendation: iv.recommendation || '',
				feedback: iv.feedback || '',
				strengths: '',
				improvements: '',
				problemSolving: 0,
				communication: 0,
				domainKnowledge: 0
			};
			this.rescheduleForm = { date: '', time: '' };
			this.showPanel = true;

			// Load previous rounds for context
			if (iv.applicant) {
				try {
					const allRounds = await this.api('frappe.client.get_list', {
						doctype: 'WF Interview',
						fields: ['name', 'round_number', 'round_name', 'rating', 'recommendation', 'feedback', 'status'],
						filters: {
							applicant: iv.applicant,
							name: ['!=', iv.name],
							status: 'Completed'
						},
						order_by: 'round_number asc'
					});
					this.previousRounds = allRounds || [];
				} catch (e) {
					this.previousRounds = [];
				}
			}
		},

		closePanel() {
			this.showPanel = false;
			this.selected = null;
			this.previousRounds = [];
		},

		async submitFeedback() {
			if (!this.feedbackForm.rating || !this.feedbackForm.recommendation) {
				this.showToast('Rating and recommendation are required', 'error');
				return;
			}

			let fullFeedback = '';
			if (this.feedbackForm.strengths) {
				fullFeedback += 'Strengths: ' + this.feedbackForm.strengths + '\n\n';
			}
			if (this.feedbackForm.improvements) {
				fullFeedback += 'Areas for Improvement: ' + this.feedbackForm.improvements + '\n\n';
			}
			if (this.feedbackForm.problemSolving || this.feedbackForm.communication || this.feedbackForm.domainKnowledge) {
				fullFeedback += 'Skill Ratings — ';
				if (this.feedbackForm.problemSolving) fullFeedback += 'Problem Solving: ' + this.feedbackForm.problemSolving + '/5, ';
				if (this.feedbackForm.communication) fullFeedback += 'Communication: ' + this.feedbackForm.communication + '/5, ';
				if (this.feedbackForm.domainKnowledge) fullFeedback += 'Domain Knowledge: ' + this.feedbackForm.domainKnowledge + '/5';
				fullFeedback += '\n\n';
			}
			if (this.feedbackForm.feedback) {
				fullFeedback += this.feedbackForm.feedback;
			}

			this.saving = true;
			try {
				await this.api('wf_submit_feedback', {
					data: JSON.stringify({
						interview_name: this.selected.name,
						rating: this.feedbackForm.rating,
						recommendation: this.feedbackForm.recommendation,
						feedback: fullFeedback.trim()
					})
				});
				this.selected.rating = this.feedbackForm.rating;
				this.selected.recommendation = this.feedbackForm.recommendation;
				this.selected.feedback = fullFeedback.trim();
				this.selected.status = 'Completed';
				this.showToast('Feedback submitted successfully!');
				await this.loadInterviews();
			} catch (e) {
				this.showToast('Failed to submit feedback', 'error');
			}
			this.saving = false;
		},

		async reschedule() {
			if (!this.rescheduleForm.date) { this.showToast('New date is required', 'error'); return; }
			this.saving = true;
			try {
				await this.api('wf_reschedule_interview', {
					interview_name: this.selected.name,
					scheduled_date: this.rescheduleForm.date,
					scheduled_time: this.rescheduleForm.time || this.selected.scheduled_time
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
				await this.api('wf_cancel_interview', {
					interview_name: this.selected.name
				});
				this.selected.status = 'Cancelled';
				this.showToast('Interview cancelled');
				await this.loadInterviews();
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

/* Pending Feedback Banner */
.pending-banner {
	background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
	border: 1px solid #f59e0b;
	border-radius: 10px;
	padding: 16px 20px;
	margin-bottom: 20px;
}
.pending-header { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; flex-wrap: wrap; }
.pending-icon { font-size: 20px; }
.pending-header h3 { margin: 0; font-size: 16px; font-weight: 700; color: #92400e; }
.pending-hint { font-size: 13px; color: #b45309; }
.pending-cards { display: flex; flex-direction: column; gap: 8px; }
.pending-card {
	display: flex; justify-content: space-between; align-items: center;
	background: #fff; border-radius: 8px; padding: 12px 16px; cursor: pointer;
	border: 1px solid #fcd34d; transition: box-shadow 0.15s;
}
.pending-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
.pending-name { font-weight: 600; font-size: 14px; color: #111827; }
.pending-meta { font-size: 12px; color: #6b7280; margin-top: 2px; }
.btn-feedback {
	background: #f59e0b; color: #fff; border: none;
	padding: 8px 16px; border-radius: 6px; font-weight: 600;
	font-size: 13px; cursor: pointer;
}
.btn-feedback:hover { background: #d97706; }
.btn-feedback-sm {
	background: #4f46e5; color: #fff; border: none;
	padding: 4px 10px; border-radius: 5px; font-size: 12px;
	font-weight: 600; cursor: pointer;
}
.feedback-done { color: #16a34a; font-weight: 600; font-size: 13px; }

.kpi-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin-bottom: 20px; }
.filters-row { display: flex; gap: 12px; margin-bottom: 20px; }
.search-input { flex: 1; padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; min-width: 0; }
.search-input:focus { border-color: #4f46e5; }
.filter-select { padding: 10px 14px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; background: #fff; min-width: 130px; }

/* Calendar */
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

/* Table */
.table-wrapper { background: #fff; border-radius: 10px; border: 1px solid #e5e7eb; overflow-x: auto; }
.wf-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.wf-table th { text-align: left; padding: 12px 16px; font-size: 12px; font-weight: 600; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; background: #f9fafb; border-bottom: 1px solid #e5e7eb; white-space: nowrap; }
.wf-table td { padding: 14px 16px; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
.clickable-row { cursor: pointer; }
.clickable-row:hover { background: #f9fafb; }
.name-cell { font-weight: 600; color: #111827; }
.center-text { text-align: center; color: #9ca3af; padding: 40px 16px !important; }
.text-muted { color: #9ca3af; }
.rating-stars { color: #f59e0b; font-size: 14px; letter-spacing: 1px; }
.rating-stars-sm { color: #f59e0b; font-size: 12px; }

/* Detail Panel */
.detail-content { display: flex; flex-direction: column; gap: 16px; }
.detail-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f3f4f6; }
.detail-label { font-size: 13px; font-weight: 600; color: #6b7280; }
.detail-section { padding: 8px 0; }
.detail-desc { margin-top: 6px; font-size: 14px; color: #374151; line-height: 1.6; }
.meet-link { color: #4f46e5; font-weight: 600; text-decoration: none; }
.meet-link:hover { text-decoration: underline; }

/* Previous Rounds */
.prev-round-card { padding: 10px 12px; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 8px; background: #f9fafb; }
.prev-round-header { display: flex; justify-content: space-between; align-items: center; font-size: 13px; font-weight: 600; color: #374151; }
.prev-round-rec { margin-top: 4px; }
.prev-round-feedback { font-size: 13px; color: #6b7280; margin-top: 4px; line-height: 1.4; }

/* Completed Section */
.completed-section { background: #f0fdf4; border: 1px solid #86efac; border-radius: 8px; padding: 16px; }
.completed-section h4 { margin: 0 0 12px; font-size: 15px; color: #166534; }

/* Feedback Form */
.feedback-form {
	margin-top: 8px; padding: 20px;
	border: 2px solid #4f46e5; border-radius: 10px; background: #fafaff;
}
.feedback-form h4 { margin: 0 0 16px; font-size: 16px; color: #4f46e5; }

/* Star Picker */
.star-picker { display: flex; align-items: center; gap: 4px; }
.star { font-size: 32px; cursor: pointer; color: #d1d5db; transition: color 0.15s; }
.star.filled { color: #f59e0b; }
.star:hover { color: #f59e0b; transform: scale(1.1); }
.rating-label { margin-left: 12px; font-size: 14px; font-weight: 600; color: #6b7280; }

/* Recommendation Options */
.rec-options { display: flex; gap: 8px; flex-wrap: wrap; }
.rec-option {
	display: flex; align-items: center; gap: 6px;
	padding: 10px 14px; border: 2px solid #e5e7eb; border-radius: 8px;
	cursor: pointer; font-size: 13px; font-weight: 500; transition: all 0.15s;
}
.rec-option input { display: none; }
.rec-icon { font-size: 16px; }
.rec-option.selected.rec-green { border-color: #22c55e; background: #f0fdf4; color: #166534; }
.rec-option.selected.rec-orange { border-color: #f59e0b; background: #fffbeb; color: #92400e; }
.rec-option.selected.rec-red { border-color: #ef4444; background: #fef2f2; color: #991b1b; }
.rec-option:hover { border-color: #a5b4fc; }

/* Skill Ratings */
.skill-rating-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; }
.skill-label { font-size: 13px; color: #374151; }
.mini-stars { display: flex; gap: 2px; }
.mini-star { font-size: 18px; cursor: pointer; color: #d1d5db; }
.mini-star.filled { color: #f59e0b; }
.mini-star:hover { color: #f59e0b; }

/* Feedback Actions */
.feedback-actions { margin-top: 16px; display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.feedback-hint { font-size: 12px; color: #9ca3af; }

.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
.form-group label { font-size: 13px; font-weight: 600; color: #374151; }
.form-input { padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 8px; font-size: 14px; outline: none; width: 100%; box-sizing: border-box; }
.form-input:focus { border-color: #4f46e5; }
.form-textarea { resize: vertical; font-family: inherit; }

/* Reschedule */
.reschedule-section { padding: 16px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
.reschedule-section h4 { margin: 0 0 12px; font-size: 15px; color: #374151; }
.form-row { display: flex; gap: 12px; margin-bottom: 12px; }
.form-row .form-group { flex: 1; margin-bottom: 0; }

/* Buttons */
.btn-primary { background: #4f46e5; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary { background: #fff; color: #374151; border: 1px solid #d1d5db; padding: 10px 20px; border-radius: 8px; font-weight: 500; cursor: pointer; font-size: 14px; }
.btn-secondary:hover { background: #f9fafb; }
.btn-secondary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-danger { background: #ef4444; color: #fff; border: none; padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 14px; }

/* Responsive */
@media (max-width: 1024px) {
	.kpi-row { grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 12px; }
	.cal-event { font-size: 11px; padding: 4px 6px; }
	.cal-day { min-height: 120px; }
	.wf-table th, .wf-table td { padding: 10px 12px; }
	.rec-options { flex-direction: column; }
}
@media (max-width: 768px) {
	.filters-row { flex-direction: column; gap: 8px; }
	.filter-select { width: 100%; min-width: auto; }
	.cal-grid { grid-template-columns: repeat(4, 1fr); }
	.cal-day { min-height: 100px; }
	.form-row { flex-direction: column; gap: 8px; }
	.pending-card { flex-direction: column; align-items: flex-start; gap: 8px; }
}
</style>