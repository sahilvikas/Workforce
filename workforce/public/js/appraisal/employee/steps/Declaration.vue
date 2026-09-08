<template>
	<div>
		<div class="stephead">
			<div class="k">Section 12</div>
			<h2>Declaration and submit</h2>
			<p>
				Once you submit, the form locks and goes to {{ state.header.manager_name || 'your manager' }}.
				HR can reopen it if something needs correcting.
			</p>
		</div>

		<div class="card">
			<p>
				I confirm that the information provided in this self-appraisal is accurate and reflects my
				performance and contributions during the appraisal period to the best of my knowledge.
			</p>

			<div class="grid2 mt-3">
				<div class="field">
					<label for="wfa-decl-name">Type your full name as signature</label>
					<input
						id="wfa-decl-name"
						v-model="decl.name"
						class="input"
						:class="{ err: state.showErr && !matches }"
						:placeholder="state.header.employee_name"
						autocomplete="off"
					/>
					<div v-if="state.showErr && !matches" class="err-text">
						Must match “{{ state.header.employee_name }}” exactly.
					</div>
				</div>
				<div class="field">
					<label for="wfa-decl-date">Date</label>
					<input id="wfa-decl-date" class="input" :value="today" disabled />
				</div>
			</div>

			<label class="check mt-3">
				<input type="checkbox" :checked="!!Number(decl.accepted)" @change="decl.accepted = $event.target.checked ? 1 : 0" />
				I have read and agree to the declaration above.
			</label>

			<div class="mt-3 small" :class="complete ? 'muted' : 'err-text'">
				{{ complete ? 'All sections complete.' : incompleteText }}
			</div>
		</div>

		<div v-if="state.submitErrors.length" class="card mt-3">
			<h3>The server could not accept this yet</h3>
			<ul class="errlist">
				<li v-for="(e, i) in state.submitErrors" :key="i">
					{{ e.msg }}
					<button class="edit" type="button" @click="jump(e.step)">go to {{ labelFor(e.step) }}</button>
				</li>
			</ul>
		</div>
	</div>
</template>

<script>
import { state, STEPS, allValid, nameMatches, incompleteLabels, todayLong } from '../../store.js';

export default {
	name: 'StepDeclaration',
	emits: ['go'],
	data() {
		return { state: state };
	},
	computed: {
		decl() {
			return state.draft.decl;
		},
		matches() {
			return nameMatches();
		},
		complete() {
			return allValid();
		},
		today() {
			return todayLong();
		},
		incompleteText() {
			return 'Still incomplete: ' + incompleteLabels().join(', ') + '.';
		},
	},
	methods: {
		indexOf(key) {
			return STEPS.map(function (s) {
				return s.key;
			}).indexOf(String(key));
		},
		labelFor(key) {
			const i = this.indexOf(key);
			return i >= 0 ? STEPS[i].label : 'that section';
		},
		jump(key) {
			const i = this.indexOf(key);
			if (i >= 0) this.$emit('go', i);
		},
	},
};
</script>
