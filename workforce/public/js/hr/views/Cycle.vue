<template>
	<div>
		<div class="head">
			<div>
				<h1>Cycle settings</h1>
				<p>
					Everything on the paper form’s header and footer lives here. Change a date and every
					email, reminder and window follows.
				</p>
			</div>
			<div class="row">
				<Button v-if="!creating" @click="startNew">New cycle</Button>
				<Button variant="primary" :disabled="saving || !dirty || !weightsOk" @click="save">
					{{ saving ? 'Saving…' : creating ? 'Create cycle' : 'Save changes' }}
				</Button>
			</div>
		</div>

		<div class="two">
			<div class="card">
				<h3>Identity</h3>
				<div class="grid2 mt-2">
					<Field v-model="form.cycle_name" label="Cycle name" />
					<Field v-model="form.revision_label" label="Revision label" />
				</div>
				<div class="grid2 mt-2">
					<Field v-model="form.effective_date" label="Effective date" type="date" />
					<Field v-model="form.closure_date" label="Closure date" type="date" />
				</div>
				<div class="grid2 mt-2">
					<div class="field">
						<label for="wfa-ceo">CEO (reviews the managers)</label>
						<select id="wfa-ceo" v-model="form.ceo" class="input">
							<option value="">— none —</option>
							<option v-for="p in ceos" :key="p.name" :value="p.name">{{ p.employee_name }}</option>
						</select>
					</div>
					<Field
						v-model="form.sender_email"
						label="Send emails from"
						hint="Leave blank to use the site's default outgoing account."
						placeholder="hr@cozycornerpatios.com"
					/>
				</div>
				<div class="grid2 mt-2">
					<div class="field">
						<label for="wfa-cyc-status">Status</label>
						<select id="wfa-cyc-status" v-model="form.status" class="input">
							<option>Draft</option>
							<option>Active</option>
							<option>Closed</option>
						</select>
					</div>
					<div class="field">
						<label class="check" style="margin-top:26px">
							<button
								type="button"
								class="toggle"
								:class="{ on: !!Number(form.strict_weights) }"
								role="switch"
								:aria-checked="Number(form.strict_weights) ? 'true' : 'false'"
								aria-label="Strict weights"
								@click="form.strict_weights = Number(form.strict_weights) ? 0 : 1"
							></button>
							Strict weights
						</label>
						<div class="hint">Competency weights must total the section weight before a template counts as ready.</div>
					</div>
				</div>

				<h3 class="mt-4">Section weights</h3>
				<div class="grid3 mt-2">
					<Field v-model="form.kra_weight" label="KRAs / KPIs" type="number" />
					<Field v-model="form.competency_weight" label="Behaviour &amp; competencies" type="number" />
					<Field v-model="form.additional_weight" label="Additional contribution" type="number" />
				</div>
				<div class="weightbar mt-2">
					<i :style="{ width: pct(form.kra_weight), background: 'var(--moss)' }"></i>
					<i :style="{ width: pct(form.competency_weight), background: 'var(--moss-2)' }"></i>
					<i :style="{ width: pct(form.additional_weight), background: '#93BCC8' }"></i>
				</div>
				<div class="small mt-1" :class="weightsOk ? 'muted' : 'err-text'">
					{{ weightTotal }} / 100{{ weightsOk ? '' : ' — must total 100' }}
				</div>

				<h3 class="mt-4">Instructions</h3>
				<div class="mt-2">
					<TextArea v-model="form.instructions" label="Shown at the top of the employee form" />
				</div>
				<div class="mt-2">
					<TextArea v-model="form.rating_guide" label="Rating guide" />
				</div>
			</div>

			<div class="card">
				<div class="row between">
					<h3>Stage windows</h3>
					<label class="check small">
						<button
							type="button"
							class="toggle"
							:class="{ on: !!Number(form.enforce_windows) }"
							role="switch"
							:aria-checked="Number(form.enforce_windows) ? 'true' : 'false'"
							aria-label="Enforce dates"
							@click="form.enforce_windows = Number(form.enforce_windows) ? 0 : 1"
						></button>
						Enforce dates
					</label>
				</div>
				<p class="xs muted mt-1">
					Off: people can act on any day, dates are informational. On: the form and review lock
					outside their window.
				</p>
				<div class="rows mt-3">
					<div v-for="w in windows" :key="w.key" class="grid2">
						<Field v-model="form[w.key + '_start']" :label="w.label + ' from'" type="date" />
						<Field v-model="form[w.key + '_end']" label="to" type="date" />
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { hr, CYCLE_WINDOWS, saveCycle, toast } from '../hrStore.js';
import Button from '../../appraisal/ui/Button.vue';
import Field from '../../appraisal/ui/Field.vue';
import TextArea from '../../appraisal/ui/TextArea.vue';

