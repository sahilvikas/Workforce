<template>
	<div>
		<div class="stephead">
			<div class="k">Section 8</div>
			<h2>Overall self-assessment</h2>
			<p>Five questions. A few sentences each.</p>
		</div>

		<div class="rows narrow">
			<div v-for="q in questions" :key="q.key" class="rowcard">
				<TextArea
					v-model="answers[q.key]"
					:label="q.q"
					:invalid="state.showErr && !len(answers[q.key])"
				/>
			</div>
		</div>
	</div>
</template>

<script>
import { state, OVERALL_QUESTIONS } from '../../store.js';
import TextArea from '../../ui/TextArea.vue';

export default {
	name: 'StepOverall',
	components: { TextArea },
	data() {
		return { state: state, questions: OVERALL_QUESTIONS };
	},
	computed: {
		answers() {
			return state.draft.overall;
		},
	},
	methods: {
		len(v) {
			return String(v || '').trim().length;
		},
	},
};
</script>
