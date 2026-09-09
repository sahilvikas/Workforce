<template>
	<div>
		<Button variant="ghost" size="sm" @click="$emit('close')">← All templates</Button>

		<div class="card mt-2">
			<div class="grid2">
				<Field v-model="form.template_name" label="Template name" placeholder="e.g. SEO — Associate Manager" />
				<Field v-model="form.team" label="Team / group" placeholder="e.g. Marketing – Paid Search" />
			</div>
			<div class="grid2 mt-2">
				<TextArea v-model="form.notes" label="Notes (HR only)" />
				<div class="field">
					<label class="check" style="margin-top:26px">
						<button
							type="button"
							class="toggle"
							:class="{ on: !!Number(form.active) }"
							role="switch"
							:aria-checked="Number(form.active) ? 'true' : 'false'"
							aria-label="Active"
							@click="form.active = Number(form.active) ? 0 : 1"
						></button>
						Active
					</label>
					<div class="hint">Inactive templates stay on the people already using them but are not offered for new ones.</div>
				</div>
			</div>

			<!-- KRAs -->
			<div class="row between mt-4 wrap">
				<h3>KRAs / KPIs — {{ hr.kraWeight }}% section</h3>
				<Chip :tone="kraOk ? 'moss' : 'brick'">weights total {{ kraSum }} of {{ hr.kraWeight }}</Chip>
			</div>
			<div class="weightbar mt-2">
				<i
					v-for="(k, i) in form.kras"
					:key="i"
					:style="{ width: share(k.weightage), background: i % 2 ? 'var(--moss-2)' : 'var(--moss)', borderRight: '2px solid #fff' }"
				></i>
			</div>

			<div class="tpl-row mt-2" style="border-bottom:0;padding-bottom:0" aria-hidden="true">
				<span></span><span class="xs muted">KRA</span><span class="xs muted">Weight %</span>
				<span class="xs muted">KPI / measurement</span><span class="xs muted">Target / expected outcome</span><span></span>
			</div>
			<div v-for="(k, i) in form.kras" :key="'k' + i" class="tpl-row">
				<span class="idx">{{ i + 1 }}</span>
				<textarea
					v-model="k.kra"
					class="input"
					:class="{ err: showErr && !text(k.kra) }"
					:aria-label="'KRA ' + (i + 1)"
					placeholder="e.g. Organic revenue contribution"
				></textarea>
				<input v-model="k.weightage" class="input" type="number" :aria-label="'Weight for KRA ' + (i + 1)" />
				<textarea
					v-model="k.kpi"
					class="input"
					:class="{ err: showErr && !text(k.kpi) }"
					:aria-label="'KPI for KRA ' + (i + 1)"
					placeholder="What is measured, and where"
				></textarea>
				<textarea
					v-model="k.target"
					class="input"
					:class="{ err: showErr && !text(k.target) }"
					:aria-label="'Target for KRA ' + (i + 1)"
					placeholder="The number or outcome that means 3 – Meets expectations"
				></textarea>
				<span class="row" style="gap:0">
					<button type="button" class="x" :disabled="i === 0" :aria-label="'Move KRA ' + (i + 1) + ' up'" @click="move(i, -1)">↑</button>
					<button type="button" class="x" :disabled="i === form.kras.length - 1" :aria-label="'Move KRA ' + (i + 1) + ' down'" @click="move(i, 1)">↓</button>
					<button type="button" class="x" :aria-label="'Remove KRA ' + (i + 1)" @click="form.kras.splice(i, 1)">×</button>
				</span>
			</div>
			<Button size="sm" class="mt-2" @click="addKra">+ Add KRA</Button>

			<!-- competencies -->
			<div class="row between mt-4 wrap">
				<h3>Behaviour &amp; competencies — {{ hr.competencyWeight }}% section</h3>
				<Chip :tone="compOk ? 'moss' : 'gold'">weights total {{ compSum }} of {{ hr.competencyWeight }}</Chip>
			</div>
			<p class="xs muted">Switch off the ones that don’t apply to this team. Off rows are hidden from the employee.</p>
			<div v-for="(c, i) in form.competencies" :key="'c' + i" class="tpl-row" :style="{ opacity: Number(c.applicable) ? 1 : 0.45 }">
				<button
					type="button"
					class="toggle"
					style="margin-top:8px"
					:class="{ on: !!Number(c.applicable) }"
					role="switch"
					:aria-checked="Number(c.applicable) ? 'true' : 'false'"
					:aria-label="c.competency + ' applies'"
					@click="c.applicable = Number(c.applicable) ? 0 : 1"
				></button>
				<div>
					<b style="font-size:13.5px">{{ c.competency }}</b>
					<input
						v-model="c.kra_label"
						class="input mt-1"
						:disabled="!Number(c.applicable)"
						:aria-label="c.competency + ' responsibility label'"
						placeholder="Responsibility label"
					/>
				</div>
				<input v-model="c.weightage" class="input" type="number" :disabled="!Number(c.applicable)" :aria-label="c.competency + ' weight'" />
				<textarea v-model="c.kpi" class="input" :disabled="!Number(c.applicable)" :aria-label="c.competency + ' KPI'" placeholder="KPI / measurement"></textarea>
				<textarea v-model="c.target" class="input" :disabled="!Number(c.applicable)" :aria-label="c.competency + ' expected outcome'" placeholder="Expected outcome"></textarea>
				<span></span>
			</div>

			<!-- contributions -->
			<div class="row between mt-4 wrap">
				<h3>Additional contribution — {{ additionalWeight }}% section</h3>
				<span class="xs muted">Define a target only where the team has one; the rest stay open</span>
			</div>
			<div v-for="(c, i) in form.contributions" :key="'a' + i" class="tpl-row">
				<span></span>
				<b style="font-size:13.5px;padding-top:8px">{{ c.area }}</b>
				<input v-model="c.weightage" class="input" type="number" :aria-label="c.area + ' weight'" placeholder="–" />
				<textarea v-model="c.kpi" class="input" :aria-label="c.area + ' KPI'" placeholder="KPI (optional)"></textarea>
				<textarea v-model="c.target" class="input" :aria-label="c.area + ' target'" placeholder="Target (optional)"></textarea>
				<span></span>
			</div>

			<ul v-if="showErr && problems.length" class="errlist mt-3">
				<li v-for="(p, i) in problems" :key="i">{{ p }}</li>
			</ul>

			<div class="row between mt-4 wrap">
				<span class="small muted">
					Changes affect people you send to from now on. Already-sent forms keep their copy.
				</span>
				<div class="row">
					<Button v-if="form.name" :disabled="saving" @click="duplicate">Duplicate</Button>
					<Button variant="primary" :disabled="saving" @click="save">
						{{ saving ? 'Saving…' : 'Save template' }}
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import { hr, COMPETENCIES, CONTRIB_AREAS, saveTemplate, toast } from '../hrStore.js';
import Button from '../../appraisal/ui/Button.vue';
import Chip from '../../appraisal/ui/Chip.vue';
import Field from '../../appraisal/ui/Field.vue';
import TextArea from '../../appraisal/ui/TextArea.vue';

