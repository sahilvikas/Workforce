<template>
	<div class="wf-hub">
		<aside class="wf-rail" aria-label="Workforce navigation">
			<div class="wf-brand">
				<div class="wf-mark">W</div>
				<div>
					<b>Workforce</b>
					<span>Recruitment</span>
				</div>
			</div>

			<div v-for="group in navGroups" :key="group.name" class="wf-ngroup">
				<h6>{{ group.name }}</h6>
				<nav class="wf-nav">
					<!-- buttons, not links: Frappe's desk router hijacks <a href="#..."> clicks -->
					<button
						v-for="item in group.items"
						:key="item.key"
						type="button"
						:class="{ on: activeTab === item.key }"
						:aria-current="activeTab === item.key ? 'page' : null"
						@click="switchTab(item.key)"
					>
						<svg class="wf-ic" viewBox="0 0 24 24" aria-hidden="true" v-html="icons[item.icon]"></svg>
						<span>{{ labelFor(item) }}</span>
					</button>
				</nav>
			</div>

			<div class="wf-who">
				<span class="wf-av">{{ initials }}</span>
				<div>
					<b>{{ fullName }}</b>
					<span>{{ roleTitle }}</span>
				</div>
			</div>
		</aside>

		<main class="wf-main">
			<div class="wf-wrap">
				<JobsTab v-if="isJobsView" :section="jobsSection" />
				<RequisitionsTab v-if="activeTab === 'requisitions'" />
				<ApprovalsTab v-if="activeTab === 'approvals'" />
				<CmoApprovalsTab v-if="activeTab === 'cmo-approvals'" />
				<CandidatesTab v-if="activeTab === 'candidates'" />
				<InterviewsTab v-if="activeTab === 'interviews'" />
				<TalentSearchTab v-if="activeTab === 'talent'" />
				<SharedProfilesTab v-if="activeTab === 'shared'" />
			</div>
		</main>
	</div>
</template>

<script>
import JobsTab from './JobsTab.vue';
import RequisitionsTab from './RequisitionsTab.vue';
import ApprovalsTab from './ApprovalsTab.vue';
import CmoApprovalsTab from './CmoApprovalsTab.vue';
import CandidatesTab from './CandidatesTab.vue';
import InterviewsTab from './InterviewsTab.vue';
import TalentSearchTab from './TalentSearchTab.vue';
import SharedProfilesTab from './SharedProfilesTab.vue';

// Roles are the SAME as the old allTabs (phase 01 changes presentation only).
// 'WF Admin' is the admin fallback, NOT 'System Manager'.
const JOBS_ROLES = ['WF Admin', 'WF HR Manager', 'WF Recruitment Coordinator'];

const NAV = [
	// Overview = the old Jobs "Hiring Dashboard". Coordinators never had it.
	{ key: 'overview',      label: 'Overview',            group: 'Hiring', icon: 'home',   roles: ['WF Admin', 'WF HR Manager'], jobs: 'dashboard' },
	{ key: 'positions',     label: 'Positions',           group: 'Hiring', icon: 'brief',  roles: JOBS_ROLES, jobs: 'jobs' },
	{ key: 'requisitions',  label: 'Requisitions',        group: 'Hiring', icon: 'file',   roles: ['WF Admin', 'WF HR Manager', 'WF Hiring Manager'] },
	{ key: 'approvals',     label: 'Approvals',           group: 'Hiring', icon: 'check',  roles: ['WF Admin', 'WF Leadership'] },
	{ key: 'cmo-approvals', label: 'CMO approvals',       group: 'Hiring', icon: 'shield', roles: ['WF Admin', 'WF CMO'] },
	{ key: 'candidates',    label: 'Candidates',          group: 'People', icon: 'users',  roles: JOBS_ROLES },
	{ key: 'interviews',    label: 'Interviews',          group: 'People', icon: 'cal',    roles: JOBS_ROLES },
	{ key: 'talent',        label: 'Talent search',       group: 'People', icon: 'search', roles: JOBS_ROLES },
	// Profiles HR shared with a hiring manager / the CMO (talent search)
	{ key: 'shared',        label: 'Shared profiles',     group: 'People', icon: 'share',  roles: ['WF Admin', 'WF Hiring Manager', 'WF CMO'] },
	{ key: 'templates',     label: 'Interview templates', group: 'Setup',  icon: 'layers', roles: JOBS_ROLES, jobs: 'templates' }
];

