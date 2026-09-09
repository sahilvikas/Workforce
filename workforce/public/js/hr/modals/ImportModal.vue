<template>
	<Modal title="Import people from CSV" @close="$emit('close')">
		<p class="muted small mt-1">
			Columns: employee_id, employee_name, email, department, designation, date_of_joining,
			reporting_manager, template, is_manager. Existing IDs are updated, new ones added. Nothing is
			sent.
		</p>

		<div v-if="!rows.length" class="card mt-3" style="border-style:dashed;text-align:center;padding:26px">
			<label class="btn" for="wfa-import-file">Choose a .csv file</label>
			<input
				id="wfa-import-file"
				ref="file"
				type="file"
				accept=".csv,text/csv"
				class="sr-only"
				@change="pick"
			/>
			<div class="xs muted mt-2">or</div>
			<Button variant="ghost" size="sm" class="mt-1" @click="blank">Download a blank template</Button>
		</div>

		<div v-else class="mt-3">
			<div class="row between wrap">
				<b class="small">{{ file }} · {{ rows.length }} row{{ rows.length === 1 ? '' : 's' }}</b>
				<Button variant="ghost" size="sm" @click="reset">Choose another file</Button>
			</div>

			<div v-if="parseError" class="err-text mt-2">{{ parseError }}</div>

			<div v-if="report" class="mt-3">
				<div class="row wrap">
					<Chip tone="moss">{{ report.new }} new</Chip>
					<Chip tone="sky">{{ report.updated }} updated</Chip>
					<Chip :tone="report.errors ? 'brick' : ''">{{ report.errors }} error{{ report.errors === 1 ? '' : 's' }}</Chip>
				</div>
				<div class="mt-2" style="max-height:220px;overflow:auto">
					<div v-for="(row, i) in report.report" :key="i" class="report-row">
						<span>
							<b>{{ row.employee_name || row.employee_id }}</b>
							<span v-if="row.errors && row.errors.length" class="small err-text"> — {{ row.errors.join('; ') }}</span>
						</span>
						<Chip :tone="row.action === 'error' ? 'brick' : row.action === 'create' ? 'moss' : 'sky'">{{ row.action }}</Chip>
					</div>
				</div>
			</div>
		</div>

		<div class="row mt-3" style="justify-content:flex-end">
			<Button @click="$emit('close')">Cancel</Button>
			<Button v-if="rows.length && !report" variant="primary" :disabled="busy" @click="preview">
				{{ busy ? 'Checking…' : 'Preview import' }}
			</Button>
			<Button
				v-else-if="report"
				variant="primary"
				:disabled="busy || report.errors > 0"
				@click="apply"
			>
				{{ busy ? 'Importing…' : 'Import ' + total + ' row' + (total === 1 ? '' : 's') }}
			</Button>
		</div>

		<p v-if="report && report.errors > 0" class="xs err-text mt-2">
			Fix the rows above and choose the file again — nothing is imported while there are errors.
		</p>
	</Modal>
</template>

<script>
import { importRoster, loadRoster, toast } from '../hrStore.js';
import { parseCsv, downloadCsv } from '../csv.js';
import Modal from '../../appraisal/ui/Modal.vue';
import Button from '../../appraisal/ui/Button.vue';
import Chip from '../../appraisal/ui/Chip.vue';

const COLUMNS = [
	'employee_id',
	'employee_name',
	'email',
	'department',
	'designation',
	'date_of_joining',
	'reporting_manager',
	'template',
	'is_manager',
];

export default {
	name: 'ImportModal',
	components: { Modal, Button, Chip },
	emits: ['close'],
	data() {
		return { file: '', rows: [], report: null, busy: false, parseError: '' };
	},
	computed: {
		total() {
			return this.report ? this.report.new + this.report.updated : 0;
		},
	},
	methods: {
		blank() {
			downloadCsv('appraisal-people-template.csv', [COLUMNS]);
		},
		reset() {
			this.file = '';
			this.rows = [];
			this.report = null;
			this.parseError = '';
		},
		pick(e) {
			const f = e.target.files && e.target.files[0];
			if (!f) return;
			this.file = f.name;
			this.report = null;
			this.parseError = '';
			const reader = new FileReader();
			reader.onload = () => {
				const parsed = parseCsv(String(reader.result || ''));
				if (parsed.headers.indexOf('employee_id') < 0) {
					this.rows = [];
					this.parseError = 'That file has no employee_id column.';
					return;
				}
				this.rows = parsed.rows.map(function (r) {
					const row = {};
					COLUMNS.forEach(function (c) {
						if (r[c] !== undefined) row[c] = r[c];
					});
					return row;
				});
				if (!this.rows.length) this.parseError = 'That file has a header but no rows.';
			};
			reader.onerror = () => {
				this.parseError = 'That file could not be read.';
			};
			reader.readAsText(f);
		},
		async preview() {
			this.busy = true;
			const r = await importRoster(this.rows, true);
			this.busy = false;
			if (!r || !r.ok) {
				if (r && r.message) toast(r.message);
				return;
			}
			this.report = r;
		},
		// Only ever called when the dry run came back with no errors.
		async apply() {
			this.busy = true;
			const r = await importRoster(this.rows, false);
			this.busy = false;
			if (!r || !r.ok) {
				if (r && r.message) toast(r.message);
				return;
			}
			await loadRoster();
			toast(r.message || (r.new || 0) + ' added, ' + (r.updated || 0) + ' updated');
			this.$emit('close');
		},
	},
};
</script>
