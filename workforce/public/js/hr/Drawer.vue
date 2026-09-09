<template>
	<div>
		<div class="drawer-bg" @click="$emit('close')"></div>

		<div
			ref="panel"
			class="drawer"
			:class="{ wide: hr.drawerRead }"
			role="dialog"
			aria-modal="true"
			:aria-label="'Appraisal for ' + (doc.employee_name || 'this person')"
			tabindex="-1"
		>
			<div class="row between">
				<div>
					<h2>{{ doc.employee_name || hr.drawer.name }}</h2>
					<div class="small muted">{{ subline }}</div>
				</div>
				<button type="button" class="x" aria-label="Close" @click="$emit('close')">×</button>
			</div>

			<div v-if="hr.drawer.loading" class="mt-3" aria-busy="true">
				<Skeleton width="60%" height="16px" />
				<Skeleton width="100%" height="120px" mt="14px" radius="10px" />
				<Skeleton width="100%" height="90px" mt="12px" radius="10px" />
				<span class="sr-only">Loading the appraisal</span>
			</div>

			<div v-else-if="hr.drawer.error" class="card mt-3">
				<h3>We couldn’t open this appraisal</h3>
				<p class="mt-2">{{ hr.drawer.error }}</p>
				<Button variant="primary" class="mt-3" @click="reload">Try again</Button>
			</div>

			<template v-else>
				<div class="row mt-2 wrap">
					<Chip :tone="tone(doc.status)"><span class="dot" aria-hidden="true"></span>{{ doc.status }}</Chip>
					<Chip v-if="doc.self_weighted_score">self {{ Number(doc.self_weighted_score).toFixed(2) }}</Chip>
					<Chip v-if="doc.manager_weighted_score">manager {{ Number(doc.manager_weighted_score).toFixed(2) }}</Chip>
					<Chip v-if="doc.hr_final_rating" tone="moss">HR {{ doc.hr_final_rating }}</Chip>
					<Chip v-if="Number(doc.locked)" tone="brick">locked after 5 wrong passwords</Chip>
					<Chip v-if="Number(doc.reopen_count)" tone="gold">reopened {{ doc.reopen_count }}×</Chip>
				</div>

				<div class="stages mt-3">
					<div
						v-for="s in rail"
						:key="s"
						class="s"
						:class="{ done: idx(doc.status) > idx(s), cur: doc.status === s }"
					>
						<div class="mk">{{ idx(doc.status) > idx(s) ? '✓' : '' }}</div>
						<div>
							<div class="t">{{ s }}</div>
							<div class="d">{{ hints[s] }}</div>
						</div>
					</div>
				</div>

				<!-- what HR can do right now -->
				<div class="card" style="padding:14px">
					<h3 class="small">Actions available now</h3>

					<div v-if="doc.readiness_problems && doc.readiness_problems.length" class="notice gold mt-2">
						<b class="small">Not ready to send</b>
						<ul class="errlist" style="margin-top:4px">
							<li v-for="(p, i) in doc.readiness_problems" :key="i" style="color:inherit">{{ p }}</li>
						</ul>
					</div>

					<div class="row wrap mt-2">
						<template v-if="doc.status === 'Draft'">
							<Button size="sm" @click="fixing = !fixing">{{ fixing ? 'Hide KRAs' : 'Fix KRAs' }}</Button>
							<Button size="sm" variant="primary" @click="goSend">Go to Send</Button>
						</template>

						<template v-else-if="doc.status === 'Ready'">
							<Button size="sm" variant="primary" @click="goSend">Go to Send</Button>
						</template>

						<template v-else-if="doc.status === 'Sent' || doc.status === 'In Progress'">
							<Button size="sm" :disabled="busy" @click="remindEmployee">Send reminder</Button>
							<Button size="sm" :disabled="busy" @click="doResend">Resend password</Button>
							<Button v-if="Number(doc.locked)" size="sm" :disabled="busy" @click="doUnlock">Unlock</Button>
						</template>

						<template v-else-if="doc.status === 'Submitted'">
							<Button size="sm" variant="primary" :disabled="busy" @click="toManager">Mark reviewed → to manager</Button>
							<Button size="sm" variant="danger" @click="askReopen('employee')">Reopen for employee</Button>
						</template>

						<template v-else-if="doc.status === 'Manager Review'">
							<Button size="sm" :disabled="busy" @click="remindManager">Remind manager</Button>
							<Button size="sm" variant="danger" @click="askReopen('employee')">Reopen for employee</Button>
						</template>

						<template v-else-if="doc.status === 'Manager Submitted'">
							<Button size="sm" variant="primary" @click="askCalibrate">Calibrate</Button>
							<Button size="sm" variant="danger" @click="askReopen('manager')">Reopen for manager</Button>
						</template>

						<template v-else-if="doc.status === 'Calibrated'">
							<Button size="sm" variant="primary" :disabled="busy" @click="step('Final Approved')">Final approval recorded</Button>
						</template>

						<template v-else-if="doc.status === 'Final Approved'">
							<Button size="sm" variant="primary" :disabled="busy" @click="noting = !noting">Discussion held</Button>
						</template>

						<template v-else-if="doc.status === 'Discussed'">
							<Button size="sm" variant="primary" :disabled="busy" @click="step('Closed')">Close</Button>
						</template>

						<Button v-if="readable" size="sm" variant="ghost" @click="hr.drawerRead = !hr.drawerRead">
							{{ hr.drawerRead ? 'Hide the form' : 'Read the form' }}
						</Button>
						<Button v-if="readable" size="sm" variant="ghost" @click="openPrint">Print view</Button>
					</div>

					<!-- the discussion note is optional, so it is asked for inline -->
					<div v-if="noting && doc.status === 'Final Approved'" class="mt-3">
						<TextArea v-model="notes" label="Discussion notes (optional)" />
						<div class="row mt-2">
							<Button size="sm" variant="primary" :disabled="busy" @click="recordDiscussion">Record discussion</Button>
							<Button size="sm" variant="ghost" @click="noting = false">Cancel</Button>
						</div>
					</div>

					<!-- Draft rows can have their KRAs fixed in place -->
					<div v-if="fixing && doc.status === 'Draft'" class="mt-3">
						<h3 class="small">KRAs on this form</h3>
						<div v-for="(k, i) in defs" :key="i" class="tpl-row">
							<span class="idx">{{ i + 1 }}</span>
							<textarea v-model="k.kra" class="input" :aria-label="'KRA ' + (i + 1)" placeholder="KRA"></textarea>
							<input v-model="k.weightage" class="input" type="number" :aria-label="'Weight for KRA ' + (i + 1)" />
							<textarea v-model="k.kpi" class="input" :aria-label="'KPI for KRA ' + (i + 1)" placeholder="KPI"></textarea>
							<textarea v-model="k.target" class="input" :aria-label="'Target for KRA ' + (i + 1)" placeholder="Target"></textarea>
							<button type="button" class="x" :aria-label="'Remove KRA ' + (i + 1)" @click="defs.splice(i, 1)">×</button>
						</div>
						<div class="row mt-2">
							<Button size="sm" @click="defs.push({ kra: '', weightage: '', kpi: '', target: '' })">+ Add KRA</Button>
							<Button size="sm" variant="primary" :disabled="busy" @click="saveDefs">Save KRAs</Button>
							<span class="small muted">Weights total {{ defSum }} of {{ weights.kra || '—' }}</span>
						</div>
					</div>
				</div>

				<ReadView v-if="hr.drawerRead" :doc="doc" class="mt-3" />

				<div class="mt-3">
					<h3 class="small">Activity</h3>
					<div v-if="!activity.length" class="small muted mt-1">Nothing recorded yet.</div>
					<div v-for="(a, i) in activity" :key="i" class="small muted mt-1">
						{{ fmtShort(a.creation) }} · {{ a.owner }} · {{ a.content }}
					</div>
				</div>
			</template>
		</div>
	</div>
