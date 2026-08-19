<template>
	<div class="workforce-hub">
		<div class="wf-header">
			<div class="wf-header-content">
				<h1 class="wf-title">Workforce Hub</h1>
				<p class="wf-subtitle">HR Recruitment Management</p>
			</div>
		</div>

		<div class="wf-tabs">
			<button
				v-for="tab in tabs"
				:key="tab.key"
				class="wf-tab-btn"
				:class="{ active: activeTab === tab.key }"
				@click="switchTab(tab.key)"
			>
				<span class="tab-icon" v-html="tab.icon"></span>
				{{ tab.label }}
			</button>
		</div>

		<div class="wf-tab-content">
			<JobsTab v-if="activeTab === 'jobs'" />
			<CandidatesTab v-if="activeTab === 'candidates'" />
			<InterviewsTab v-if="activeTab === 'interviews'" />
			<TalentSearchTab v-if="activeTab === 'talent'" />
		</div>
	</div>
</template>

<script>
import JobsTab from './JobsTab.vue';
import CandidatesTab from './CandidatesTab.vue';
import InterviewsTab from './InterviewsTab.vue';
import TalentSearchTab from './TalentSearchTab.vue';

export default {
	name: 'WorkforceHub',
	components: { JobsTab, CandidatesTab, InterviewsTab, TalentSearchTab },

	data() {
		return {
			activeTab: 'jobs',
			tabs: [
				{ key: 'jobs', label: 'Jobs', icon: '📋' },
				{ key: 'candidates', label: 'Candidates', icon: '👥' },
				{ key: 'interviews', label: 'Interviews', icon: '🗓️' },
				{ key: 'talent', label: 'Talent Search', icon: '🔍' }
			]
		};
	},

	mounted() {
		const hash = window.location.hash.replace('#', '');
		if (['jobs', 'candidates', 'interviews', 'talent'].includes(hash)) {
			this.activeTab = hash;
		}
	},

	methods: {
		switchTab(tab) {
			this.activeTab = tab;
			window.location.hash = tab;
		}
	}
};
</script>

<style scoped>
.workforce-hub {
	font-family: var(--font-stack, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif);
	background: var(--bg-color, #f5f6fa);
	min-height: 100vh;
}

.wf-header {
	background: linear-gradient(135deg, #3b3689 0%, #4f46e5 100%);
	padding: 24px 32px;
	color: #fff;
}

.wf-title {
	font-size: 24px;
	font-weight: 700;
	margin: 0;
	max-width: 1400px;
	margin: 0 auto;
}

.wf-subtitle {
	font-size: 14px;
	opacity: 0.8;
	margin: 4px auto 0;
	max-width: 1400px;
}

.wf-tabs {
	display: flex;
	gap: 0;
	background: #fff;
	border-bottom: 2px solid #e5e7eb;
	padding: 0 32px;
	position: sticky;
	top: 0;
	z-index: 10;
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
	padding: 24px 32px;
	max-width: 1400px;
	margin: 0 auto;
	width: 100%;
	box-sizing: border-box;
}

/* Large desktop 1440px+ */
@media (min-width: 1441px) {
	.wf-header { padding: 28px 48px; }
	.wf-tabs { padding: 0 48px; }
	.wf-tab-content { padding: 28px 48px; max-width: 1600px; }
}

/* Standard desktop 1024-1440 */
@media (max-width: 1440px) {
	.wf-tab-content { padding: 24px 32px; }
}

/* Small laptop / tablet landscape 768-1024 */
@media (max-width: 1024px) {
	.wf-header { padding: 20px 24px; }
	.wf-tabs { padding: 0 20px; }
	.wf-tab-content { padding: 20px 24px; }
	.wf-tab-btn { padding: 12px 18px; font-size: 13px; }
}

/* Tablet portrait ~768 */
@media (max-width: 768px) {
	.wf-header { padding: 18px 16px; }
	.wf-title { font-size: 20px; }
	.wf-subtitle { font-size: 13px; }
	.wf-tabs { padding: 0 12px; }
	.wf-tab-btn { padding: 10px 14px; font-size: 13px; }
	.wf-tab-content { padding: 16px; }
}
</style>