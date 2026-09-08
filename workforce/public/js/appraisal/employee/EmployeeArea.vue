<template>
	<div v-if="state.loading || !state.formLoaded" class="screen" aria-busy="true">
		<div v-if="state.loadError" class="card">
			<h2>We couldn’t load your appraisal</h2>
			<p class="mt-2">{{ state.loadError }}</p>
			<Button variant="primary" class="mt-3" @click="retry">Try again</Button>
		</div>
		<div v-else class="card">
			<Skeleton width="180px" height="20px" />
			<Skeleton width="100%" height="14px" mt="16px" />
			<Skeleton width="80%" height="14px" mt="8px" />
			<Skeleton width="100%" height="44px" mt="24px" radius="10px" />
			<span class="sr-only">Loading your appraisal</span>
		</div>
	</div>

	<Closed v-else-if="state.empScreen === 'closed'" />
	<PrintView v-else-if="state.empScreen === 'readonly'" :can-go-back="false" />
	<Welcome v-else-if="state.empScreen === 'welcome'" @start="start" />
	<Wizard v-else-if="state.empScreen === 'wizard'" />
	<Done v-else-if="state.empScreen === 'done'" @print="$emit('print')" />
</template>

<script>
import { state, goToStep, loadForm } from '../store.js';
import Button from '../ui/Button.vue';
import Skeleton from '../ui/Skeleton.vue';
import Welcome from './Welcome.vue';
import Wizard from './Wizard.vue';
import Done from './Done.vue';
import PrintView from './PrintView.vue';
import Closed from './Closed.vue';

export default {
	name: 'WfaEmployeeArea',
	components: { Button, Skeleton, Welcome, Wizard, Done, PrintView, Closed },
	emits: ['print'],
	data() {
		return { state: state };
	},
	created() {
		// A manager opening "My appraisal" for the first time loads it here.
		if (!state.formLoaded && !state.loading) loadForm({ resume: true });
	},
	methods: {
		retry() {
			loadForm({ resume: true });
		},
		start(index) {
			goToStep(index || 0);
			state.empScreen = 'wizard';
			window.scrollTo({ top: 0, behavior: 'auto' });
		},
	},
};
</script>
