<template>
	<div class="toast-wrap" role="status" aria-live="polite">
		<transition-group name="toast">
			<div v-for="t in state.toasts" :key="t.id" class="toast">
				<span class="msg">{{ t.message }}</span>
				<button v-if="t.action" type="button" @click="run(t)">{{ t.action.label }}</button>
			</div>
		</transition-group>
	</div>
</template>

<script>
import { state, dismissToast } from '../store.js';

export default {
	name: 'WfaToast',
	data() {
		return { state: state };
	},
	methods: {
		run(t) {
			dismissToast(t.id);
			if (t.action && typeof t.action.run === 'function') t.action.run();
		},
	},
};
</script>
