<template>
	<div>
		<div class="head">
			<div>
				<h1>Send invitations</h1>
				<p>
					Each person gets a private link and a one-time password. Pick who, confirm the template,
					preview the mail, send.
				</p>
			</div>
		</div>

		<div class="two">
			<div>
				<div class="card">
					<div class="row between wrap">
						<h3>1. Who</h3>
						<div class="row">
							<label class="sr-only" for="wfa-send-dept">Department</label>
							<select id="wfa-send-dept" v-model="hr.sendDept" class="input" style="width:auto;padding:6px 10px">
								<option value="">Every department</option>
								<option v-for="d in hr.departments" :key="d">{{ d }}</option>
							</select>
							<Button size="sm" @click="selectAll">Select all not yet sent</Button>
						</div>
					</div>

					<div class="table-wrap mt-2">
						<table class="table">
							<thead>
								<tr>
									<th scope="col" style="width:30px"><span class="sr-only">Selected</span></th>
									<th scope="col">Name</th>
									<th scope="col">Reports to</th>
									<th scope="col">Template</th>
									<th scope="col">Status</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="p in rows" :key="p.name" class="click" @click="toggle(p)">
									<td>
										<input
											type="checkbox"
											:checked="hr.sel.indexOf(p.name) >= 0"
											:aria-label="'Select ' + p.employee_name"
											@click.stop="toggle(p)"
										/>
									</td>
									<td>
										<b>{{ p.employee_name }}</b>
										<div class="xs muted">{{ p.designation }}</div>
									</td>
									<td>{{ p.manager_name || '—' }}</td>
									<td>
										<label class="sr-only" :for="'stpl-' + p.name">Template for {{ p.employee_name }}</label>
										<select
											:id="'stpl-' + p.name"
											class="input"
											style="padding:4px 8px;font-size:13px"
											:value="p.template || ''"
											@click.stop
											@change="setTemplate(p, $event.target.value)"
										>
											<option value="">— pick —</option>
											<option v-for="t in hr.templates" :key="t.name" :value="t.name">{{ t.template_name }}</option>
										</select>
									</td>
									<td><Chip :tone="tone(status(p))">{{ status(p) }}</Chip></td>
								</tr>
								<tr v-if="!rows.length">
									<td colspan="5" class="muted">Everyone in this department has already been sent their link.</td>
								</tr>
							</tbody>
						</table>
					</div>

					<div v-if="missingTemplate.length" class="err-text mt-2">
						{{ missingTemplate.length }} selected
						{{ missingTemplate.length === 1 ? 'person has' : 'people have' }} no template — they can’t be sent.
					</div>
				</div>

				<div v-if="hr.sendResults" class="card mt-3">
					<h3>Result</h3>
					<div v-for="(r, i) in hr.sendResults" :key="i" class="report-row">
						<span>
							<b>{{ r.label }}</b>
							<span v-if="r.problems && r.problems.length" class="small muted"> — {{ r.problems.join('; ') }}</span>
						</span>
						<span class="row">
							<Chip :tone="r.tone">{{ r.action }}</Chip>
							<Button v-if="r.showMonitor" variant="ghost" size="sm" @click="$emit('go', 'mon')">Open in Monitor</Button>
						</span>
					</div>
				</div>
			</div>

			<div>
				<div class="card">
					<h3>2. Preview</h3>
					<div class="mailprev mt-2">
						<div class="from">
							From: Cozy Corner Patios HR &lt;{{ sender }}&gt; · To: {{ preview ? preview.email : '…' }}
						</div>
						<p><b>Your self-appraisal is ready — {{ cycleName }}</b></p>
						<p class="mt-2">Hi {{ preview ? first(preview.employee_name) : 'there' }},</p>
						<p class="mt-1">
							Your self-appraisal for the {{ cycleName }} is open until <b>{{ selfEnd }}</b>. It takes
							about 35 minutes and saves as you go.
						</p>
						<p class="mt-2"><span class="muted">Open my appraisal</span></p>
						<p class="mt-2">Your password: <span class="pw">••••••••</span></p>
						<p class="mt-2 muted xs">
							This link is personal to you. Please don’t forward it. If you have trouble, reply to
							this email.
						</p>
					</div>
					<p class="xs muted mt-2">The real password is generated per person when you send.</p>
				</div>

				<div class="card mt-3">
					<h3>3. Send</h3>
					<p class="small muted mt-1">
						{{ hr.sel.length }} selected. Each gets their own link and password; you can resend or
						unlock later from Monitor.
					</p>
					<Button
						variant="primary"
						class="mt-2"
						block
						:disabled="!hr.sel.length || missingTemplate.length > 0 || hr.sending"
						@click="run"
					>
						{{ hr.sending ? busyLabel : 'Send ' + hr.sel.length + ' invitation' + (hr.sel.length === 1 ? '' : 's') }}
					</Button>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import {
	hr,
	sendablePeople,
	statusOf,
	statusTone,
	fmtDate,
	saveEmployee,
	prepare,
	send,
	loadRoster,
	toast,
} from '../hrStore.js';
import Button from '../../appraisal/ui/Button.vue';
import Chip from '../../appraisal/ui/Chip.vue';