function blankCompetencies(existing) {
	const by = {};
	(existing || []).forEach(function (c) {
		by[c.competency] = c;
	});
	return COMPETENCIES.map(function (name) {
		const c = by[name] || {};
		return {
			competency: name,
			applicable: Number(c.applicable || 0),
			weightage: c.weightage === undefined || c.weightage === null ? '' : c.weightage,
			kra_label: c.kra_label || '',
			kpi: c.kpi || '',
			target: c.target || '',
		};
	});
}

function blankContributions(existing) {
	const by = {};
	(existing || []).forEach(function (c) {
		by[c.area] = c;
	});
	return CONTRIB_AREAS.map(function (area) {
		const c = by[area] || {};
		return {
			area: area,
			weightage: c.weightage === undefined || c.weightage === null ? '' : c.weightage,
			kpi: c.kpi || '',
			target: c.target || '',
		};
	});
}

export default {
	name: 'HrTemplateEditor',
	components: { Button, Chip, Field, TextArea },
	emits: ['close'],
	data() {
		const doc = hr.template || {};
		return {
			hr: hr,
			saving: false,
			showErr: false,
			form: {
				name: doc.name || '',
				template_name: doc.template_name || '',
				team: doc.team || '',
				notes: doc.notes || '',
				active: doc.name ? Number(doc.active || 0) : 1,
				kras: (doc.kras || []).map(function (k) {
					return { kra: k.kra || '', weightage: k.weightage === null || k.weightage === undefined ? '' : k.weightage, kpi: k.kpi || '', target: k.target || '' };
				}),
				competencies: blankCompetencies(doc.competencies),
				contributions: blankContributions(doc.contributions),
			},
		};
	},
	computed: {
		additionalWeight() {
			return (hr.cycle && hr.cycle.additional_weight) || 0;
		},
		kraSum() {
			return this.form.kras.reduce(function (a, k) {
				return a + (Number(k.weightage) || 0);
			}, 0);
		},
		compSum() {
			return this.form.competencies.reduce(function (a, c) {
				return a + (Number(c.applicable) ? Number(c.weightage) || 0 : 0);
			}, 0);
		},
		kraOk() {
			return this.kraSum === Number(hr.kraWeight || 0);
		},
		compOk() {
			return this.compSum === Number(hr.competencyWeight || 0);
		},
		strict() {
			return !!Number(hr.cycle && hr.cycle.strict_weights);
		},
		// Mirrors the server's readiness rule so the two never disagree.
		problems() {
			const out = [];
			if (!this.text(this.form.template_name)) out.push('Give the template a name.');
			if (!this.form.kras.length) out.push('Add at least one KRA.');
			if (!this.kraOk) out.push('KRA weights total ' + this.kraSum + ' — they must total ' + hr.kraWeight + '.');
			const self = this;
			this.form.kras.forEach(function (k, i) {
				if (!self.text(k.kra) || !self.text(k.kpi) || !self.text(k.target)) {
					out.push('KRA ' + (i + 1) + ' needs a name, a KPI and a target.');
				}
			});
			if (this.strict && !this.compOk) {
				out.push('Competency weights total ' + this.compSum + ' — they must total ' + hr.competencyWeight + '.');
			}
			return out;
		},
	},
	methods: {
		text(v) {
			return String(v || '').trim().length > 0;
		},
		share(w) {
			const total = Number(hr.kraWeight || 0) || 100;
			return Math.max(0, (Number(w || 0) / total) * 100) + '%';
		},
		addKra() {
			this.form.kras.push({ kra: '', weightage: '', kpi: '', target: '' });
		},
		move(i, delta) {
			const to = i + delta;
			if (to < 0 || to >= this.form.kras.length) return;
			const rows = this.form.kras;
			const row = rows[i];
			rows.splice(i, 1);
			rows.splice(to, 0, row);
		},
		values() {
			return {
				template_name: this.form.template_name,
				team: this.form.team,
				notes: this.form.notes,
				active: Number(this.form.active) ? 1 : 0,
				kras: this.form.kras.map(function (k, i) {
					return { sno: i + 1, kra: k.kra, weightage: Number(k.weightage) || 0, kpi: k.kpi, target: k.target };
				}),
				competencies: this.form.competencies.map(function (c) {
					return {
						competency: c.competency,
						applicable: Number(c.applicable) ? 1 : 0,
						weightage: Number(c.weightage) || 0,
						kra_label: c.kra_label,
						kpi: c.kpi,
						target: c.target,
					};
				}),
				contributions: this.form.contributions.map(function (c) {
					return { area: c.area, weightage: Number(c.weightage) || 0, kpi: c.kpi, target: c.target };
				}),
			};
		},
		async save() {
			this.showErr = true;
			if (this.problems.length) {
				toast('Fix the highlighted rows before saving');
				return;
			}
			this.saving = true;
			const r = await saveTemplate(this.form.name || null, this.values());
			this.saving = false;
			if (r && r.ok) {
				toast(r.created ? 'Template created' : 'Template saved');
				this.$emit('close');
				return;
			}
			if (r && r.message) toast(r.message);
		},
		// A duplicate is just a create carrying this template's rows.
		async duplicate() {
			const values = this.values();
			values.template_name = (values.template_name || 'Template') + ' (copy)';
			this.saving = true;
			const r = await saveTemplate(null, values);
			this.saving = false;
			if (r && r.ok) {
				toast('Duplicated');
				this.$emit('close');
				return;
			}
			if (r && r.message) toast(r.message);
		},
	},
};
</script>
