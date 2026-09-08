<template>
	<div>
		<div class="stephead">
			<div class="k">Section 1</div>
			<h2>Your details</h2>
			<p>HR filled these in. Check they’re right — the whole appraisal is filed against them.</p>
		</div>

		<div class="card summary">
			<dl>
				<dt>Employee name</dt><dd>{{ h.employee_name || '—' }}</dd>
				<dt>Employee ID</dt><dd>{{ h.employee_id || '—' }}</dd>
				<dt>Department</dt><dd>{{ h.department || '—' }}</dd>
				<dt>Designation</dt><dd>{{ h.designation || '—' }}</dd>
				<dt>Date of joining</dt><dd>{{ fmtDate(h.date_of_joining) || '—' }}</dd>
				<dt>Reporting manager</dt><dd>{{ h.manager_name || '—' }}</dd>
				<dt>Appraisal period</dt><dd>{{ state.cycle.name || '—' }}</dd>
				<dt>Effective date</dt><dd>{{ fmtDate(state.cycle.effective_date) || '—' }}</dd>
			</dl>
		</div>

		<p class="small muted mt-2">Something wrong? Tell HR — you can keep going meanwhile.</p>

		<div v-if="state.cycle.instructions" class="card mt-3">
			<h3>Before you start</h3>
			<p class="small answer mt-1">{{ state.cycle.instructions }}</p>
		</div>
	</div>
</template>

<script>
import { state, fmtDate } from '../../store.js';

export default {
	name: 'StepDetails',
	data() {
		return { state: state };
	},
	computed: {
		h() {
			return state.header || {};
		},
	},
	methods: { fmtDate },
};
</script>