export default {
	name: 'HrSend',
	components: { Button, Chip },
	emits: ['go'],
	data() {
		return { hr: hr, busyLabel: 'Sending…' };
	},
	computed: {
		rows() {
			return sendablePeople();
		},
		selected() {
			return hr.people.filter(function (p) {
				return hr.sel.indexOf(p.name) >= 0;
			});
		},
		missingTemplate() {
			return this.selected.filter(function (p) {
				return !p.template && !Number(p.is_ceo);
			});
		},
		preview() {
			return this.selected[0] || this.rows[0] || null;
		},
		cycleName() {
			return (hr.cycle && (hr.cycle.cycle_name || hr.cycle.name)) || 'this cycle';
		},
		selfEnd() {
			return fmtDate(hr.cycle && hr.cycle.self_end) || 'the closing date';
		},
		sender() {
			return (hr.cycle && hr.cycle.sender_email) || 'the default outgoing account';
		},
	},
	methods: {
		status: statusOf,
		tone: statusTone,
		first(name) {
			return String(name || '').split(' ')[0];
		},
		toggle(p) {
			const i = hr.sel.indexOf(p.name);
			if (i >= 0) hr.sel.splice(i, 1);
			else hr.sel.push(p.name);
		},
		selectAll() {
			hr.sel = this.rows.map(function (p) {
				return p.name;
			});
		},
		async setTemplate(p, value) {
			const r = await saveEmployee(p.employee_id, { template: value || '' });
			if (r && !r.ok && r.message) toast(r.message);
		},
		/**
		 * Two steps, in order: create the appraisals for anyone who has none, then
		 * mail every selected row that is now Ready (or Not Applicable).
		 */
		async run() {
			hr.sending = true;
			hr.sendResults = null;
			const results = [];

			const needPrepare = this.selected.filter(function (p) {
				return !p.appraisal;
			});

			if (needPrepare.length) {
				this.busyLabel = 'Preparing…';
				const pr = await prepare(needPrepare.map(function (p) {
					return p.name;
				}));
				if (!pr || !pr.ok) {
					hr.sending = false;
					this.busyLabel = 'Sending…';
					if (pr && pr.message) toast(pr.message);
					return;
				}
				(pr.results || []).forEach(function (row) {
					if (row.action === 'created' && row.status === 'Ready') return; // will show as sent below
					results.push({
						label: row.employee_name || row.employee,
						action: row.action === 'created' ? 'created · ' + row.status : row.action,
						tone: row.action === 'error' ? 'brick' : row.status === 'Draft' ? 'gold' : 'moss',
						problems: row.problems || [],
						showMonitor: row.status === 'Draft',
					});
				});
			}

			// The roster now knows every appraisal name and its status.
			this.busyLabel = 'Sending…';
			await loadRoster();

			const sendable = hr.people
				.filter(function (p) {
					return hr.sel.indexOf(p.name) >= 0 && p.appraisal;
				})
				.filter(function (p) {
					return p.appraisal_status === 'Ready' || p.appraisal_status === 'Not Applicable';
				});

			if (!sendable.length) {
				hr.sending = false;
				hr.sendResults = results.length ? results : [{ label: 'Nothing to send', action: 'skipped', tone: 'gold', problems: ['No selected row reached Ready.'] }];
				return;
			}

			const sr = await send(sendable.map(function (p) {
				return p.appraisal;
			}));
			hr.sending = false;

			if (!sr || !sr.ok) {
				if (sr && sr.message) toast(sr.message);
				hr.sendResults = results;
				return;
			}
			(sr.results || []).forEach(function (row) {
				results.push({
					label: row.employee_name || row.appraisal,
					action: row.action,
					tone: row.action === 'sent' ? 'moss' : row.action === 'error' ? 'brick' : 'gold',
					problems: row.problems || [],
					showMonitor: false,
				});
			});
			hr.sendResults = results;
			hr.sel = [];
			await loadRoster();
			toast((sr.sent || 0) + ' invitation' + ((sr.sent || 0) === 1 ? '' : 's') + ' sent');
		},
	},
};
</script>