const FIELDS = [
	'cycle_name', 'revision_label', 'status', 'effective_date', 'closure_date', 'ceo',
	'sender_email', 'kra_weight', 'competency_weight', 'additional_weight',
	'strict_weights', 'enforce_windows', 'instructions', 'rating_guide',
];

function windowFields() {
	const out = [];
	CYCLE_WINDOWS.forEach(function (w) {
		out.push(w.key + '_start', w.key + '_end');
	});
	return out;
}

const ALL = FIELDS.concat(windowFields());

export default {
	name: 'HrCycle',
	components: { Button, Field, TextArea },
	data() {
		return { hr: hr, windows: CYCLE_WINDOWS, form: {}, original: {}, saving: false, creating: false };
	},
	computed: {
		ceos() {
			return hr.people.filter(function (p) {
				return Number(p.is_ceo);
			});
		},
		weightTotal() {
			return Number(this.form.kra_weight || 0) + Number(this.form.competency_weight || 0) + Number(this.form.additional_weight || 0);
		},
		weightsOk() {
			return this.weightTotal === 100;
		},
		dirty() {
			return this.creating || this.changedKeys().length > 0;
		},
	},
	watch: {
		'hr.cycle': {
			immediate: true,
			handler() {
				this.load();
			},
		},
	},
	methods: {
		load() {
			const doc = hr.cycle || {};
			const form = {};
			ALL.forEach(function (k) {
				form[k] = doc[k] === undefined || doc[k] === null ? '' : doc[k];
			});
			this.form = form;
			this.original = JSON.parse(JSON.stringify(form));
			this.creating = false;
		},
		startNew() {
			const form = {};
			ALL.forEach(function (k) {
				form[k] = '';
			});
			form.status = 'Draft';
			form.kra_weight = 70;
			form.competency_weight = 20;
			form.additional_weight = 10;
			form.enforce_windows = 0;
			form.strict_weights = 0;
			this.form = form;
			this.original = {};
			this.creating = true;
		},
		pct(v) {
			const total = this.weightTotal || 100;
			return Math.max(0, (Number(v || 0) / total) * 100) + '%';
		},
		changedKeys() {
			const form = this.form;
			const original = this.original;
			return ALL.filter(function (k) {
				return String(form[k] === undefined ? '' : form[k]) !== String(original[k] === undefined ? '' : original[k]);
			});
		},
		async save() {
			if (!this.weightsOk) {
				toast('The three weights must total 100.');
				return;
			}
			const changed = this.creating ? ALL.slice() : this.changedKeys();
			const values = {};
			const form = this.form;
			changed.forEach(function (k) {
				values[k] = form[k];
			});
			// The server validates the three together, so they always travel together.
			const touchesWeights = ['kra_weight', 'competency_weight', 'additional_weight'].some(function (k) {
				return k in values;
			});
			if (touchesWeights) {
				values.kra_weight = Number(form.kra_weight || 0);
				values.competency_weight = Number(form.competency_weight || 0);
				values.additional_weight = Number(form.additional_weight || 0);
			}
			if (!Object.keys(values).length) return;

			this.saving = true;
			const r = await saveCycle(this.creating ? null : hr.cycleName, values);
			this.saving = false;
			if (r && r.ok) {
				toast(this.creating ? 'Cycle created' : 'Cycle saved');
				this.creating = false;
				return;
			}
			if (r && r.message) toast(r.message);
		},
	},
};
</script>
