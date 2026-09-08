<template>
	<div class="screen">
		<div class="card">
			<h2>The self-appraisal window is closed</h2>
			<p v-if="state.windowNote" class="mt-2">{{ state.windowNote }}</p>
			<p v-else class="muted mt-2">
				This form is not open for editing right now. HR can tell you when it reopens.
			</p>
			<div v-if="dates" class="small muted mt-3">Self-appraisal window: {{ dates }}</div>
		</div>
	</div>
</template>

<script>
import { state, fmtRange } from '../store.js';

export default {
	name: 'WfaClosed',
	data() {
		return { state: state };
	},
	computed: {
		dates() {
			return fmtRange(state.cycle.self_start, state.cycle.self_end);
		},
	},
};
</script>