</template>

<script>
import {
	hr,
	STAGE_RAIL,
	STAGE_HINTS,
	statusTone,
	fmtShort,
	openDrawer,
	afterAction,
	advance,
	resend,
	unlock,
	remind,
	saveDefinitions,
	setView,
	toast,
} from './hrStore.js';
import { statusIndex } from '../appraisal/store.js';
import Button from '../appraisal/ui/Button.vue';
import Chip from '../appraisal/ui/Chip.vue';
import Skeleton from '../appraisal/ui/Skeleton.vue';
import TextArea from '../appraisal/ui/TextArea.vue';
import ReadView from './ReadView.vue';

export default {
	name: 'HrDrawer',
	components: { Button, Chip, Skeleton, TextArea, ReadView },
	emits: ['close', 'go'],
	data() {
		return { hr: hr, rail: STAGE_RAIL, hints: STAGE_HINTS, busy: false, fixing: false, noting: false, notes: '', defs: [], returnFocus: null };
	},
	computed: {
		doc() {
			return (hr.drawer && hr.drawer.data) || {};
		},
		subline() {
			return [this.doc.designation, this.doc.department, this.doc.manager_name ? 'reports to ' + this.doc.manager_name : '']
				.filter(Boolean)
				.join(' · ');
		},
		activity() {
			return this.doc.activity || [];
		},
		weights() {
			return this.doc.cycle_weights || {};
		},
		readable() {
			return statusIndex(this.doc.status) >= statusIndex('Submitted');
		},
		defSum() {
			return this.defs.reduce(function (a, k) {
				return a + (Number(k.weightage) || 0);
			}, 0);
		},
	},
	watch: {
		'hr.drawer.data'() {
			this.seedDefs();
		},
		fixing(open) {
			if (open) this.seedDefs();
		},
	},
	beforeMount() {
		this.returnFocus = document.activeElement;
	},
	mounted() {
		if (this.$refs.panel) this.$refs.panel.focus();
	},
	beforeUnmount() {
		if (this.returnFocus && this.returnFocus.focus) this.returnFocus.focus();
	},
	methods: {
		fmtShort: fmtShort,
		tone: statusTone,
		idx: statusIndex,
		reload() {
			openDrawer(hr.drawer.name);
		},
		seedDefs() {
			this.defs = (this.doc.kras || []).map(function (k) {
				return { kra: k.kra || '', weightage: k.weightage === null || k.weightage === undefined ? '' : k.weightage, kpi: k.kpi || '', target: k.target || '' };
			});
		},
		goSend() {
			this.$emit('close');
			setView('send');
		},
		openPrint() {
			window.open('/hr?print=' + encodeURIComponent(hr.drawer.name), '_blank', 'noopener');
		},
		async step(to, extra) {
			this.busy = true;
			const r = await advance(hr.drawer.name, to, extra);
			this.busy = false;
			await afterAction(r, 'Moved to ' + to);
		},
		toManager() {
			return this.step('Manager Review');
		},
		async recordDiscussion() {
			const notes = String(this.notes || '').trim();
			await this.step('Discussed', notes ? { notes: notes } : {});
			this.noting = false;
			this.notes = '';
		},
		askCalibrate() {
			hr.modal = { kind: 'calibrate', appraisal: hr.drawer.name, name: this.doc.employee_name };
		},
		askReopen(target) {
			hr.modal = { kind: 'reopen', appraisal: hr.drawer.name, name: this.doc.employee_name, target: target };
		},
		async doResend() {
			this.busy = true;
			const r = await resend(hr.drawer.name);
			this.busy = false;
			await afterAction(r, 'New password emailed');
		},
		async doUnlock() {
			this.busy = true;
			const r = await unlock(hr.drawer.name);
			this.busy = false;
			await afterAction(r, 'Unlocked, fresh link sent');
		},
		async remindEmployee() {
			this.busy = true;
			const r = await remind('employee', { appraisals: [hr.drawer.name] });
			this.busy = false;
			if (r && r.ok) {
				const row = (r.results || [])[0];
				toast(row && row.action === 'sent' ? 'Reminder sent' : (row && row.problems && row.problems[0]) || 'Nothing to send');
				return;
			}
			if (r && r.message) toast(r.message);
		},
		async remindManager() {
			this.busy = true;
			const r = await remind('manager', { appraisals: [hr.drawer.name] });
			this.busy = false;
			if (r && r.ok) {
				const row = (r.results || [])[0];
				toast(row && row.action === 'sent' ? 'Reminder sent to ' + (row.manager_name || 'the manager') : (row && row.problems && row.problems[0]) || 'Nothing to send');
				return;
			}
			if (r && r.message) toast(r.message);
		},
		async saveDefs() {
			this.busy = true;
			const rows = this.defs.map(function (k, i) {
				return { sno: i + 1, kra: k.kra, weightage: Number(k.weightage) || 0, kpi: k.kpi, target: k.target };
			});
			const r = await saveDefinitions(hr.drawer.name, { kras: rows });
			this.busy = false;
			if (r && r.ok) {
				await afterAction(r, 'KRAs saved · ' + (r.status || ''));
				return;
			}
			if (r && r.message) toast(r.message);
		},
	},
};
</script>
