<template>
	<div v-if="state.screen === 'print'">
		<PrintView @back="state.screen = 'app'" />
	</div>

	<div v-else class="emp">
		<header class="emp-top">
			<div class="wordmark">
				<i aria-hidden="true"></i><span class="brandlong">Cozy Corner Patios ·&nbsp;</span>Appraisal
			</div>
			<div class="row">
				<div v-if="indicator" class="saved" :class="indicatorClass" role="status" aria-live="polite">
					<span class="dot" aria-hidden="true"></span><span class="txt">{{ indicator }}</span>
				</div>
				<Chip v-if="displayName && state.screen !== 'login'">{{ displayName }}</Chip>
			</div>
		</header>

		<!-- boot -->
		<div v-if="state.screen === 'boot'" class="screen" aria-busy="true">
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

		<div v-else-if="state.screen === 'error'" class="screen">
			<div class="card">
				<h2>We couldn’t load your appraisal</h2>
				<p class="mt-2">{{ state.loadError || 'Something went wrong. Please try again.' }}</p>
				<Button variant="primary" class="mt-3" @click="retry">Try again</Button>
			</div>
		</div>

		<Login v-else-if="state.screen === 'login'" @locked="onLocked" @ok="afterLogin" />

		<!-- the app proper: manager shell, or the employee flow on its own -->
		<ManagerArea v-else-if="state.door === 'team'" @print="state.screen = 'print'" />
		<EmployeeArea v-else @print="state.screen = 'print'" />

		<!-- session expired: the draft stays in memory behind this -->
		<div v-if="state.loginOverlay" class="modal-bg">
			<Login overlay :message="state.loginMessage" @locked="onLocked" @ok="afterLogin" />
		</div>

		<Toast />
	</div>
</template>

<script>
import {
	state,
	install,
	loadForm,
	applyDoor,
	landingTab,
	rememberTab,
	saveLabel,
	saveClass,
	settleSaves,
	toast,
} from './store.js';
import { review, loadTeam, settleReview, flushReview } from './review.js';

import Chip from './ui/Chip.vue';
import Button from './ui/Button.vue';
import Skeleton from './ui/Skeleton.vue';
import Toast from './ui/Toast.vue';

import Login from './employee/Login.vue';
import EmployeeArea from './employee/EmployeeArea.vue';
import PrintView from './employee/PrintView.vue';
import NoLink from './employee/NoLink.vue';
import Locked from './employee/Locked.vue';
import ManagerArea from './manager/ManagerArea.vue';

const STALE_AFTER = 20 * 60 * 1000;

export default {
	name: 'AppraisalApp',
	components: {
		Chip, Button, Skeleton, Toast,
		Login, EmployeeArea, PrintView, NoLink, Locked, ManagerArea,
	},
	data() {
		return {
			state: state,
			review: review,
			lockedMessage: '',
			hiddenSince: 0,
			buildChecked: false,
		};
	},
	computed: {
		// Whichever form is in front of the person is the one whose save state matters.
		reviewing() {
			return state.door === 'team' && state.tab === 'team' && !!review.open;
		},
		indicator() {
			if (state.screen !== 'app') return '';
			if (this.reviewing) return review.loaded ? saveLabel(review) : '';
			if (state.tab === 'team' && state.door === 'team') return '';
			return state.empScreen === 'wizard' ? saveLabel(state) : '';
		},
		indicatorClass() {
			return saveClass(this.reviewing ? review : state);
		},
		displayName() {
			return state.header.employee_name || review.managerName || '';
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
			// A stored session means a reload: work out the door from the server
			// rather than trusting anything cached in the browser.
			const t = await loadTeam();
			if (state.loginOverlay) {
				state.loginOverlay = false;
				state.screen = 'login';
				return;
			}
			if (t && t.ok) {
				applyDoor({ is_manager: 1, has_own_form: t.has_own_form });
				if (state.hasOwnForm) await loadForm({ resume: true });
				rememberTab(landingTab());
				state.screen = 'app';
				return;
			}
			if (t && t.reason === 'not_manager') {
				applyDoor({ is_manager: 0, is_ceo: 0 });
				const r = await loadForm({ resume: true });
				state.screen = r && r.ok ? 'app' : 'error';
				return;
			}
			state.loadError = (t && t.message) || '';
			state.screen = 'error';
		},

		// After a password is accepted we already know the door from the payload.
		async afterLogin(e) {
			const r = (e && e.payload) || {};
			if (e && e.overlay) {
				// Nothing to route: the person is back where they were. Push whatever
				// was typed while the session was dead.
				flushReview();
				return;
			}
			applyDoor({ status: r.status, is_manager: r.is_manager, is_ceo: r.is_ceo });
			if (state.door === 'team') {
				rememberTab(landingTab());
				state.screen = 'app';
				loadTeam();
				return;
			}
			const form = await loadForm({ resume: !!r.has_draft });
			state.screen = form && form.ok ? 'app' : 'error';
		},

		retry() {
			state.screen = 'boot';
			this.boot();
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
			await settleReview();
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
