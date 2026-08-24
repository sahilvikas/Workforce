<template>
    <div class="candidates-tab">
        <!-- KPIs -->
        <div class="stats-row">
            <KpiCard label="Total" :value="stats.total" />
            <KpiCard label="Shortlisted" :value="stats.shortlisted" />
            <KpiCard label="In Interviews" :value="stats.in_interviews" />
            <KpiCard label="Selected" :value="stats.selected" />
            <KpiCard label="Offer Sent" :value="stats.offer_sent" />
        </div>

        <!-- Toolbar with search + filters + view toggle -->
        <div class="toolbar">
            <div class="toolbar-left">
                <input v-model="searchQuery" placeholder="Search by name, email..." class="search-input" />
                <select v-model="filterJob" class="filter-select">
                    <option value="">All Jobs</option>
                    <option v-for="j in jobs" :key="j.name" :value="j.name">{{ j.job_title }}</option>
                </select>
                <select v-model="filterStatus" class="filter-select">
                    <option value="">All Statuses</option>
                    <option v-for="s in statuses" :key="s" :value="s">{{ s }}</option>
                </select>
            </div>
            <div class="toolbar-right">
                <div class="view-toggle">
                    <button :class="['toggle-btn', view === 'pipeline' ? 'active' : '']" @click="view = 'pipeline'">
                        Pipeline
                    </button>
                    <button :class="['toggle-btn', view === 'table' ? 'active' : '']" @click="view = 'table'">
                        Table
                    </button>
                </div>
            </div>
        </div>

        <!-- Kanban Pipeline View -->
        <div v-if="view === 'pipeline'" class="kanban-board">
            <div v-for="col in pipelineColumns" :key="col.status" class="kanban-column">
                <div class="kanban-header">
                    <span class="kanban-title">{{ col.status }}</span>
                    <span class="kanban-count">{{ col.candidates.length }}</span>
                </div>
                <div class="kanban-cards">
                    <div
                        v-for="c in col.candidates"
                        :key="c.name"
                        class="kanban-card"
                        @click="openDetail(c)"
                    >
                        <div class="card-name">{{ c.applicant_name }}</div>
                        <div class="card-job">{{ c.job_title }}</div>
                        <div class="card-footer">
                            <span v-if="c.ai_score" class="ai-score">Score: {{ c.ai_score }}</span>
                            <span class="card-date">{{ formatDate(c.applied_on) }}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Table View -->
        <div v-else class="table-wrap">
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
                    <tr v-for="c in filteredCandidates" :key="c.name" @click="openDetail(c)">
                        <td class="td-name">{{ c.applicant_name }}</td>
                        <td>{{ c.email }}</td>
                        <td>{{ c.job_title }}</td>
                        <td>{{ c.source }}</td>
                        <td>
                            <span v-if="c.ai_score !== null" :class="'score-badge ' + scoreClass(c.ai_score)">
                                {{ c.ai_score }}
                            </span>
                            <span v-else class="score-none">—</span>
                        </td>
                        <td><Badge :label="c.status" /></td>
                        <td>{{ formatDate(c.applied_on) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- Detail Panel -->
        <Dialog v-if="selected" :visible="true" :title="selected.applicant_name" size="lg" @close="selected = null" @submit="closeDetail">
            <div class="detail-panel">
                <div class="detail-section">
                    <div class="detail-row">
                        <span class="detail-label">Status</span>
                        <Badge :label="selected.status" />
                    </div>
                    <div class="detail-row" v-if="selected.email">
                        <span class="detail-label">Email</span>
                        <span>{{ selected.email }}</span>
                    </div>
                    <div class="detail-row" v-if="selected.phone">
                        <span class="detail-label">Phone</span>
                        <span>{{ selected.phone }}</span>
                    </div>
                    <div class="detail-row" v-if="selected.job_title">
                        <span class="detail-label">Job Opening</span>
                        <span>{{ selected.job_title }}</span>
                    </div>
                    <div class="detail-row" v-if="selected.source">
                        <span class="detail-label">Source</span>
                        <span>{{ selected.source }}</span>
                    </div>
                    <div class="detail-row" v-if="selected.ai_score !== null">
                        <span class="detail-label">AI Score</span>
                        <span :class="'score-badge ' + scoreClass(selected.ai_score)">{{ selected.ai_score }}</span>
                    </div>
                    <div class="detail-row" v-if="selected.ai_grade">
                        <span class="detail-label">AI Grade</span>
                        <span>{{ selected.ai_grade }}</span>
                    </div>
                </div>

                <div class="detail-section" v-if="allowedNextStatuses.length > 0">
                    <h4>Change Status</h4>
                    <div class="status-actions">
                        <select v-model="newStatus" class="form-input">
                            <option value="">— Select next status —</option>
                            <option v-for="s in allowedNextStatuses" :key="s" :value="s">{{ s }}</option>
                        </select>
                        <button class="btn-primary" @click="changeStatus" :disabled="!newStatus || newStatus === selected.status">
                            Update Status
                        </button>
                        <button v-if="selected.status === 'Shortlisted'" class="btn-schedule" @click="openSchedule(selected)">
                            <span class="btn-icon">📅</span> Schedule Interview
                        </button>
                        <button v-if="selected.status === 'Selected'" class="btn-offer" @click="openOffer(selected)">
                            <span class="btn-icon">📝</span> Create Offer
                        </button>
                    </div>
                </div>
                <div class="detail-section" v-else>
                    <h4>Status</h4>
                    <p style="color:#6b7280;font-size:13px;margin:8px 0 0;">Status transitions from here happen automatically based on the flow.</p>
                    <div class="status-actions" style="margin-top:12px;">
                        <button v-if="selected.status === 'Shortlisted'" class="btn-schedule" @click="openSchedule(selected)">
                            <span class="btn-icon">📅</span> Schedule Interview
                        </button>
                        <button v-if="selected.status === 'Selected'" class="btn-offer" @click="openOffer(selected)">
                            <span class="btn-icon">📝</span> Create Offer
                        </button>
                    </div>
                </div>

                <div class="detail-section" v-if="selected.status === 'Onboarding Initiated'">
                    <h4>Complete Onboarding</h4>
                    <p style="color:#6b7280;font-size:13px;margin:0 0 12px;">Issue company email + temporary password. This creates the Employee record and sends welcome credentials to the candidate.</p>
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Company *</label>
                            <select v-model="onboardForm.company" class="form-input">
                                <option value="">— Select company —</option>
                                <option v-for="c in companies" :key="c.name" :value="c.name">{{ c.name }}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Department</label>
                            <select v-model="onboardForm.department" class="form-input">
                                <option value="">— Select department —</option>
                                <option v-for="d in departments" :key="d.name" :value="d.name">{{ d.name }}</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Company Email *</label>
                            <input v-model="onboardForm.company_email" type="email" class="form-input" placeholder="firstname@cozycornerpatios.com" />
                        </div>
                        <div class="form-group">
                            <label>Temporary Password *</label>
                            <input v-model="onboardForm.temp_password" type="text" class="form-input" placeholder="Set a temp password" />
                        </div>
                    </div>
                    <button class="btn-primary" @click="completeOnboarding" :disabled="onboardLoading" style="margin-top:12px;">
                        {{ onboardLoading ? 'Processing...' : 'Complete Onboarding' }}
                    </button>
                </div>

                <div class="detail-section" v-if="selected.status === 'Onboarded'">
                    <h4>Onboarded ✅</h4>
                    <p style="color:#065f46;font-size:14px;margin:8px 0 0;background:#f0fdf4;padding:12px;border-radius:6px;">This candidate has been onboarded. Welcome email with credentials sent.</p>
                </div>

                <div class="detail-section" v-if="candidateDetailUrl && (selected.status === 'Offer Accepted' || selected.status === 'Onboarding Initiated')">
                    <h4>Onboarding Form Link</h4>
                    <p style="color:#6b7280;font-size:13px;margin:0 0 8px;">Share this link with the candidate if they didn't receive the email:</p>
                    <div style="display:flex;gap:8px;align-items:center;">
                        <input :value="candidateDetailUrl" readonly class="form-input" style="flex:1;font-size:12px;background:#f9fafb;" @focus="$event.target.select()" />
                        <button class="btn-secondary" @click="copyUrl(candidateDetailUrl)" style="padding:8px 16px;">Copy</button>
                    </div>
                </div>

                <div class="detail-section" v-if="interviewHistory.length > 0">
                    <h4>Interview History</h4>
                    <div class="interview-list">
                        <div v-for="iv in interviewHistory" :key="iv.name" class="interview-item">
                            <div class="iv-header">
                                <span class="iv-round">Round {{ iv.round_number }}: {{ iv.round_name }}</span>
                                <Badge :label="iv.status" />
                            </div>
                            <div class="iv-details">
                                <span>{{ formatDate(iv.scheduled_date) }}</span>
                                <span v-if="iv.interviewer"> · {{ iv.interviewer }}</span>
                                <span v-if="iv.rating"> · Rating: {{ iv.rating }}/5</span>
                            </div>
                            <a v-if="iv.google_meet_link" :href="iv.google_meet_link" target="_blank" class="iv-link">
                                Join Google Meet
                            </a>
                            <Badge v-if="iv.recommendation" :label="iv.recommendation" />
                        </div>
                    </div>
                </div>
            </div>
        </Dialog>

        <!-- Schedule Interview Dialog -->
        <Dialog v-if="showSchedule" :visible="true" title="Schedule Interviews" size="lg"
            :loading="scheduleLoading" @close="showSchedule = false" @submit="scheduleInterviews">
            <div v-for="(round, idx) in scheduleForm.rounds" :key="idx" class="round-block">
                <h4>Round {{ idx + 1 }}: {{ round.round_name }}</h4>
                <div class="form-grid">
                    <div class="form-group">
                        <label>Round Name</label>
                        <input v-model="round.round_name" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label>Interviewer</label>
                        <select v-model="round.interviewer" class="form-input">
                            <option value="">— Select Interviewer —</option>
                            <option v-for="u in interviewers" :key="u.name" :value="u.name">{{ u.full_name || u.name }} ({{ u.name }})</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Date *</label>
                        <input v-model="round.scheduled_date" type="date" class="form-input" required />
                    </div>
                    <div class="form-group">
                        <label>Time</label>
                        <input v-model="round.scheduled_time" type="time" class="form-input" />
                    </div>
                    <div class="form-group">
                        <label>Duration (min)</label>
                        <input v-model.number="round.duration_minutes" type="number" class="form-input" />
                    </div>
                </div>
            </div>
        </Dialog>

        <!-- Create Offer Dialog -->
        <Dialog v-if="showOffer" :visible="true" title="Create Offer Letter" size="md"
            :loading="offerLoading" @close="showOffer = false" @submit="submitOffer" submitLabel="Send Offer">
            <div class="form-group">
                <label>Designation</label>
                <input v-model="offerForm.designation" class="form-input" placeholder="e.g. Software Engineer" />
            </div>
            <div class="form-row">
                <div class="form-group">
                    <label>Annual CTC</label>
                    <input v-model.number="offerForm.annual_ctc" type="number" class="form-input" />
                </div>
                <div class="form-group">
                    <label>Start Date</label>
                    <input v-model="offerForm.start_date" type="date" class="form-input" />
                </div>
            </div>
            <div class="form-group">
                <label>Terms & Notes</label>
                <textarea v-model="offerForm.terms" rows="4" class="form-input"></textarea>
            </div>
        </Dialog>

        <Toast :message="toast.message" :type="toast.type" :visible="toast.visible" @hide="toast.visible = false" />
    </div>
</template>

<script>
import Badge from './shared/Badge.vue';
import Dialog from './shared/Dialog.vue';
import KpiCard from './shared/KpiCard.vue';
import Toast from './shared/Toast.vue';

export default {
    name: 'CandidatesTab',
    components: { Badge, Dialog, KpiCard, Toast },
    data() {
        return {
            candidates: [],
            jobs: [],
            interviewers: [],
            companies: [],
            departments: [],
            stats: { total: 0, shortlisted: 0, in_interviews: 0, selected: 0, offer_sent: 0 },
            statuses: [
                'Applied', 'Under Screening', 'Shortlisted', 'Rejected at Screening',
                'Interview Scheduled', 'Interview In Progress', 'All Rounds Complete',
                'Selected', 'Not Selected', 'Offer Sent', 'Offer Accepted',
                'Offer Declined', 'Onboarding Initiated', 'Onboarded'
            ],
            searchQuery: '',
            filterJob: '',
            filterStatus: '',
            view: 'pipeline',
            selected: null,
            newStatus: '',
            interviewHistory: [],
            showSchedule: false,
            scheduleForm: { rounds: [] },
            scheduleLoading: false,
            templateRounds: [],
            showOffer: false,
            offerForm: { designation: '', annual_ctc: 0, start_date: '', terms: '' },
            offerLoading: false,
            onboardForm: { company: '', department: '', company_email: '', temp_password: '' },
            onboardLoading: false,
            candidateDetailUrl: '',
            loading: false,
            toast: { message: '', type: 'success', visible: false }
        };
    },
    computed: {
        filteredCandidates() {
            return this.candidates.filter(c => {
                if (this.searchQuery) {
                    const q = this.searchQuery.toLowerCase();
                    if (!(c.applicant_name && c.applicant_name.toLowerCase().includes(q)) &&
                        !(c.email && c.email.toLowerCase().includes(q))) return false;
                }
                if (this.filterJob && c.job_opening !== this.filterJob) return false;
                if (this.filterStatus && c.status !== this.filterStatus) return false;
                return true;
            });
        },
        pipelineColumns() {
            const cols = [
                'Applied', 'Under Screening', 'Shortlisted',
                'Interview Scheduled', 'Interview In Progress',
                'All Rounds Complete', 'Selected', 'Offer Sent',
                'Offer Accepted', 'Onboarding Initiated', 'Onboarded'
            ];
            return cols.map(status => ({
                status,
                candidates: this.filteredCandidates.filter(c => c.status === status)
            }));
        },
        allowedNextStatuses() {
            if (!this.selected || !this.selected.status) return [];
            const current = this.selected.status;
            const transitions = {
                'Applied': ['Under Screening', 'Rejected at Screening'],
                'Under Screening': ['Shortlisted', 'Rejected at Screening'],
                'Shortlisted': ['Rejected at Screening'],
                'All Rounds Complete': ['Selected', 'Not Selected'],
                'Interview In Progress': ['Not Selected'],
                'Interview Scheduled': ['Not Selected']
            };
            return transitions[current] || [];
        }
    },
    mounted() {
        this.loadCandidates();
        this.loadJobs();
        this.loadInterviewers();
        this.loadCompanies();
        this.loadDepartments();
    },
    methods: {
        async api(method, params = {}) {
            return new Promise((resolve, reject) => {
                frappe.call({
                    method: method,
                    args: params,
                    callback: r => resolve(r.message),
                    error: e => reject(e)
                });
            });
        },
        showToast(message, type = 'success') {
            this.toast = { message, type, visible: true };
        },
        formatDate(date) {
            if (!date) return '';
            return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        },
        scoreClass(score) {
            if (score >= 70) return 'score-high';
            if (score >= 40) return 'score-mid';
            return 'score-low';
        },
        async loadCandidates() {
            this.loading = true;
            try {
                const res = await this.api('wf_get_dashboard_data');
                this.candidates = res.applicants || [];
                this.stats = res.stats || {};
            } catch (e) {
                this.showToast('Failed to load candidates', 'error');
            }
            this.loading = false;
        },
        async loadJobs() {
            try {
                const res = await this.api('wf_get_job_openings');
                this.jobs = res.jobs || [];
            } catch (e) { this.jobs = []; }
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
        async loadCompanies() {
            try {
                this.companies = await this.api('frappe.client.get_list', {
                    doctype: 'Company',
                    fields: ['name'],
                    limit_page_length: 0,
                    order_by: 'name asc'
                });
            } catch (e) { this.companies = []; }
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
        async loadCandidateDetailUrl(applicantName) {
            this.candidateDetailUrl = '';
            if (!applicantName) return;
            try {
                const rows = await this.api('frappe.client.get_list', {
                    doctype: 'WF Candidate Detail',
                    filters: { applicant: applicantName },
                    fields: ['access_token'],
                    limit_page_length: 1
                });
                if (rows && rows[0] && rows[0].access_token) {
                    const origin = window.location.origin;
                    this.candidateDetailUrl = origin + '/candidate-onboarding?token=' + rows[0].access_token;
                }
            } catch (e) { this.candidateDetailUrl = ''; }
        },
        copyUrl(url) {
            if (!url) return;
            navigator.clipboard.writeText(url).then(() => {
                this.showToast('Link copied to clipboard', 'success');
            }).catch(() => {
                this.showToast('Could not copy — please select and copy manually', 'error');
            });
        },
        async completeOnboarding() {
            if (!this.onboardForm.company) { this.showToast('Please select a company', 'error'); return; }
            if (!this.onboardForm.company_email) { this.showToast('Please enter company email', 'error'); return; }
            if (!this.onboardForm.temp_password) { this.showToast('Please set a temporary password', 'error'); return; }
            if (!confirm('This will create the Employee record and send credentials to the candidate. Proceed?')) return;

            this.onboardLoading = true;
            try {
                const res = await this.api('wf_complete_onboarding', {
                    data: {
                        applicant: this.selected.name,
                        company: this.onboardForm.company,
                        department: this.onboardForm.department,
                        company_email: this.onboardForm.company_email,
                        temp_password: this.onboardForm.temp_password
                    }
                });
                this.showToast('Onboarding complete! Employee ID: ' + (res.employee_id || ''), 'success');
                this.selected.status = 'Onboarded';
                this.onboardForm = { company: '', department: '', company_email: '', temp_password: '' };
                this.loadCandidates();
            } catch (e) {
                this.showToast('Onboarding failed. Please check the details and try again.', 'error');
            }
            this.onboardLoading = false;
        },
        async openDetail(iv) {
            this.selected = iv;
            this.newStatus = iv.status;
            this.onboardForm = { company: '', department: '', company_email: '', temp_password: '' };
            try {
                this.interviewHistory = await this.api('frappe.client.get_list', {
                    doctype: 'WF Interview',
                    filters: { applicant: iv.name },
                    fields: ['name', 'round_number', 'round_name', 'scheduled_date',
                             'interviewer', 'status', 'rating', 'recommendation', 'google_meet_link'],
                    order_by: 'round_number asc',
                    limit_page_length: 0
                });
            } catch (e) { this.interviewHistory = []; }
            this.loadCandidateDetailUrl(iv.name);
        },
        closeDetail() {
            this.selected = null;
        },
        async changeStatus() {
            if (!this.newStatus) return;
            try {
                await this.api('wf_update_applicant_status', {
                    applicant_name: this.selected.name,
                    status: this.newStatus
                });
                this.showToast('Status updated', 'success');
                this.selected.status = this.newStatus;
                this.loadCandidates();
            } catch (e) {
                this.showToast('Failed to update status', 'error');
            }
        },
        async openSchedule(candidate) {
            this.selected = candidate;
            let rounds = [];
            try {
                const templates = await this.api('wf_get_interview_templates');
                const job = this.jobs.find(j => j.name === candidate.job_opening);
                if (job && job.interview_template) {
                    const tmpl = templates.find(t => t.name === job.interview_template);
                    if (tmpl && tmpl.rounds) {
                        rounds = tmpl.rounds.map(r => ({
                            round_name: r.round_name || '',
                            interviewer: r.default_interviewer || '',
                            scheduled_date: '',
                            scheduled_time: '',
                            duration_minutes: r.duration || 30
                        }));
                    }
                }
            } catch (e) {}
            if (rounds.length === 0) {
                rounds = [{
                    round_name: 'Round 1',
                    interviewer: '',
                    scheduled_date: '',
                    scheduled_time: '',
                    duration_minutes: 30
                }];
            }
            this.scheduleForm = { rounds };
            this.showSchedule = true;
        },
        async scheduleInterviews() {
            const invalidRounds = this.scheduleForm.rounds.filter(r => !r.scheduled_date);
            if (invalidRounds.length > 0) {
                this.showToast('All rounds need a date', 'error');
                return;
            }
            this.scheduleLoading = true;
            try {
                await this.api('wf_schedule_interviews', {
                    data: {
                        applicant: this.selected.name,
                        rounds: this.scheduleForm.rounds
                    }
                });
                this.showToast('Interviews scheduled!', 'success');
                this.showSchedule = false;
                this.selected.status = 'Interview Scheduled';
                this.loadCandidates();
            } catch (e) {
                this.showToast('Failed to schedule interviews', 'error');
            }
            this.scheduleLoading = false;
        },
        openOffer(candidate) {
            this.selected = candidate;
            const job = this.jobs.find(j => j.name === candidate.job_opening);
            this.offerForm = {
                designation: job ? job.job_title : '',
                annual_ctc: 0,
                start_date: '',
                terms: ''
            };
            this.showOffer = true;
        },
        async submitOffer() {
            if (!this.offerForm.designation) {
                this.showToast('Designation is required', 'error');
                return;
            }
            this.offerLoading = true;
            try {
                await this.api('wf_create_offer', {
                    data: {
                        applicant: this.selected.name,
                        ...this.offerForm
                    }
                });
                this.showToast('Offer created and sent!', 'success');
                this.showOffer = false;
                this.selected.status = 'Offer Sent';
                this.loadCandidates();
            } catch (e) {
                this.showToast('Failed to create offer', 'error');
            }
            this.offerLoading = false;
        }
    }
};
</script>

<style scoped>
.candidates-tab { padding: 24px 0; }

.stats-row {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 16px;
    margin-bottom: 24px;
}

.toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}
.toolbar-left {
    display: flex;
    gap: 12px;
    flex: 1;
    min-width: 300px;
}
.search-input {
    flex: 2;
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
}
.filter-select {
    padding: 10px 14px;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    font-size: 14px;
    background: #fff;
    cursor: pointer;
}

.view-toggle {
    display: inline-flex;
    border: 1px solid #d1d5db;
    border-radius: 8px;
    overflow: hidden;
}
.toggle-btn {
    padding: 10px 16px;
    border: none;
    background: #fff;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: #6b7280;
}
.toggle-btn.active {
    background: #4f46e5;
    color: #fff;
}

.kanban-board {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 12px;
}
.kanban-column {
    flex: 0 0 260px;
    background: #f3f4f6;
    border-radius: 10px;
    padding: 12px;
}
.kanban-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 0 4px;
}
.kanban-title { font-weight: 600; color: #374151; font-size: 14px; }
.kanban-count {
    background: #fff;
    padding: 2px 10px;
    border-radius: 12px;
    font-size: 12px;
    color: #6b7280;
    font-weight: 600;
}
.kanban-cards { display: flex; flex-direction: column; gap: 8px; }
.kanban-card {
    background: #fff;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    transition: transform 0.15s ease;
}
.kanban-card:hover { transform: translateY(-2px); }
.card-name { font-weight: 600; color: #111827; font-size: 14px; }
.card-job { color: #6b7280; font-size: 12px; margin-top: 4px; }
.card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 8px;
}
.ai-score {
    background: #ede9fe;
    color: #6d28d9;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
}
.card-date { color: #9ca3af; font-size: 11px; }

.table-wrap {
    background: #fff;
    border-radius: 12px;
    overflow: hidden;
    box-shadow: 0 1px 3px rgba(0,0,0,0.05);
}
.wf-table { width: 100%; border-collapse: collapse; }
.wf-table th {
    background: #f9fafb;
    padding: 12px 16px;
    text-align: left;
    font-weight: 600;
    color: #374151;
    font-size: 13px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}
.wf-table td {
    padding: 14px 16px;
    border-top: 1px solid #f3f4f6;
    font-size: 14px;
    color: #4b5563;
}
.wf-table tbody tr {
    cursor: pointer;
    transition: background 0.15s ease;
}
.wf-table tbody tr:hover { background: #f9fafb; }
.td-name { font-weight: 600; color: #111827; }

.score-badge {
    padding: 4px 10px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 600;
}
.score-high { background: #dcfce7; color: #166534; }
.score-mid { background: #fef3c7; color: #92400e; }
.score-low { background: #fee2e2; color: #991b1b; }
.score-none { color: #9ca3af; font-size: 14px; }

.detail-panel { padding: 0 4px; }
.detail-section { margin-bottom: 24px; }
.detail-section h4 {
    margin: 0 0 12px;
    color: #111827;
    font-size: 15px;
    font-weight: 600;
}
.detail-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #f3f4f6;
}
.detail-label { color: #6b7280; font-weight: 500; }

.status-actions {
    display: flex;
    gap: 10px;
    align-items: center;
    flex-wrap: wrap;
}
.form-input {
    padding: 8px 12px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 14px;
    flex: 1;
    min-width: 180px;
}
.btn-primary {
    background: #4f46e5;
    color: #fff;
    padding: 8px 20px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
}
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-secondary {
    background: #fff;
    color: #374151;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
}
.btn-secondary:hover { background: #f9fafb; }
.btn-schedule {
    background: #10b981;
    color: #fff;
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
}
.btn-schedule:hover { background: #059669; }
.btn-offer {
    background: #f59e0b;
    color: #fff;
    padding: 8px 16px;
    border: none;
    border-radius: 6px;
    font-weight: 500;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 14px;
}
.btn-offer:hover { background: #d97706; }
.btn-icon { font-size: 16px; }

.interview-list { display: flex; flex-direction: column; gap: 12px; }
.interview-item {
    background: #f9fafb;
    padding: 12px;
    border-radius: 8px;
    border-left: 3px solid #4f46e5;
}
.iv-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 6px;
}
.iv-round { font-weight: 600; color: #374151; }
.iv-details { color: #6b7280; font-size: 13px; margin-bottom: 6px; }
.iv-link {
    color: #4f46e5;
    text-decoration: none;
    font-size: 13px;
    font-weight: 500;
    display: inline-block;
    margin-right: 8px;
}
.iv-link:hover { text-decoration: underline; }

.round-block {
    padding: 12px;
    background: #f9fafb;
    border-radius: 8px;
    margin-bottom: 12px;
}
.round-block h4 { margin: 0 0 8px; }

.form-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}
.form-group { margin-bottom: 12px; }
.form-group label {
    display: block;
    margin-bottom: 4px;
    font-size: 12px;
    font-weight: 500;
    color: #6b7280;
}

@media (max-width: 768px) {
    .stats-row {
        grid-template-columns: 1fr 1fr;
    }
    .toolbar-left {
        flex-direction: column;
    }
    .form-grid, .form-row {
        grid-template-columns: 1fr;
    }
    .kanban-column {
        flex: 0 0 220px;
    }
}
</style>