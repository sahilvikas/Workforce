<template>
	<div>
		<div class="stephead">
			<div class="k">Section 6</div>
			<h2>Challenges and improvement areas</h2>
			<p>Honest answers here are read as maturity, not weakness. At least one.</p>
		</div>

		<div class="rows cols">
			<div v-for="(c, i) in rows" :key="i" class="rowcard">
				<div class="idx">Challenge {{ i + 1 }}</div>
				<div class="grid2">
					<Field v-model="c.area" label="Area / challenge" />
					<TextArea v-model="c.what" label="What was the challenge?" />
				</div>
				<div class="grid2">
					<TextArea v-model="c.action" label="Action taken / learning" />
					<TextArea v-model="c.support" label="Support required" />
				</div>
			</div>
		</div>

		<div v-if="state.showErr && !anyComplete" class="err-text mt-2">Add at least one challenge.</div>
	</div>
</template>

<script>
import { state } from '../../store.js';
import Field from '../../ui/Field.vue';
import TextArea from '../../ui/TextArea.vue';

export default {
	name: 'StepChallenges',
	components: { Field, TextArea },
	data() {
		return { state: state };
	},
	computed: {
		rows() {
			return state.draft.challenges;
		},
		anyComplete() {
			return this.rows.some(function (c) {
				return String(c.area || '').trim() && String(c.what || '').trim();
			});
		},
	},
};
</script>
