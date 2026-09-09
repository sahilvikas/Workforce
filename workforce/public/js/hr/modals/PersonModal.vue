<template>
	<Modal :title="person ? 'Edit person' : 'Add person'" @close="$emit('close')">
		<div class="grid2 mt-3">
			<Field v-model="form.employee_name" label="Full name" :error="err.employee_name" />
			<Field v-model="form.employee_id" label="Employee ID" :disabled="!!person" :error="err.employee_id" />
		</div>
		<div class="grid2 mt-2">
			<Field v-model="form.email" label="Email" type="email" />
			<Field v-model="form.date_of_joining" label="Date of joining" type="date" />
		</div>
		<div class="grid2 mt-2">
			<Field v-model="form.department" label="Department" />
			<Field v-model="form.designation" label="Designation" />
		</div>
		<div class="grid2 mt-2">
			<div class="field">
				<label for="wfa-pm-mgr">Reports to</label>
				<select id="wfa-pm-mgr" v-model="form.reporting_manager" class="input">
					<option value="">— nobody —</option>
					<option v-for="m in managerRows" :key="m.name" :value="m.name">{{ m.label }}</option>
				</select>
			</div>
			<div class="field">
				<label for="wfa-pm-tpl">Template</label>
				<select id="wfa-pm-tpl" v-model="form.template" class="input">
					<option value="">— none —</option>
					<option v-for="t in hr.templates" :key="t.name" :value="t.name">{{ t.template_name }}</option>
				</select>
			</div>
		</div>
		<div class="grid2 mt-2">
			<Field v-model="form.erp_employee" label="ERPNext Employee (optional)" />
			<div class="field">
				<label class="check" style="margin-top:26px">
					<input v-model="form.active" type="checkbox" />
					Active in this cycle
				</label>
			</div>
		</div>
		<div class="mt-2">
			<TextArea v-model="form.notes" label="Notes (HR only)" />
		</div>

		<label class="check mt-3">
			<input v-model="form.is_manager" type="checkbox" />
			Manages other people (gets a “My team” area)
		</label>
		<label class="check mt-2">
			<input v-model="form.is_ceo" type="checkbox" />
			CEO — reviews the managers, is not appraised
		</label>

		<div class="row mt-3" style="justify-content:flex-end">
			<Button @click="$emit('close')">Cancel</Button>
			<Button variant="primary" :disabled="busy" @click="save">
				{{ busy ? 'Saving…' : 'Save person' }}
			</Button>
		</div>
	</Modal>
</template>

<script>
import { hr, saveEmployee, managers, toast } from '../hrStore.js';
import Modal from '../../appraisal/ui/Modal.vue';
import Button from '../../appraisal/ui/Button.vue';
import Field from '../../appraisal/ui/Field.vue';
import TextArea from '../../appraisal/ui/TextArea.vue';

export default {
	name: 'PersonModal',
	components: { Modal, Button, Field, TextArea },
	props: {
		person: { type: Object, default: null },
	},
	emits: ['close'],
	data() {
		const p = this.person || {};
		return {
			hr: hr,
			busy: false,
			err: {},
			form: {
				employee_id: p.employee_id || '',
				employee_name: p.employee_name || '',
				email: p.email || '',
				department: p.department || '',
				designation: p.designation || '',
				date_of_joining: p.date_of_joining || '',
				reporting_manager: p.reporting_manager || '',
				template: p.template || '',
				erp_employee: p.erp_employee || '',
				notes: p.notes || '',
				active: p.name ? !!Number(p.active) : true,
				is_manager: !!Number(p.is_manager),
				is_ceo: !!Number(p.is_ceo),
			},
		};
	},
	computed: {
		// Nobody can report to themselves, so the current person is left out.
		managerRows() {
			const self = this.person && this.person.name;
			return managers().filter(function (m) {
				return m.name !== self;
			});
		},
	},
	methods: {
		async save() {
			this.err = {};
			if (!this.form.employee_id.trim()) this.err.employee_id = 'An employee ID is required.';
			if (!this.form.employee_name.trim()) this.err.employee_name = 'A name is required.';
			if (Object.keys(this.err).length) return;

			this.busy = true;
			const r = await saveEmployee(this.form.employee_id.trim(), {
				employee_name: this.form.employee_name,
				email: this.form.email,
				department: this.form.department,
				designation: this.form.designation,
				date_of_joining: this.form.date_of_joining,
				reporting_manager: this.form.reporting_manager,
				is_manager: this.form.is_manager ? 1 : 0,
				is_ceo: this.form.is_ceo ? 1 : 0,
				active: this.form.active ? 1 : 0,
				template: this.form.template,
				erp_employee: this.form.erp_employee,
				notes: this.form.notes,
			});
			this.busy = false;
			if (r && r.ok) {
				toast(r.created ? 'Person added' : 'Saved');
				this.$emit('close');
				return;
			}
			if (r && r.message) toast(r.message);
		},
	},
};
</script>
