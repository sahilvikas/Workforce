<template>
	<div>
		<div class="head">
			<div>
				<h1>Monitor</h1>
				<p>Every appraisal, one row each. Open a row to read it, move it through the stages, or reopen it.</p>
			</div>
		</div>

		<div class="filters">
			<label class="sr-only" for="wfa-mon-q">Search</label>
			<input id="wfa-mon-q" v-model="hr.q" class="input" placeholder="Search" />
			<label class="sr-only" for="wfa-mon-dept">Department</label>
			<select id="wfa-mon-dept" v-model="hr.fDept" class="input">
				<option value="">All departments</option>
				<option v-for="d in hr.departments" :key="d">{{ d }}</option>
			</select>
			<label class="sr-only" for="wfa-mon-status">Status</label>
			<select id="wfa-mon-status" v-model="hr.fStatus" class="input">
				<option value="">All statuses</option>
				<option value="Not sent">Not sent</option>
				<option v-for="s in statuses" :key="s">{{ s }}</option>
			</select>
			<label class="sr-only" for="wfa-mon-mgr">Manager</label>
			<select id="wfa-mon-mgr" v-model="hr.fMgr" class="input">
				<option value="">All managers</option>
				<option v-for="m in managerList" :key="m.name" :value="m.name">{{ m.label }}</option>
			</select>
			<Button v-if="filtered" variant="ghost" size="sm" @click="clear">Clear filters</Button>
		</div>

		<div v-if="hr.rosterLoading && !hr.people.length" class="card" aria-busy="true">
			<Skeleton v-for="n in 6" :key="n" width="100%" height="18px" :mt="n === 1 ? '0' : '12px'" />
			<span class="sr-only">Loading appraisals</span>
		</div>

		<div v-else class="card" style="padding:0;overflow:auto">
			<table class="table">
				<thead>
					<tr>
						<th scope="col">Name</th>
						<th scope="col">Department</th>
						<th scope="col">Reports to</th>
						<th scope="col">Status</th>
						<th scope="col">Self</th>
						<th scope="col">Manager</th>
						<th scope="col">Last activity</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="p in rows"
						:key="p.name"
						:class="{ click: !!p.appraisal }"
						:tabindex="p.appraisal ? 0 : null"
						:role="p.appraisal ? 'button' : null"
						@click="open(p)"
						@keydown.enter="open(p)"
						@keydown.space.prevent="open(p)"
					>
						<td>
							<b>{{ p.employee_name }}</b>
							<div class="xs muted">{{ p.designation }}</div>
						</td>
						<td>{{ p.department }}</td>
						<td>{{ p.manager_name || '—' }}</td>
						<td>
							<Chip :tone="tone(status(p))"><span class="dot" aria-hidden="true"></span>{{ status(p) }}</Chip>
							<Chip v-if="Number(p.locked)" tone="brick" style="margin-left:6px">locked</Chip>
						</td>
						<td>{{ score(p.self_weighted_score) }}</td>
						<td>{{ score(p.manager_weighted_score) }}</td>
						<td class="small muted">{{ fmtShort(p.last_activity) || '—' }}</td>
					</tr>
					<tr v-if="!rows.length">
						<td colspan="7" class="muted">Nothing matches those filters.</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script>
import {
	hr,
	HR_STATUSES,
	filteredPeople,
	statusOf,
	statusTone,
	managers,
	fmtShort,
	openDrawer,
	toast,
} from '../hrStore.js';
import Button from '../../appraisal/ui/Button.vue';
import Chip from '../../appraisal/ui/Chip.vue';
import Skeleton from '../../appraisal/ui/Skeleton.vue';

export default {
	name: 'HrMonitor',
	components: { Button, Chip, Skeleton },
	data() {
		return { hr: hr, statuses: HR_STATUSES };
	},
	computed: {
		rows() {
			return filteredPeople();
		},
		managerList() {
			return managers();
		},
		filtered() {
			return !!(hr.q || hr.fDept || hr.fStatus || hr.fMgr);
		},
	},
	methods: {
		status: statusOf,
		tone: statusTone,
		fmtShort: fmtShort,
		score(v) {
			return v === null || v === undefined || v === '' ? '–' : Number(v).toFixed(2);
		},
		clear() {
			hr.q = '';
			hr.fDept = '';
			hr.fStatus = '';
			hr.fMgr = '';
		},
		open(p) {
			if (!p.appraisal) {
				toast(p.employee_name + ' has no appraisal in this cycle yet');
				return;
			}
			openDrawer(p.appraisal);
		},
	},
};
</script>
