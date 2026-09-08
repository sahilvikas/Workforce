<template>
	<div v-if="state.screen === 'print' || state.screen === 'readonly'">
		<PrintView :can-go-back="state.screen === 'print'" @back="state.screen = 'done'" />
	</div>

	<div v-else class="emp">
		<header class="emp-top">
			<div class="wordmark">
				<i aria-hidden="true"></i><span class="brandlong">Cozy Corner Patios ·&nbsp;</span>Appraisal
			</div>
			<div class="row">
				<div
					v-if="state.screen === 'wizard'"
					class="saved"
					:class="saveClass"
					role="status"
					aria-live="polite"
				>
					<span class="dot" aria-hidden="true"></span><span class="txt">{{ saveText }}</span>
				</div>
				<Chip v-if="state.header.employee_name && state.screen !== 'login'">
					{{ state.header.employee_name }}
				</Chip>
			</div>
		</header>

		<!-- boot / loading -->
		<div v-if="state.screen === 'boot' || state.loading" class="screen" aria-busy="true">
			<div class="card">
				<Skeleton width="180px" height="20px" />
				<Skeleton width="100%" height="14px" mt="16px" />
				<Skeleton width="80%" height="14px" mt="8px" />
				<Skeleton width="100%" height="44px" mt="24px" radius="10px" />
			</div>
			<span class="sr-only">Loading your appraisal</span>
		</div>

		<NoLink v-else-if="state.screen === 'nolink'" />
		<Locked v-else-if="state.screen === 'locked'" :message="lockedMessage" />
		<Closed v-else-if="state.screen === 'closed'" />

		<div v-else-if="state.screen === 'error'" class="screen">
			<div class="card">
				<h2>We couldn’t load your appraisal</h2>
				<p class="mt-2">{{ state.loadError || 'Something went wrong. Please try again.' }}</p>
				<Button variant="primary" class="mt-3" @click="retry">Try again</Button>
			</div>
		</div>

		<Login v-else-if="state.screen === 'login'" @locked="onLocked" />
		<Welcome v-else-if="state.screen === 'welcome'" @start="start" />
		<Wizard v-else-if="state.screen === 'wizard'" />
		<Done v-else-if="state.screen === 'done'" @print="state.screen = 'print'" />

		<!-- session expired: the draft stays in memory behind this -->
		<div v-if="state.loginOverlay" class="modal-bg">
			<Login overlay :message="state.loginMessage" @locked="onLocked" />
		</div>

		<Toast />
	</div>
</template>

<script>
import { state, install, loadForm, saveLabel, settleSaves, toast, goToStep } from './store.js';

import Chip from './ui/Chip.vue';
import Button from './ui/Button.vue';
import Skeleton from './ui/Skeleton.vue';
import Toast from './ui/Toast.vue';

import Login from './employee/Login.vue';
import Welcome from './employee/Welcome.vue';
import Wizard from './employee/Wizard.vue';
import Done from './employee/Done.vue';
import PrintView from './employee/PrintView.vue';
import NoLink from './employee/NoLink.vue';
import Locked from './employee/Locked.vue';
import Closed from './employee/Closed.vue';

const STALE_AFTER = 20 * 60 * 1000;

export default {
	name: 'AppraisalApp',
	components: {
		Chip, Button, Skeleton, Toast,
		Login, Welcome, Wizard, Done, PrintView, NoLink, Locked, Closed,
	},
	data() {
		return {
			state: state,
			// Manager and HR live behind this switch; they arrive in a later prompt.
			door: 'employee',
			lockedMessage: '',
			hiddenSince: 0,
			buildChecked: false,
		};
	},
	computed: {
		saveText() {
			return saveLabel();
		},
		saveClass() {
			return {
				saving: state.saveState === 'saving',
				retrying: state.saveState === 'retrying',
				stopped: state.saveState === 'stopped',
			};
		},
	},
	created() {
		install();
		this.boot();
	},
	mounted() {
		document.addEventListener('visibilitychange', this.onVisibility);
	},
	beforeUnmount() {
		document.removeEventListener('visibilitychange', this.onVisibility);
	},
	methods: {
		async boot() {
			if (state.screen === 'nolink') return;
			if (!state.session) {
				state.screen = 'login';
				return;
			}
			// A stored session means a reload: go back where they were.
			const r = await loadForm({ resume: true });
			if (r && !r.ok && state.loginOverlay) {
				state.loginOverlay = false;
				state.screen = 'login';
			}
		},
		retry() {
			state.screen = 'boot';
			this.boot();
		},
		start(index) {
			goToStep(index || 0);
			state.screen = 'wizard';
			window.scrollTo({ top: 0, behavior: 'auto' });
		},
		onLocked(message) {
			this.lockedMessage = message || '';
			state.loginOverlay = false;
			state.screen = 'locked';
		},
		onVisibility() {
			if (document.visibilityState === 'hidden') {
				this.hiddenSince = Date.now();
				return;
			}
			if (this.hiddenSince && Date.now() - this.hiddenSince > STALE_AFTER) {
				this.checkBuild();
			}
			this.hiddenSince = 0;
		},
		// The page carries the bundle hash in a meta tag; if the deployed page now
		// carries a different one, offer a reload rather than taking one.
		async checkBuild() {
			if (this.buildChecked) return;
			const tag = document.querySelector('meta[name="wfa-build"]');
			const mine = tag ? tag.getAttribute('content') : '';
			if (!mine) return;
			let html;
			try {
				const res = await fetch('/appraisal', { cache: 'no-store', credentials: 'same-origin' });
				if (!res.ok) return;
				html = await res.text();
			} catch (e) {
				return;
			}
			const m = html.match(/<meta[^>]+name=["']wfa-build["'][^>]+content=["']([^"']*)["']/i);
			if (!m || !m[1] || m[1] === mine) return;
			this.buildChecked = true;
			await settleSaves();
			toast('A new version is ready — reload when convenient', {
				label: 'Reload',
				run: function () {
					window.location.reload();
				},
			}, true);
		},
	},
};
</script>

<style>
/* The expired-session login sits in the overlay without a second panel. */
.modal-bg .login {
	margin: 0;
	max-width: 440px;
}
</style>
