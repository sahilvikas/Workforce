<template>
	<div>
		<div class="stephead">
			<div class="k">Section 5</div>
			<h2>Key achievements</h2>
			<p>Up to four. At least one. The impact column is what leadership reads first.</p>
		</div>

		<div class="rows cols">
			<div v-for="(a, i) in rows" :key="i" class="rowcard">
				<div class="idx">Achievement {{ i + 1 }}</div>
				<div class="grid2">
					<TextArea v-model="a.what" label="Achievement / contribution" />
					<TextArea
						v-model="a.impact"
						label="Business / team impact"
						:invalid="state.showErr && !!len(a.what) && !len(a.impact)"
					/>
				</div>
			</div>
		</div>

		<div v-if="state.showErr && !anyComplete" class="err-text mt-2">
			Add at least one achievement with its impact.
		</div>
	</div>
</template>

<script>
import { state } from '../../store.js';
import TextArea from '../../ui/TextArea.vue';

export default {
	name: 'StepAchievements',
	components: { TextArea },
	data() {
		return { state: state };
	},
	computed: {
		rows() {
			return state.draft.achievements;
		},
		anyComplete() {
			const len = this.len;
			return this.rows.some(function (a) {
				return len(a.what) && len(a.impact);
			});
		},
	},
	methods: {
		len(v) {
			return String(v || '').trim().length;
		},
	},
};
</script>
