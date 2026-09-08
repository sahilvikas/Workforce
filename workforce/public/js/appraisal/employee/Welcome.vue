<template>
	<div class="welcome">
		<Chip tone="moss">{{ state.cycle.name }}</Chip>
		<h1 class="mt-2">{{ heading }}</h1>
		<p class="lede">{{ lede }}</p>

		<div v-if="state.reopenCount" class="notice gold mt-3">
			HR reopened this form.<template v-if="state.reopenReason"> {{ state.reopenReason }}</template>
		</div>

		<div class="facts">
			<div class="card"><b>~35 min</b><span>Most people finish in one sitting. You don’t have to.</span></div>
			<div class="card"><b>Auto-saved</b><span>Every answer saves as you type. Close the tab any time.</span></div>
			<div class="card">
				<b>{{ submitBy }}</b><span>Submit by this date. HR will remind you.</span>
			</div>
		</div>

		<div class="row mt-4 wrap">
			<Button variant="primary" @click="$emit('start', resume ? state.step : 0)">
				{{ resume ? 'Continue where I left off' : 'Start' }}
			</Button>
			<Button v-if="resume" variant="ghost" @click="$emit('start', 0)">Start from the beginning</Button>
		</div>
	</div>
</template>

<script>
import { state, STEPS, fmtDate } from '../store.js';
import Button from '../ui/Button.vue';
import Chip from '../ui/Chip.vue';

export default {
	name: 'WfaWelcome',
	components: { Button, Chip },
	emits: ['start'],
	data() {
		return { state: state };
	},
	computed: {
		resume() {
			return !!(state.hasDraft || state.lastSavedOn);
		},
		firstName() {
			return String(state.header.employee_name || '').split(' ')[0] || '';
		},
		heading() {
			return this.resume
				? 'Welcome back, ' + this.firstName + '.'
				: 'Hello ' + this.firstName + ', this is your self-appraisal.';
		},
		lede() {
			if (this.resume) {
				const label = STEPS[state.step] ? STEPS[state.step].label : '';
				return 'You were on “' + label + '”. Everything you typed is saved.';
			}
			return 'Twelve short sections about the year: what you were asked to deliver, what you achieved, and where you want to go next. Your manager reads it before writing their review.';
		},
		submitBy() {
			return fmtDate(state.cycle.self_end) || '—';
		},
	},
};
</script>
