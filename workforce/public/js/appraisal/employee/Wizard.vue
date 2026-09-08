<template>
	<div class="wizard">
		<Stepper mode="rail" @go="go">
			<div class="score">
				<div class="xs muted">Weighted self score so far</div>
				<b>{{ shown }}</b><span class="muted small"> / 5</span>
				<div class="bar"><i :style="{ width: (score / 5) * 100 + '%' }"></i></div>
				<div class="xs muted mt-1">{{ rated }} of {{ rateable }} ratings given</div>
			</div>
		</Stepper>

		<section class="pane">
			<Stepper mode="mobile" />

			<div v-if="state.reopenCount" class="notice gold pane-notice">
				HR reopened this form.<template v-if="state.reopenReason"> {{ state.reopenReason }}</template>
			</div>

			<div ref="pane" class="pane-scroll stepwrap">
				<transition :name="state.dir" mode="out-in">
					<component :is="stepComponent" :key="stepKey" @go="go" />
				</transition>
			</div>

			<div class="footbar">
				<Button variant="ghost" :disabled="state.step === 0" @click="back">Back</Button>
				<div class="row">
					<Button v-if="isOptional" variant="ghost" @click="next(true)">Skip</Button>
					<Button v-if="stepKey !== 'decl'" variant="primary" @click="next(false)">
						{{ stepKey === 'summary' ? 'Looks right, continue' : 'Save and continue' }}
					</Button>
					<Button
						v-else
						variant="primary"
						:disabled="!canSubmit || state.submitting"
						@click="doSubmit"
					>
						{{ state.submitting ? 'Submitting…' : 'Submit my appraisal' }}
					</Button>
				</div>
			</div>
		</section>
	</div>
</template>

<script>
import {
	state,
	STEPS,
	goToStep,
	stepValid,
	allValid,
	nameMatches,
	selfScore,
	ratedCount,
	rateableCount,
	submit,
	toast,
	flush,
} from '../store.js';
import Stepper from '../ui/Stepper.vue';
import Button from '../ui/Button.vue';

import Details from './steps/Details.vue';
import Kras from './steps/Kras.vue';
import Comps from './steps/Comps.vue';
import Contrib from './steps/Contrib.vue';
import Achievements from './steps/Achievements.vue';
import Challenges from './steps/Challenges.vue';
import Goals from './steps/Goals.vue';
import Overall from './steps/Overall.vue';
import Suggestions from './steps/Suggestions.vue';
import Ahead from './steps/Ahead.vue';
import Summary from './steps/Summary.vue';
import Declaration from './steps/Declaration.vue';

const COMPONENTS = {
	details: Details,
	kras: Kras,
	comps: Comps,
	contrib: Contrib,
	ach: Achievements,
	chal: Challenges,
	goals: Goals,
	overall: Overall,
	sugg: Suggestions,
	ahead: Ahead,
	summary: Summary,
	decl: Declaration,
};

export default {
	name: 'WfaWizard',
	components: { Stepper, Button },
	data() {
		return { state: state, shown: '–', raf: 0 };
	},
	computed: {
		stepKey() {
			return STEPS[state.step].key;
		},
		isOptional() {
			return !!STEPS[state.step].optional;
		},
		stepComponent() {
			return COMPONENTS[this.stepKey];
		},
		score() {
			return selfScore();
		},
		rated() {
			return ratedCount();
		},
		rateable() {
			return rateableCount();
		},
		canSubmit() {
			return allValid() && nameMatches() && !!Number(state.draft.decl.accepted);
		},
	},
	watch: {
		// The rail number counts to its new value rather than snapping to it.
		score: {
			immediate: true,
			handler(to, from) {
				this.animate(Number(from || 0), Number(to || 0));
			},
		},
	},
	beforeUnmount() {
		if (this.raf) cancelAnimationFrame(this.raf);
	},
	methods: {
		animate(from, to) {
			if (this.raf) cancelAnimationFrame(this.raf);
			if (!to) {
				this.shown = '–';
				return;
			}
			if (this.reduced()) {
				this.shown = to.toFixed(2);
				return;
			}
			const start = performance.now();
			const step = (now) => {
				const p = Math.min(1, (now - start) / 350);
				const eased = 1 - Math.pow(1 - p, 3);
				this.shown = (from + (to - from) * eased).toFixed(2);
				if (p < 1) this.raf = requestAnimationFrame(step);
			};
			this.raf = requestAnimationFrame(step);
		},
		reduced() {
			return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		},
		scrollTop() {
			window.scrollTo({ top: 0, behavior: this.reduced() ? 'auto' : 'smooth' });
		},
		go(i) {
			goToStep(i);
			this.scrollTop();
		},
		back() {
			goToStep(state.step - 1);
			this.scrollTop();
		},
		next(skip) {
			if (!skip && !stepValid(this.stepKey)) {
				state.showErr = true;
				toast('A few things need filling in before you continue');
				return;
			}
			state.showErr = false;
			flush();
			goToStep(state.step + 1);
			this.scrollTop();
		},
		async doSubmit() {
			await submit();
			this.scrollTop();
		},
	},
};
</script>

<style>
/* Keeps the outgoing pane from pushing the incoming one down mid-transition. */
.slide-leave-active,
.slideback-leave-active {
	position: absolute;
	width: 100%;
}
</style>
