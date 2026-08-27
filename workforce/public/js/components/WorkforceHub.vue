<template>
	<div class="workforce-hub">
		<div class="wf-header">
			<div class="wf-container">
				<h1 class="wf-title">Workforce Hub</h1>
				<p class="wf-subtitle">HR Recruitment Management</p>
			</div>
		</div>

		<div class="wf-tabs">
			<div class="wf-container wf-tabs-inner">
				<button
					v-for="tab in visibleTabs"
					:key="tab.key"
					class="wf-tab-btn"
					:class="{ active: activeTab === tab.key }"
					@click="switchTab(tab.key)"
				>
					<span class="tab-icon" v-html="tab.icon"></span>
					{{ tab.label }}
				</button>
			</div>
		</div>

		<div class="wf-tab-content">
			<div class="wf-container">
				<JobsTab v-if="activeTab === 'jobs'" />
				<RequisitionsTab v-if="activeTab === 'requisitions'" />
				<ApprovalsTab v-if="activeTab === 'approvals'" />
				<CandidatesTab v-if="activeTab === 'candidates'" />
				<InterviewsTab v-if="activeTab === 'interviews'" />
				<TalentSearchTab v-if="activeTab === 'talent'" />
			</div>
		</div>
	</div>
</template>
<script>
import JobsTab from './JobsTab.vue';
import RequisitionsTab from './RequisitionsTab.vue';
import ApprovalsTab from './ApprovalsTab.vue';
import CandidatesTab from './CandidatesTab.vue';
import InterviewsTab from './InterviewsTab.vue';
import TalentSearchTab from './TalentSearchTab.vue';

export default {
	name: 'WorkforceHub',
	components: { JobsTab, RequisitionsTab, ApprovalsTab, CandidatesTab, InterviewsTab, TalentSearchTab },

	data() {
		return {
			activeTab: 'jobs',
			userRoles: [],
			// Tab visibility by role. 'System Manager' is added everywhere as an admin fallback.
			// HR Manager  = WF HR Manager (Asha)         — full recruitment workspace
			// Leadership  = WF Leadership (Priyesh)      — approvals + oversight of Jobs/Requisitions
			// Hiring Mgr  = WF Hiring Manager (Sahil)    — raises + tracks his requisitions only
			// Recruiter   = WF Recruitment Coordinator   — works the pipeline: Jobs, Candidates, Interviews, Talent
			allTabs: [
				{ key: 'jobs',         label: 'Jobs',          icon: '📋', roles: ['System Manager', 'WF HR Manager', 'WF Leadership', 'WF Recruitment Coordinator'] },
				{ key: 'requisitions', label: 'Requisitions',  icon: '📝', roles: ['System Manager', 'WF HR Manager', 'WF Leadership', 'WF Hiring Manager'] },
				{ key: 'approvals',    label: 'Approvals',     icon: '✅', roles: ['System Manager', 'WF Leadership'] },
				{ key: 'candidates',   label: 'Candidates',    icon: '👥', roles: ['System Manager', 'WF HR Manager', 'WF Recruitment Coordinator'] },
				{ key: 'interviews',   label: 'Interviews',    icon: '🗓️', roles: ['System Manager', 'WF HR Manager', 'WF Recruitment Coordinator'] },
				{ key: 'talent',       label: 'Talent Search', icon: '🔍', roles: ['System Manager', 'WF HR Manager', 'WF Recruitment Coordinator'] }
			]
		};
	},

	computed: {
		visibleTabs() {
			return this.allTabs.filter(tab => {
				if (tab.roles.includes('*')) return true;
				return tab.roles.some(r => this.userRoles.includes(r));
			});
		},

		validKeys() {
			return this.visibleTabs.map(t => t.key);
		}
	},

	mounted() {
		this.userRoles = (window.frappe && frappe.user_roles) || [];

		const hash = (window.location.hash || '').replace('#', '');
		if (this.validKeys.includes(hash)) {
			this.activeTab = hash;
		} else {
			this.activeTab = this.visibleTabs[0] ? this.visibleTabs[0].key : 'jobs';
		}
		window.addEventListener('hashchange', this.onHashChange);

		// Hide any lingering Frappe page elements
		this.$nextTick(() => {
			const pageHead = document.querySelector('.page-head');
			if (pageHead) pageHead.style.display = 'none';
			const pageHeadWrapper = document.querySelector('.page-head-wrapper');
			if (pageHeadWrapper) pageHeadWrapper.style.display = 'none';
		});
	},

	beforeUnmount() {
		window.removeEventListener('hashchange', this.onHashChange);
	},

	methods: {
		switchTab(tab) {
			this.activeTab = tab;
			history.replaceState(null, '', '/app/workforce-hub#' + tab);
		},

		onHashChange() {
			const hash = (window.location.hash || '').replace('#', '');
			if (this.validKeys.includes(hash)) {
				this.activeTab = hash;
			}
		}
	}
};
</script>
<style scoped>
/* Override Frappe's container width only for Workforce Hub */
.workforce-hub :deep(.container-xl),
.workforce-hub :deep(.container-lg),
.workforce-hub :deep(.container-md),
.workforce-hub :deep(.container-sm),
.workforce-hub :deep(.container) {
	max-width: 100%;
}

