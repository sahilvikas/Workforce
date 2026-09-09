<template>
	<!-- /hr?print=<appraisal> opens just the form, for the browser's print dialog -->
	<div v-if="printName">
		<div v-if="printLoading" class="screen" aria-busy="true">
			<div class="card">
				<Skeleton width="220px" height="20px" />
				<Skeleton width="100%" height="14px" mt="16px" />
				<Skeleton width="80%" height="14px" mt="8px" />
			</div>
		</div>
		<div v-else-if="printError" class="screen">
			<div class="card">
				<h2>We couldn’t open that appraisal</h2>
				<p class="mt-2">{{ printError }}</p>
			</div>
		</div>
		<div v-else>
			<div class="print-bar">
				<span class="small muted">{{ printDoc && printDoc.employee_name }}</span>
				<Button variant="primary" @click="doPrint">Print or save as PDF</Button>
			</div>
			<ReadView :doc="printDoc" />
		</div>
	</div>

	<!-- no role for this console -->
	<div v-else-if="hr.door === 'denied'" class="screen">
		<div class="card">
			<h2>You don’t have access to the HR console</h2>
			<p class="mt-2">
				This page is for the appraisal HR roles. Ask an administrator to add one of
				<b>WF HR Manager</b>, <b>WF Admin</b> or <b>WF Recruitment Coordinator</b> to your user.
			</p>
			<p class="small muted mt-3">Signed in as {{ hr.ctx.user || 'an unknown user' }}.</p>
		</div>
	</div>

	<!-- the session went away underneath us -->
	<div v-else-if="hr.door === 'expired'" class="screen">
		<div class="card">
			<h2>Your session has ended</h2>
			<p class="mt-2">Sign in again to carry on where you left off.</p>
			<p class="mt-3"><a class="btn primary" href="/login?redirect-to=/hr">Sign in again</a></p>
		</div>
	</div>

	<div v-else class="hr">
		<nav class="hr-nav" aria-label="HR console">
			<div class="wordmark"><i aria-hidden="true"></i>Appraisal · HR</div>

			<div class="picker">
				<label for="wfa-hr-cycle">Cycle</label>
				<select
					id="wfa-hr-cycle"
					class="input"
					:value="hr.cycleName"
					:disabled="!hr.cycles.length"
					@change="pickCycle($event.target.value)"
				>
					<option v-for="c in hr.cycles" :key="c.name" :value="c.name">
						{{ c.cycle_name }}{{ c.status === 'Active' ? '' : ' · ' + c.status }}
					</option>
				</select>
			</div>

			<div role="tablist" aria-label="Views">
				<button
					v-for="v in views"
					:key="v.key"
					type="button"
					role="tab"
					:aria-selected="hr.view === v.key ? 'true' : 'false'"
					:class="{ on: hr.view === v.key }"
					@click="setView(v.key)"
				>
					{{ v.label }}
					<span v-if="countOf(v) !== undefined" class="cnt">{{ countOf(v) }}</span>
				</button>
			</div>

			<div class="whoami xs muted">
				{{ hr.ctx.full_name || hr.ctx.user }}<br />{{ hr.ctx.user }}
			</div>
		</nav>

		<main class="hr-main">
			<div v-if="!hr.booted" aria-busy="true">
				<Skeleton width="260px" height="26px" />
				<Skeleton width="420px" height="14px" mt="10px" />
				<div class="kpis mt-3">
					<div v-for="n in 5" :key="n" class="kpi">
						<Skeleton width="40px" height="24px" />
						<Skeleton width="100%" height="12px" mt="8px" />
					</div>
				</div>
				<Skeleton width="100%" height="220px" radius="10px" mt="12px" />
				<span class="sr-only">Loading the HR console</span>
			</div>

			<div v-else-if="hr.cycleError" class="card">
				<h3>We couldn’t load the cycle</h3>
				<p class="mt-2">{{ hr.cycleError }}</p>
				<Button variant="primary" class="mt-3" @click="retry">Try again</Button>
			</div>

			<div v-else-if="!hr.cycle" class="card">
				<h3>No appraisal cycle yet</h3>
				<p class="muted mt-2">Create one to start: name it, set the weights and the windows, then build the templates.</p>
				<Button variant="primary" class="mt-3" @click="setView('cycle')">Create a cycle</Button>
			</div>

			<component :is="viewComponent" v-else @go="setView" @open="openRow" @filter="applyFilter" />
		</main>

		<Drawer v-if="hr.drawer" @close="closeDrawer" @go="setView" />

		<PersonModal
			v-if="hr.modal && hr.modal.kind === 'person'"
			:person="hr.modal.person"
			@close="hr.modal = null"
		/>
		<ImportModal v-if="hr.modal && hr.modal.kind === 'import'" @close="hr.modal = null" />
		<ReopenModal
			v-if="hr.modal && hr.modal.kind === 'reopen'"
			:appraisal="hr.modal.appraisal"
			:name="hr.modal.name"
			:target="hr.modal.target"
			@close="hr.modal = null"
		/>
		<CalibrateModal
			v-if="hr.modal && hr.modal.kind === 'calibrate'"
			:appraisal="hr.modal.appraisal"
			:name="hr.modal.name"
			@close="hr.modal = null"
		/>

		<HrToast />
	</div>
