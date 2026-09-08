<template>
	<div>
		<div class="stephead">
			<div class="k">Section 2 · {{ state.cycle.kra_weight }}% of the overall rating</div>
			<h2>KRAs and KPIs</h2>
			<p>
				For each area: what actually happened, how you rate it, and the evidence behind the
				rating. Numbers beat adjectives.
			</p>
		</div>

		<p v-if="!defs.length" class="muted">No KRAs are set on your form. Continue to the next section.</p>

		<div v-for="(k, i) in defs" :key="i" class="kra">
			<div class="def">
				<h3>
					{{ i + 1 }}. {{ k.kra }}
					<span v-if="k.weightage" class="w">{{ k.weightage }}%</span>
				</h3>
				<dl>
					<dt>Measured by</dt><dd>{{ k.kpi }}</dd>
					<dt>Target</dt><dd>{{ k.target }}</dd>
				</dl>
			</div>
			<div class="ans">
				<TextArea
					v-model="rows[i].actual"
					label="Actual achievement / result"
					placeholder="What you delivered against the target, with figures where you have them."
					:min="20"
					:invalid="state.showErr && len(rows[i].actual) < 20"
				/>
				<div class="field">
					<label :id="'kra-r-' + i">Self rating</label>
					<Rating
						v-model="rows[i].self"
						:label="'Self rating for ' + k.kra"
						:invalid="state.showErr && !rows[i].self"
					/>
					<div v-if="state.showErr && !rows[i].self" class="err-text">Pick a rating from 1 to 5.</div>
				</div>
				<TextArea
					v-model="rows[i].evidence"
					label="Comments / evidence"
					placeholder="Reports, dashboards, dates, links — anything your manager can check."
					:min="30"
					:invalid="state.showErr && len(rows[i].evidence) < 30"
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
	name: 'StepKras',
	components: { TextArea, Rating },
	data() {
		return { state: state };
	},
	computed: {
		defs() {
			return state.definitions.kras || [];
		},
		rows() {
			return state.draft.kras;
		},
	},
	methods: {
		len(v) {
			return String(v || '').trim().length;
		},
	},
};
</script>