const ICONS = {
	home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/>',
	brief: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2M3 13h18"/>',
	file: '<path d="M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>',
	check: '<path d="M20 6L9 17l-5-5"/>',
	shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
	users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.5 3.4-5.5 6.5-5.5s5.7 2 6.5 5.5M16 4.5a3.5 3.5 0 010 7M18 14.8c1.8.8 3 2.6 3.5 5.2"/>',
	cal: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
	search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
	layers: '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
	share: '<circle cx="6" cy="12" r="2.5"/><circle cx="18" cy="6" r="2.5"/><circle cx="18" cy="18" r="2.5"/><path d="M8.2 11l7.6-4M8.2 13l7.6 4"/>'
};

const ROLE_TITLES = [
	['WF Admin', 'Workforce admin'],
	['WF HR Manager', 'HR Manager'],
	['WF Recruitment Coordinator', 'Recruitment Coordinator'],
	['WF CMO', 'CMO'],
	['WF Leadership', 'Leadership'],
	['WF Hiring Manager', 'Hiring Manager']
];

export default {
	name: 'WorkforceHub',
	components: { JobsTab, RequisitionsTab, ApprovalsTab, CmoApprovalsTab, CandidatesTab, InterviewsTab, TalentSearchTab, SharedProfilesTab },

	data() {
		return {
			activeTab: '',
			userRoles: [],
			icons: ICONS
		};
	},

	computed: {
		visibleItems() {
			return NAV.filter(item => item.roles.some(r => this.userRoles.includes(r)));
		},
		validKeys() {
			return this.visibleItems.map(i => i.key);
		},
		navGroups() {
			const groups = [];
			this.visibleItems.forEach(item => {
				let g = groups.find(x => x.name === item.group);
				if (!g) { g = { name: item.group, items: [] }; groups.push(g); }
				g.items.push(item);
			});
			return groups;
		},
		currentItem() {
			return NAV.find(i => i.key === this.activeTab) || null;
		},
		isJobsView() {
			return !!(this.currentItem && this.currentItem.jobs);
		},
		jobsSection() {
			return this.currentItem && this.currentItem.jobs ? this.currentItem.jobs : '';
		},
		fullName() {
			return (window.frappe && frappe.session && (frappe.session.user_fullname || frappe.session.user)) || '';
		},
		initials() {
			return (this.fullName || '?').split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
		},
		roleTitle() {
			const hit = ROLE_TITLES.find(r => this.userRoles.includes(r[0]));
			return hit ? hit[1] : '';
		}
	},

	mounted() {
		this.userRoles = (window.frappe && frappe.user_roles) || [];
		this.activeTab = this.resolve((window.location.hash || '').replace('#', ''));
		window.addEventListener('hashchange', this.onHashChange);

		// Hide Frappe's own page head for this page only
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
		// Old links keep working: #jobs opens Overview (or Positions for coordinators).
		// A key the user's role can't see falls back to their first item.
		resolve(hash) {
			let key = hash;
			if (key === 'jobs') key = this.validKeys.includes('overview') ? 'overview' : 'positions';
			if (this.validKeys.includes(key)) return key;
			return this.validKeys[0] || '';
		},
		switchTab(key) {
			this.activeTab = key;
			try { history.replaceState(null, '', '/app/workforce-hub#' + key); } catch (e) { /* address bar is cosmetic */ }
			window.scrollTo(0, 0);
		},
		onHashChange() {
			const key = this.resolve((window.location.hash || '').replace('#', ''));
			if (key && key !== this.activeTab) this.activeTab = key;
		},
		labelFor(item) {
			// Samarth sir sees his CMO queue simply as "Approvals"
			if (item.key === 'cmo-approvals' && !this.validKeys.includes('approvals')) return 'Approvals';
			return item.label;
		}
	}
};
</script>

