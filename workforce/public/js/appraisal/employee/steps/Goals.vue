<template>
	<div>
		<div class="stephead">
			<div class="k">Section 7</div>
			<h2>Development and future goals</h2>
			<p>Skills you want to build and what you need to build them.</p>
		</div>

		<div class="rows">
			<div v-for="(g, i) in rows" :key="i" class="rowcard">
				<div class="idx">Goal {{ i + 1 }}</div>
				<div class="grid3">
					<Field v-model="g.area" label="Development area / skill" />
					<TextArea v-model="g.action" label="Action / training required" />
					<TextArea v-model="g.outcome" label="Expected outcome" />
				</div>
			</div>
		</div>

		<div v-if="state.showErr && !anyComplete" class="err-text mt-2">Add at least one goal.</div>
	</div>
</template>

<script>
import { state } from '../../store.js';
import Field from '../../ui/Field.vue';
import TextArea from '../../ui/TextArea.vue';

export default {
	name: 'StepGoals',
	components: { Field, TextArea },
	data() {
		return { state: state };
	},
	computed: {
		rows() {
			return state.draft.goals;
		},
		anyComplete() {
			return this.rows.some(function (g) {
				return String(g.area || '').trim() && String(g.action || '').trim();
			});
		},
	},
};
</script>
