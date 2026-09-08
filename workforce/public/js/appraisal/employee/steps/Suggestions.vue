<template>
	<div>
		<div class="stephead">
			<div class="k">Section 9 · optional</div>
			<h2>Organisational development</h2>
			<p>
				Where the company could work better. Skip any row. HR reads these separately from your
				rating.
			</p>
		</div>

		<div class="rows">
			<div v-for="(card, i) in cards" :key="card.key" class="rowcard">
				<div class="idx">{{ card.title }}</div>
				<div class="grid3">
					<TextArea v-model="rows[i].observation" :label="card.q1" />
					<TextArea v-model="rows[i].solution" :label="card.q2" />
					<TextArea v-model="rows[i].impact" :label="card.q3" />
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { state, SUGGESTION_CARDS } from '../../store.js';
import TextArea from '../../ui/TextArea.vue';

export default {
	name: 'StepSuggestions',
	components: { TextArea },
	data() {
		return { state: state, cards: SUGGESTION_CARDS };
	},
	computed: {
		rows() {
			return state.draft.suggestions;
		},
	},
};
</script>
