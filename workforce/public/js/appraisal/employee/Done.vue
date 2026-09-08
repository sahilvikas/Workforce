<template>
	<div class="done-wrap">
		<div class="tick">
			<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12.5l5 5L20 6.5" /></svg>
		</div>
		<h1>Submitted. Thank you{{ firstName ? ', ' + firstName : '' }}.</h1>
		<p class="muted mt-2">
			Your self-appraisal went to <b>{{ managerName }}</b><template v-if="time"> at {{ time }}</template>.
			<template v-if="state.header.email"> A copy is on its way to {{ state.header.email }}.</template>
		</p>

		<div v-if="scoreLine" class="row center mt-3">
			<Chip tone="moss">{{ scoreLine }}</Chip>
		</div>

		<div class="card mt-4" style="text-align:left">
			<h3>What happens next</h3>
			<div class="stages mt-2">
				<div
					v-for="(s, i) in stages"
					:key="i"
					class="s"
					:class="{ done: s.done, cur: s.cur }"
					:style="{ animationDelay: i * 60 + 'ms' }"
				>
					<div class="mk">{{ s.done ? '✓' : '' }}</div>
					<div>
						<div class="t">{{ s.title }}</div>
						<div class="d">{{ s.when }}</div>
					</div>
				</div>
			</div>
		</div>

		<div class="row mt-3 center wrap">
			<Button @click="$emit('print')">Download a copy</Button>
		</div>
	</div>
</template>

<script>
import { state, fmtRange, fmtTime } from '../store.js';
import Button from '../ui/Button.vue';
import Chip from '../ui/Chip.vue';

export default {
	name: 'WfaDone',
	components: { Button, Chip },
	emits: ['print'],
	data() {
		return { state: state };
	},
	computed: {
		r() {
			return state.result || {};
		},
		firstName() {
			return String(state.header.employee_name || '').split(' ')[0] || '';
		},
		managerName() {
			return this.r.manager_name || state.header.manager_name || 'your manager';
		},
		time() {
			return fmtTime(this.r.submitted_on || state.submittedOn);
		},
		scoreLine() {
			const s = this.r.self_weighted_score;
			if (s === undefined || s === null || s === '') return '';
			const rating = this.r.self_overall_rating;
			return 'Weighted self score ' + Number(s).toFixed(2) + ' / 5' + (rating ? ' · rated ' + rating : '');
		},
		stages() {
			const c = state.cycle || {};
			return [
				{ title: 'Self-appraisal submitted', when: 'Today', done: true },
				{ title: 'Manager review', when: fmtRange(c.manager_start, c.manager_end), cur: true },
				{ title: 'HR calibration & final approval', when: fmtRange(c.calibration_start, c.final_approval_end) },
				{ title: 'Discussion with your manager', when: fmtRange(c.discussion_start, c.discussion_end) },
			];
		},
	},
};
</script>
