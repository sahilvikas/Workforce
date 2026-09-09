<template>
	<div class="toast-wrap" role="status" aria-live="polite">
		<transition-group name="toast">
			<div v-for="t in hr.toasts" :key="t.id" class="toast">
				<span class="msg">{{ t.message }}</span>
				<button v-if="t.action" type="button" @click="run(t)">{{ t.action.label }}</button>
			</div>
		</transition-group>
	</div>
</template>

<script>
// Same markup and motion as ui/Toast.vue; that one is bound to the appraisal
// store, this one to hrStore, so neither file has to learn about the other.
import { hr, dismissToast } from './hrStore.js';

export default {
	name: 'HrToast',
	data() {
		return { hr: hr };
	},
	methods: {
		run(t) {
			dismissToast(t.id);
			if (t.action && typeof t.action.run === 'function') t.action.run();
		},
	},
};
</script>
