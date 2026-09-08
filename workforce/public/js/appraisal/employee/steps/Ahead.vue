<template>
	<div>
		<div class="stephead">
			<div class="k">Section 10</div>
			<h2>Looking ahead — next cycle</h2>
			<p>This becomes the starting point for next year’s KRAs.</p>
		</div>

		<div class="rows">
			<div v-for="q in questions" :key="q.key" class="rowcard">
				<TextArea
					v-model="answers[q.key]"
					:label="q.q"
					:min="10"
					:invalid="state.showErr && len(answers[q.key]) < 10"
				/>
			</div>
		</div>
	</div>
</template>

<script>
import { state, AHEAD_QUESTIONS } from '../../store.js';
import TextArea from '../../ui/TextArea.vue';

export default {
	name: 'StepAhead',
	components: { TextArea },
	data() {
		return { state: state, questions: AHEAD_QUESTIONS };
	},
	computed: {
		answers() {
			return state.draft.ahead;
		},
	},
	methods: {
		len(v) {
			return String(v || '').trim().length;
		},
	},
};
</script>
