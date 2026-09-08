<template>
	<div>
		<div class="stephead">
			<div class="k">Section 3 · {{ state.cycle.competency_weight }}% of the overall rating</div>
			<h2>Behaviour and competencies</h2>
			<p>Only the competencies that apply to your role are shown.</p>
		</div>

		<p v-if="!defs.length" class="muted">No competencies are set on your form. Continue to the next section.</p>

		<div v-for="(c, i) in defs" :key="i" class="kra">
			<div class="def">
				<h3>
					{{ c.competency }}
					<span v-if="c.weightage" class="w">{{ c.weightage }}%</span>
				</h3>
				<dl>
					<template v-if="c.kra_label"><dt>Responsibility</dt><dd>{{ c.kra_label }}</dd></template>
					<template v-if="c.kpi"><dt>Measured by</dt><dd>{{ c.kpi }}</dd></template>
					<template v-if="c.target"><dt>Expected</dt><dd>{{ c.target }}</dd></template>
				</dl>
			</div>
			<div class="ans">
				<div class="field">
					<label>Self rating</label>
					<Rating
						v-model="rows[i].self"
						:label="'Self rating for ' + c.competency"
						:invalid="state.showErr && !rows[i].self"
					/>
					<div v-if="state.showErr && !rows[i].self" class="err-text">Pick a rating.</div>
				</div>
				<TextArea
					v-model="rows[i].evidence"
					label="Examples / evidence"
					placeholder="One or two concrete moments from the year."
					:min="20"
					:invalid="state.showErr && len(rows[i].evidence) < 20"
				/>
			</div>
		</div>
	</div>
</template>

<script>
import { state } from '../../store.js';
import TextArea from '../../ui/TextArea.vue';
import Rating from '../../ui/Rating.vue';

export default {
	name: 'StepComps',
	components: { TextArea, Rating },
	data() {
		return { state: state };
	},
	computed: {
		defs() {
			return state.definitions.comps || [];
		},
		rows() {
			return state.draft.comps;
		},
	},
	methods: {
		len(v) {
			return String(v || '').trim().length;
		},
	},
};
</script>