</template>

<script>
import {
	hr,
	VIEWS,
	boot,
	setView,
	selectCycle,
	loadAll,
	navCount,
	call,
	openDrawer,
	closeDrawer,
} from './hrStore.js';

import Button from '../appraisal/ui/Button.vue';
import Skeleton from '../appraisal/ui/Skeleton.vue';

import HrToast from './HrToast.vue';
import Drawer from './Drawer.vue';
import ReadView from './ReadView.vue';
import Dashboard from './views/Dashboard.vue';
import Cycle from './views/Cycle.vue';
import Templates from './views/Templates.vue';
import People from './views/People.vue';
import Send from './views/Send.vue';
import Monitor from './views/Monitor.vue';
import Export from './views/Export.vue';
import PersonModal from './modals/PersonModal.vue';
import ImportModal from './modals/ImportModal.vue';
import ReopenModal from './modals/ReopenModal.vue';
import CalibrateModal from './modals/CalibrateModal.vue';

const VIEW_COMPONENTS = {
	dash: Dashboard,
	cycle: Cycle,
	tpl: Templates,
	people: People,
	send: Send,
	mon: Monitor,
	exp: Export,
};

export default {
	name: 'HrApp',
	components: {
		Button, Skeleton, HrToast, Drawer, ReadView,
		PersonModal, ImportModal, ReopenModal, CalibrateModal,
	},
	data() {
		return {
			hr: hr,
			views: VIEWS,
			printName: '',
			printLoading: false,
			printError: '',
			printDoc: null,
		};
	},
	computed: {
		viewComponent() {
			return VIEW_COMPONENTS[hr.view] || Dashboard;
		},
	},
	created() {
		const ctx = window.WFA_HR || { has_access: 0 };
		const params = new URLSearchParams(window.location.search);
		this.printName = params.get('print') || '';

		if (this.printName) {
			hr.ctx = ctx;
			if (!Number(ctx.has_access)) {
				hr.door = 'denied';
				this.printName = '';
				return;
			}
			this.loadPrint();
			return;
		}
		boot(ctx);
	},
	mounted() {
		document.addEventListener('keydown', this.onKey);
	},
	beforeUnmount() {
		document.removeEventListener('keydown', this.onKey);
	},
	methods: {
		setView: setView,
		closeDrawer: closeDrawer,
		countOf(view) {
			return navCount(view.counter);
		},
		pickCycle(name) {
			selectCycle(name);
		},
		retry() {
			loadAll(hr.cycleName || undefined);
		},
		openRow(appraisalName) {
			if (appraisalName) openDrawer(appraisalName);
		},
		// Dashboard sends the console to Monitor with a cell's filter applied.
		applyFilter(filter) {
			hr.q = '';
			hr.fDept = filter.department || '';
			hr.fStatus = filter.status || '';
			hr.fMgr = '';
			setView('mon');
		},
		onKey(e) {
			if (e.key !== 'Escape') return;
			if (hr.modal) {
				hr.modal = null;
				return;
			}
			if (hr.drawer) closeDrawer();
		},
		async loadPrint() {
			this.printLoading = true;
			const r = await call('get_appraisal', { name: this.printName }, { retry: true });
			this.printLoading = false;
			if (!r || !r.ok) {
				this.printError = (r && r.message) || '';
				return;
			}
			this.printDoc = r.appraisal;
			document.title = 'Appraisal · ' + (r.appraisal.employee_name || '');
		},
		doPrint() {
			window.print();
		},
	},
};
</script>

<style>
/* Load-bearing, like the set_style shim in www/hr/index.html. Frappe's esbuild
   only routes a bundle's CSS through frappe.dom.set_style() when the bundle
   contains an SFC <style> block (esbuild/frappe-vue-style.js, get_files); with
   none, the CSS is written to a file nothing links and /hr loads unstyled.
   Keep at least one real rule here. */
#hr-root {
	min-height: 100vh;
}
</style>