.workforce-hub {
	font-family: var(--font-stack, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
	background: var(--bg-color, #f5f6fa);
	min-height: calc(100vh - 60px);
	margin: -20px;
	margin-top: -10px;
}

.wf-container {
	max-width: 1200px;
	margin: 0 auto;
	width: 100%;
	padding: 0 24px;
	box-sizing: border-box;
}

.wf-header {
	background: linear-gradient(135deg, #3b3689 0%, #4f46e5 100%);
	padding: 24px 0;
	color: #fff;
}

.wf-title {
	font-size: 24px;
	font-weight: 700;
	margin: 0;
}

.wf-subtitle {
	font-size: 14px;
	opacity: 0.8;
	margin: 4px 0 0;
}

.wf-tabs {
	background: #fff;
	border-bottom: 2px solid #e5e7eb;
	position: sticky;
	top: 0;
	z-index: 10;
}

.wf-tabs-inner {
	display: flex;
	gap: 0;
}

.wf-tab-btn {
	padding: 14px 24px;
	border: none;
	background: none;
	font-size: 14px;
	font-weight: 500;
	color: #6b7280;
	cursor: pointer;
	border-bottom: 3px solid transparent;
	transition: all 0.2s;
	display: flex;
	align-items: center;
	gap: 8px;
}

.wf-tab-btn:hover {
	color: #4f46e5;
	background: #f9fafb;
}

.wf-tab-btn.active {
	color: #4f46e5;
	border-bottom-color: #4f46e5;
	font-weight: 600;
}

.tab-icon {
	font-size: 16px;
}

.wf-tab-content {
	padding: 24px 0;
}

/* Large desktop 1440px+ */
@media (min-width: 1441px) {
	.wf-container { max-width: 1400px; padding: 0 32px; }
	.wf-header { padding: 28px 0; }
}

/* Standard desktop 1024-1440 */
@media (max-width: 1440px) {
	.wf-container { max-width: 1200px; padding: 0 24px; }
}

/* Small laptop / tablet landscape 768-1024 */
@media (max-width: 1024px) {
	.wf-container { padding: 0 20px; }
	.wf-header { padding: 20px 0; }
	.wf-tab-btn { padding: 12px 18px; font-size: 13px; }
}

/* Tablet portrait ~768 */
@media (max-width: 768px) {
	.wf-container { padding: 0 16px; }
	.wf-header { padding: 18px 0; }
	.wf-title { font-size: 20px; }
	.wf-subtitle { font-size: 13px; }
	.wf-tab-btn { padding: 10px 14px; font-size: 13px; }
}
</style>