<template>
	<div>
		<div class="stephead">
			<div class="k">Section 4 · {{ state.cycle.additional_weight }}% of the overall rating</div>
			<h2>Additional contribution</h2>
			<p>Work beyond your KRAs. Fill only what applies; leave the rest blank.</p>
		</div>

		<p v-if="!defs.length" class="muted">No additional contribution areas are set on your form. Continue to the next section.</p>

		<div v-for="(c, i) in defs" :key="i" class="kra">
			<div class="def">
				<h3>
					{{ c.area }}
					<span v-if="c.weightage" class="w">{{ c.weightage }}%</span>
				</h3>
				<dl v-if="c.target"><dt>Expected</dt><dd>{{ c.target }}</dd></dl>
			</div>
			<div class="ans">
				<div class="grid2">
					<TextArea v-model="rows[i].contribution" label="Contribution / achievement" />
					<TextArea v-model="rows[i].impact" label="Impact / benefit" />
				</div>
				<div v-if="written(i)" class="field">
					<label>Self rating</label>
					<Rating
						v-model="rows[i].self"
						compact
						:label="'Self rating for ' + c.area"
						:invalid="state.showErr && !rows[i].self"
					/>
					<div v-if="state.showErr && !rows[i].self" class="err-text">
						You wrote something here — rate it too.
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { state } from '../../store.js';
import TextArea from '../../ui/TextArea.vue';
import Rating from '../../ui/Rating.vue';

export default {
	name: 'StepContrib',
	components: { TextArea, Rating },
	data() {
		return { state: state };
	},
	computed: {
		defs() {
			return state.definitions.contribs || [];
		},
		rows() {
			return state.draft.contribs;
		},
	},
	methods: {
		written(i) {
			const r = this.rows[i];
			return !!(String(r.contribution || '').trim() || String(r.impact || '').trim());
		},
	},
};
</script>