<style scoped>
/* Frappe's container width override, only for this page */
.wf-hub :deep(.container-xl),
.wf-hub :deep(.container-lg),
.wf-hub :deep(.container-md),
.wf-hub :deep(.container-sm),
.wf-hub :deep(.container) {
	max-width: 100%;
}

.wf-hub {
	display: grid;
	grid-template-columns: 236px minmax(0, 1fr);
	min-height: calc(100vh - 60px);
	margin: -20px;
	margin-top: -10px;
	background: var(--wf-bg);
}

/* ---------- sidebar (today's banner colour, darkening down) ---------- */
.wf-rail {
	position: sticky;
	top: var(--navbar-height, 48px);
	height: calc(100vh - var(--navbar-height, 48px));
	overflow-y: auto;
	display: flex;
	flex-direction: column;
	padding: 22px 14px;
	background: linear-gradient(180deg, var(--wf-banner) 0%, var(--wf-primary-deep) 100%);
	color: var(--wf-primary-soft);
	z-index: 5;
}
.wf-brand { display: flex; align-items: center; gap: 10px; padding: 0 10px 22px; }
.wf-mark {
	width: 34px; height: 34px; border-radius: 10px;
	background: var(--wf-amber); color: var(--wf-primary-deep);
	display: grid; place-items: center; font-weight: 700;
}
.wf-brand b { display: block; color: #fff; font-size: 15px; font-weight: 600; letter-spacing: -.01em; }
.wf-brand span { font-size: 12px; color: #A5B4FC; }

.wf-ngroup { margin: 4px 0 14px; }
.wf-ngroup h6 { margin: 0 10px 6px; font-size: 12px; font-weight: 500; color: #A5B4FC; }
.wf-nav button {
	position: relative;
	display: flex; align-items: center; gap: 11px;
	width: 100%;
	padding: 9px 10px;
	border: 0;
	border-radius: 9px;
	background: transparent;
	color: var(--wf-primary-soft);
	font: inherit; font-weight: 500; font-size: 14px;
	text-align: left;
	cursor: pointer;
}
.wf-nav button:hover { background: rgba(255, 255, 255, .07); color: #fff; }
.wf-nav button.on { background: rgba(255, 255, 255, .12); color: #fff; }
.wf-nav button.on::before {
	content: "";
	position: absolute; left: -14px; top: 9px; bottom: 9px;
	width: 3px; border-radius: 0 3px 3px 0;
	background: var(--wf-amber);
}
.wf-ic { width: 18px; height: 18px; flex: none; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }

.wf-who {
	margin-top: auto;
	padding: 12px 10px 0;
	border-top: 1px solid rgba(255, 255, 255, .1);
	display: flex; align-items: center; gap: 10px;
}
.wf-av {
	width: 30px; height: 30px; border-radius: 50%;
	background: rgba(255, 255, 255, .16); color: #fff;
	display: grid; place-items: center; font-size: 12px; font-weight: 600; flex: none;
}
.wf-who b { display: block; color: #fff; font-size: 13px; font-weight: 500; }
.wf-who span { font-size: 12px; color: #A5B4FC; }

/* ---------- content ---------- */
.wf-main { min-width: 0; padding: 28px 32px 80px; }
.wf-wrap { max-width: 1280px; margin: 0 auto; }

/* ---------- mobile: sidebar becomes a top scroll bar ---------- */
@media (max-width: 860px) {
	.wf-hub { grid-template-columns: 1fr; }
	.wf-rail {
		position: sticky;
		top: var(--navbar-height, 48px);
		height: auto;
		flex-direction: row;
		padding: 8px 10px;
		overflow-x: auto;
		z-index: 20;
	}
	.wf-brand, .wf-ngroup h6, .wf-who { display: none; }
	.wf-ngroup { margin: 0; display: flex; }
	.wf-nav { display: flex; gap: 2px; }
	.wf-nav button { width: auto; white-space: nowrap; padding: 8px 10px; }
	.wf-nav button.on::before { display: none; }
	.wf-main { padding: 20px 16px 80px; }
}
</style>