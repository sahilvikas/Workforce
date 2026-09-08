<template>
	<aside v-if="mode === 'rail'" class="rail">
		<div class="cycle">
			{{ state.cycle.name }}<br />{{ state.header.employee_name }}
			<template v-if="state.header.employee_id"> · {{ state.header.employee_id }}</template>
		</div>
		<ol ref="list">
			<div class="conn" :style="{ height: connPx + 'px' }" aria-hidden="true"></div>
			<li v-for="(s, i) in steps" :key="s.key" :class="{ done: isDone(i), cur: i === state.step }">
				<button
					type="button"
					class="st"
					:aria-current="i === state.step ? 'step' : null"
					@click="$emit('go', i)"
				>
					<span class="mk">
						<span v-if="isDone(i)" class="tk" aria-hidden="true">✓</span>
						<span v-else aria-hidden="true">{{ i + 1 }}</span>
					</span>
					<span class="lbl">{{ s.label }}</span>
					<span v-if="s.optional" class="opt">optional</span>
					<span class="sr-only">
						Step {{ i + 1 }} of {{ steps.length }}{{ isDone(i) ? ', complete' : '' }}
					</span>
				</button>
			</li>
		</ol>
		<slot />
	</aside>

	<div v-else class="mobile-prog">
		<div class="row between small">
			<b>{{ steps[state.step].label }}</b>
			<span class="muted">Step {{ state.step + 1 }} of {{ steps.length }}</span>
		</div>
		<div class="mob-bar">
			<i :style="{ width: ((state.step + 1) / steps.length) * 100 + '%' }"></i>
		</div>
	</div>
</template>

<script>
import { state, STEPS, stepComplete } from '../store.js';

export default {
	name: 'WfaStepper',
	props: {
		mode: { type: String, default: 'rail' },
	},
	emits: ['go'],
	data() {
		return { state: state, steps: STEPS, connPx: 0 };
	},
	computed: {
		// Recomputes whenever completion or the current step changes.
		signature() {
			return this.steps
				.map(function (s, i) {
					return stepComplete(i) ? '1' : '0';
				})
				.join('') + ':' + state.step;
		},
	},
	watch: {
		signature() {
			this.$nextTick(this.measure);
		},
	},
	mounted() {
		this.measure();
		window.addEventListener('resize', this.measure);
	},
	beforeUnmount() {
		window.removeEventListener('resize', this.measure);
	},
	methods: {
		isDone(i) {
			return stepComplete(i);
		},
		// The filled connector runs from the first marker to the last completed one.
		measure() {
			const list = this.$refs.list;
			if (!list) return;
			let last = -1;
			for (let i = 0; i < this.steps.length; i++) {
				if (this.isDone(i)) last = i;
			}
			if (last <= 0) {
				this.connPx = 0;
				return;
			}
			const items = list.querySelectorAll('li');
			if (!items.length || !items[last]) return;
			const top = items[0].getBoundingClientRect().top;
			const end = items[last].getBoundingClientRect();
			this.connPx = Math.max(0, end.top + end.height / 2 - top - 14);
		},
	},
};
</script>
