<template>
	<div>
		<div class="head">
			<div>
				<h1>{{ cycle.cycle_name || cycle.name }}</h1>
				<p>{{ subline }}</p>
			</div>
			<div class="row">
				<Button @click="$emit('go', 'send')">Send invitations</Button>
				<Button variant="primary" :disabled="reminding || !pending.length" @click="remindAll">
					{{ reminding ? 'Sending…' : 'Remind ' + pending.length + ' not submitted' }}
				</Button>
			</div>
		</div>

		<div v-if="hr.rosterLoading && !hr.people.length" class="kpis" aria-busy="true">
			<div v-for="n in 5" :key="n" class="kpi">
				<Skeleton width="40px" height="24px" />
				<Skeleton width="100%" height="12px" mt="8px" />
			</div>
		</div>

		<div v-else class="kpis">
			<div class="kpi">
				<b>{{ counts.invited }}</b><span>invited, not submitted</span>
				<div class="trend">{{ counts.started }} have started</div>
			</div>
			<div class="kpi">
				<b>{{ counts.withManager }}</b><span>waiting for manager</span>
				<div v-if="overdue.length" class="trend" style="color:var(--marigold)">
					{{ overdue.length }} over 3 days
				</div>
			</div>
			<div class="kpi"><b>{{ counts.toCalibrate }}</b><span>ready for calibration</span></div>
			<div class="kpi"><b>{{ counts.calibrated }}</b><span>calibrated or beyond</span></div>
			<div class="kpi">
				<b>{{ rate }}%</b><span>submission rate</span>
				<div class="trend">{{ counts.notSent }} not yet sent</div>
			</div>
		</div>

		<div class="two">
			<div class="card">
				<div class="row between">
					<h3>Where everyone is, by department</h3>
					<span class="xs muted">click a cell for names</span>
				</div>
				<div class="table-wrap">
					<table class="matrix mt-2">
						<thead>
							<tr>
								<th scope="col">Department</th>
								<th v-for="s in columns" :key="s" scope="col">{{ s }}</th>
								<th scope="col">Total</th>
							</tr>
						</thead>
						<tbody>
							<tr v-for="d in departments" :key="d">
								<td>{{ d }}</td>
								<td v-for="s in columns" :key="s" :class="[heatOf(d, s), { hit: cell(d, s) > 0 }]">
									<button
										v-if="cell(d, s) > 0"
										type="button"
										:aria-label="cell(d, s) + ' in ' + d + ', ' + s"
										@click="openCell(d, s)"
									>
										{{ cell(d, s) }}
									</button>
									<span v-else aria-hidden="true"></span>
								</td>
								<td style="background:none;font-weight:600">{{ deptTotal(d) }}</td>
							</tr>
							<tr v-if="!departments.length">
								<td colspan="9" class="muted">Nobody in this cycle yet.</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>

			<div class="card">
				<h3>Submissions per day</h3>
				<div class="bars" role="img" :aria-label="barsLabel">
					<div v-for="b in bars" :key="b.iso" class="b">
						<i :class="{ dim: !b.n }" :style="{ height: barHeight(b.n) }"></i>
						<span>{{ b.label }}</span>
					</div>
				</div>

				<div class="sec">
					<div class="sec-h">
						<h3>Needs a nudge</h3>
						<Chip tone="gold">{{ overdue.length + unopened.length }}</Chip>
					</div>
					<div v-for="p in overdue.slice(0, 3)" :key="'o' + p.name" class="small">
						• <b>{{ p.manager_name || 'Their manager' }}</b> hasn’t reviewed {{ p.employee_name }}
						({{ waiting(p) }} days)
					</div>
					<div v-for="p in unopened.slice(0, 3)" :key="'u' + p.name" class="small">
						• <b>{{ p.employee_name }}</b> hasn’t opened the link
					</div>
					<div v-if="!overdue.length && !unopened.length" class="small muted">
						Nothing waiting on a nudge.
					</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import {
	hr,
	SHORT_STATUSES,
	countBy,
	countAtLeast,
	scopePeople,
	notYetSent,
	submissionRate,
	overdueManager,
	neverOpened,
	notSubmitted,
	daysWaiting,
	cellPeople,
	heat,
	submissionsPerDay,
	daysLeft,
	fmtDate,
	remind,
	toast,
} from '../hrStore.js';
import Button from '../../appraisal/ui/Button.vue';
import Chip from '../../appraisal/ui/Chip.vue';
import Skeleton from '../../appraisal/ui/Skeleton.vue';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default {
	name: 'HrDashboard',
	components: { Button, Chip, Skeleton },
	emits: ['go', 'filter'],
	data() {
		return { hr: hr, columns: SHORT_STATUSES, reminding: false };
	},
	computed: {
		cycle() {
			return hr.cycle || {};
		},
		subline() {
			const bits = [];
			const from = fmtDate(this.cycle.self_start);
			const to = fmtDate(this.cycle.self_end);
			if (from && to) bits.push('Self-appraisal window ' + from + ' – ' + to);
			const left = daysLeft();
			if (left !== null) {
				bits.push(left < 0 ? 'closed ' + Math.abs(left) + ' days ago' : left + ' days left');
			}
			bits.push(scopePeople().length + ' people in scope');
			return bits.join(' · ');
		},
		counts() {
			return {
				invited: countBy('Sent') + countBy('In Progress'),
				started: countBy('In Progress'),
				withManager: countBy('Submitted') + countBy('Manager Review'),
				toCalibrate: countBy('Manager Submitted'),
				calibrated: countAtLeast('Calibrated'),
				notSent: scopePeople().filter(notYetSent).length,
			};
		},
		rate() {
			return submissionRate();
		},
		overdue() {
			return overdueManager();
		},
		unopened() {
			return neverOpened();
		},
		pending() {
			return notSubmitted();
		},
		departments() {
			const seen = {};
			scopePeople().forEach(function (p) {
				if (p.department) seen[p.department] = 1;
			});
			return Object.keys(seen).sort();
		},
		bars() {
			return submissionsPerDay(14).map(function (b) {
				return { iso: b.iso, n: b.n, label: b.day.getDate() + ' ' + MONTHS[b.day.getMonth()] };
			});
		},
		barsLabel() {
			const total = this.bars.reduce(function (a, b) {
				return a + b.n;
			}, 0);
			return total + ' submissions over the last 14 days';
		},
		peak() {
			return this.bars.reduce(function (m, b) {
				return Math.max(m, b.n);
			}, 0);
		},
	},
	methods: {
		waiting: daysWaiting,
		cell(dept, column) {
			return cellPeople(dept, column).length;
		},
		heatOf(dept, column) {
			return heat(this.cell(dept, column));
		},
		deptTotal(dept) {
			return scopePeople().filter(function (p) {
				return p.department === dept;
			}).length;
		},
		barHeight(n) {
			if (!this.peak) return '2px';
			return Math.max(2, Math.round((n / this.peak) * 118)) + 'px';
		},
		openCell(dept, column) {
			// "Not sent" and "Calibrated+" are buckets, not statuses; the department
			// filter alone is the honest thing to hand Monitor.
			const status = this.columns.indexOf(column) > 0 && column !== 'Calibrated+' ? column : '';
			this.$emit('filter', { department: dept, status: status });
		},
		async remindAll() {
			this.reminding = true;
			const r = await remind('employee', { cycle: hr.cycleName, all_pending: 1 });
			this.reminding = false;
			if (!r || !r.ok) {
				if (r && r.message) toast(r.message);
				return;
			}
			const results = r.results || [];
			const skipped = results.filter(function (x) {
				return x.action === 'skipped' || x.action === 'failed';
			});
			let line = (r.sent || 0) + ' sent';
			if (skipped.length) {
				const why = skipped[0].problems && skipped[0].problems[0];
				line += ', ' + skipped.length + ' skipped' + (why ? ' — ' + why : '');
			}
			toast(line);
		},
	},
};
</script>
