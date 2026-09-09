<template>
	<div>
		<div class="head">
			<div>
				<h1>People</h1>
				<p>
					Who is being appraised, who reviews them, and which template they follow. The manager
					column decides where each form goes.
				</p>
			</div>
			<div class="row">
				<Button @click="openImport">Import CSV</Button>
				<Button variant="primary" @click="add">Add person</Button>
			</div>
		</div>

		<div class="filters">
			<label class="sr-only" for="wfa-people-q">Search name or ID</label>
			<input id="wfa-people-q" v-model="hr.q" class="input" placeholder="Search name or ID" />
			<label class="sr-only" for="wfa-people-dept">Department</label>
			<select id="wfa-people-dept" v-model="hr.fDept" class="input">
				<option value="">All departments</option>
				<option v-for="d in hr.departments" :key="d">{{ d }}</option>
			</select>
		</div>

		<div v-if="hr.rosterLoading && !hr.people.length" class="card" aria-busy="true">
			<Skeleton v-for="n in 6" :key="n" width="100%" height="18px" :mt="n === 1 ? '0' : '12px'" />
			<span class="sr-only">Loading people</span>
		</div>

		<div v-else-if="hr.rosterError" class="card">
			<h3>We couldn’t load the roster</h3>
			<p class="mt-2">{{ hr.rosterError }}</p>
			<Button variant="primary" class="mt-3" @click="reload">Try again</Button>
		</div>

		<div v-else class="card" style="padding:0;overflow:auto">
			<table class="table">
				<thead>
					<tr>
						<th scope="col">Name</th>
						<th scope="col">ID</th>
						<th scope="col">Department</th>
						<th scope="col">Designation</th>
						<th scope="col">Reports to</th>
						<th scope="col">Template</th>
						<th scope="col">Role</th>
						<th scope="col"><span class="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="p in rows" :key="p.name">
						<td>
							<b>{{ p.employee_name }}</b>
							<div class="xs muted">{{ p.email }}</div>
						</td>
						<td>{{ p.employee_id }}</td>
						<td>{{ p.department }}</td>
						<td>{{ p.designation }}</td>
						<td>{{ p.manager_name || '—' }}</td>
						<td>
							<label class="sr-only" :for="'tpl-' + p.name">Template for {{ p.employee_name }}</label>
							<select
								:id="'tpl-' + p.name"
								class="input"
								style="padding:5px 8px;font-size:13px"
								:value="p.template || ''"
								:disabled="busy === p.name"
								@change="setTemplate(p, $event.target.value)"
							>
								<option value="">— none —</option>
								<option v-for="t in hr.templates" :key="t.name" :value="t.name">{{ t.template_name }}</option>
							</select>
						</td>
						<td>
							<Chip :tone="roleTone(p)">{{ role(p) }}</Chip>
						</td>
						<td>
							<Button variant="ghost" size="sm" @click="edit(p)">Edit</Button>
						</td>
					</tr>
					<tr v-if="!rows.length">
						<td colspan="8" class="muted">Nobody matches those filters.</td>
					</tr>
				</tbody>
			</table>
		</div>
	</div>
</template>

<script>
import { hr, filteredPeople, roleOf, saveEmployee, loadRoster, toast } from '../hrStore.js';
import Button from '../../appraisal/ui/Button.vue';
import Chip from '../../appraisal/ui/Chip.vue';
import Skeleton from '../../appraisal/ui/Skeleton.vue';

export default {
	name: 'HrPeople',
	components: { Button, Chip, Skeleton },
	data() {
		return { hr: hr, busy: '' };
	},
	computed: {
		rows() {
			return filteredPeople();
		},
	},
	methods: {
		role: roleOf,
		reload() {
			loadRoster();
		},
		roleTone(p) {
			if (Number(p.is_ceo)) return 'ink';
			if (Number(p.is_manager)) return 'sky';
			return '';
		},
		add() {
			hr.modal = { kind: 'person', person: null };
		},
		edit(p) {
			hr.modal = { kind: 'person', person: p };
		},
		openImport() {
			hr.modal = { kind: 'import' };
		},
		// The inline template picker is a one-field save, not a modal.
		async setTemplate(p, value) {
			this.busy = p.name;
			const r = await saveEmployee(p.employee_id, { template: value || '' });
			this.busy = '';
			if (r && r.ok) {
				toast(p.employee_name + ' → ' + (this.templateLabel(value) || 'no template'));
				return;
			}
			if (r && r.message) toast(r.message);
		},
		templateLabel(name) {
			const t = hr.templates.filter(function (x) {
				return x.name === name;
			})[0];
			return t ? t.template_name : '';
		},
	},
};
</script>
