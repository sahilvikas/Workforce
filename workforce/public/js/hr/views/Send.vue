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
										<!-- A manager or the CEO with no template of their own is not
										     filling anything in: they get a reviews-only link. -->
										<Chip v-if="reviewsOnly(p)">Reviews only</Chip>
										<template v-else>
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
										</template>
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
							<span v-if="r.note" class="small muted"> — {{ r.note }}</span>
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

					<p v-if="!preview" class="small muted mt-2">
						Select someone to see the invitation they will get.
					</p>

					<template v-else>
						<p v-if="hr.sel.length > 1" class="xs muted mt-1">
							Preview for {{ preview.employee_name }}; each person gets their own.
						</p>

						<div v-if="previewLoading" class="mt-2" aria-busy="true">
							<Skeleton width="70%" height="12px" />
							<Skeleton width="50%" height="12px" mt="8px" />
							<Skeleton width="100%" height="220px" mt="12px" radius="10px" />
							<span class="sr-only">Loading the preview</span>
						</div>

						<div v-else-if="previewError" class="mt-2">
							<p class="err-text">{{ previewError }}</p>
							<Button size="sm" class="mt-2" @click="loadPreview">Try again</Button>
						</div>

						<div v-else-if="previewMailDoc" class="mt-2">
							<div class="mailprev" style="padding:0;overflow:hidden">
								<div class="from" style="padding:12px 14px;margin:0">
									To: {{ previewMailDoc.to || '—' }}<br />
									Subject: <b>{{ previewMailDoc.subject }}</b>
									<Chip v-if="variantLabel" style="margin-left:8px">{{ variantLabel }}</Chip>
								</div>
								<!-- The server's own render. allow-same-origin lets us measure the
								     document; without allow-scripts nothing in it can run. -->
								<iframe
									ref="frame"
									class="mailframe"
									sandbox="allow-same-origin"
									referrerpolicy="no-referrer"
									title="Invitation preview"
									:srcdoc="previewMailDoc.html"
									:style="{ height: frameHeight }"
									@load="fitFrame"
								></iframe>
							</div>
							<p class="xs muted mt-2">
								Exactly what the server would send. The password is masked and the link is a
								placeholder — nothing has been mailed.
							</p>
						</div>
					</template>
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
	needsTemplate,
	reviewsOnly,
	statusOf,
	statusTone,
	saveEmployee,
	prepare,
	send,
	previewMail,
	loadRoster,
	toast,
} from '../hrStore.js';
import Button from '../../appraisal/ui/Button.vue';
import Chip from '../../appraisal/ui/Chip.vue';
import Skeleton from '../../appraisal/ui/Skeleton.vue';

const VARIANTS = {
	employee: 'Self-appraisal',
	manager: 'Self-appraisal and team',
	manager_only: 'Reviews only',
};

export default {
	name: 'HrSend',
	components: { Button, Chip, Skeleton },
	emits: ['go'],
	data() {
		return {
			hr: hr,
			busyLabel: 'Sending…',
			previewMailDoc: null,
			previewLoading: false,
			previewError: '',
			previewFor: '',
			frameHeight: '260px',
			debounce: null,
		};
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
		// Only people filling in a form of their own need one.
		missingTemplate() {
			return this.selected.filter(function (p) {
				return needsTemplate(p) && !p.template;
			});
		},
		preview() {
			return this.selected[0] || null;
		},
		variantLabel() {
			return this.previewMailDoc ? VARIANTS[this.previewMailDoc.variant] || '' : '';
		},
	},
	watch: {
		// One render per settled selection, not one per click.
		preview: {
			immediate: true,
			handler(person) {
				if (this.debounce) clearTimeout(this.debounce);
				if (!person) {
					this.previewMailDoc = null;
					this.previewFor = '';
					return;
				}
				if (person.name === this.previewFor && this.previewMailDoc) return;
				this.debounce = setTimeout(this.loadPreview, 300);
			},
		},
	},
	beforeUnmount() {
		if (this.debounce) clearTimeout(this.debounce);
	},
	methods: {
		status: statusOf,
		tone: statusTone,
		reviewsOnly: reviewsOnly,
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

		async loadPreview() {
			const person = this.preview;
			if (!person) return;
			this.previewLoading = true;
			this.previewError = '';
			const r = await previewMail(person.name);
			// A newer selection may have overtaken this one mid-flight.
			if (this.preview !== person) return;
			this.previewLoading = false;
			if (!r || !r.ok) {
				this.previewMailDoc = null;
				this.previewError = (r && r.message) || 'Something went wrong. Please try again.';
				return;
			}
			this.previewFor = person.name;
			this.previewMailDoc = r;
			this.frameHeight = '260px';
		},
		fitFrame() {
			const frame = this.$refs.frame;
			if (!frame) return;
			try {
				const doc = frame.contentDocument;
				const h = doc && doc.body ? doc.body.scrollHeight : 0;
				if (h) this.frameHeight = Math.min(Math.max(h + 24, 160), 900) + 'px';
			} catch (e) {
				/* a browser that will not let us measure keeps the default height */
			}
		},

		/**
		 * Two steps, in order: create the records for anyone who has none — which
		 * for a manager or the CEO with no template is a Not Applicable,
		 * reviews-only record — then mail every selected row that is now Ready or
		 * Not Applicable.
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
					// A row that came out Ready or Not Applicable is about to be mailed;
					// it reports below rather than twice.
					if (row.action === 'created' && (row.status === 'Ready' || row.status === 'Not Applicable')) return;
					results.push({
						label: row.employee_name || row.employee,
						action: row.action === 'created' ? 'created · ' + row.status : row.action,
						tone: row.action === 'error' ? 'brick' : row.status === 'Draft' ? 'gold' : 'moss',
						problems: row.problems || [],
						showMonitor: row.status === 'Draft',
					});
				});
			}

			// The roster now knows every record name and its status.
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
				hr.sendResults = results.length
					? results
					: [{ label: 'Nothing to send', action: 'skipped', tone: 'gold', problems: ['No selected row reached Ready.'] }];
				return;
			}

			const reviewsOnlyNames = {};
			sendable.forEach(function (p) {
				if (p.appraisal_status === 'Not Applicable') reviewsOnlyNames[p.appraisal] = 1;
			});

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
					note: reviewsOnlyNames[row.appraisal] ? 'reviews-only link' : '',
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

<style>
.mailframe {
	width: 100%;
	border: 0;
	display: block;
	background: var(--paper);
	transition: height 0.2s var(--ease);
}
</style>
