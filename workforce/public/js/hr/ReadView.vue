<template>
	<div class="print-page">
		<h1>Self-appraisal — {{ d.employee_name }}</h1>
		<p class="small muted mt-1">
			{{ d.cycle_name || d.cycle }}
			<template v-if="d.submitted_on"> · submitted {{ fmtDate(d.submitted_on) }}</template>
			<template v-if="d.status"> · {{ d.status }}</template>
		</p>

		<div class="pblock">
			<h2>1. Employee details</h2>
			<dl>
				<dt>Employee name</dt><dd>{{ d.employee_name || '—' }}</dd>
				<dt>Employee ID</dt><dd>{{ d.employee_id || '—' }}</dd>
				<dt>Department</dt><dd>{{ d.department || '—' }}</dd>
				<dt>Designation</dt><dd>{{ d.designation || '—' }}</dd>
				<dt>Date of joining</dt><dd>{{ fmtDate(d.date_of_joining) || '—' }}</dd>
				<dt>Reporting manager</dt><dd>{{ d.manager_name || '—' }}</dd>
			</dl>
		</div>

		<div class="pblock">
			<h2>2. KRAs and KPIs</h2>
			<div v-for="(k, i) in list('kras')" :key="i" style="margin-bottom:14px">
				<b>{{ k.sno || i + 1 }}. {{ k.kra }}<template v-if="k.weightage"> · {{ k.weightage }}%</template></b>
				<dl>
					<dt>Measured by</dt><dd>{{ k.kpi || '—' }}</dd>
					<dt>Target</dt><dd>{{ k.target || '—' }}</dd>
					<dt>Actual result</dt><dd class="answer">{{ k.actual_result || '—' }}</dd>
					<dt>Self rating</dt><dd>{{ rating(k.self_rating) }}</dd>
					<dt>Employee comments</dt><dd class="answer">{{ k.employee_comments || '—' }}</dd>
					<template v-if="k.manager_rating || k.manager_comments">
						<dt>Manager rating</dt><dd>{{ rating(k.manager_rating) }}</dd>
						<dt>Manager comments</dt><dd class="answer">{{ k.manager_comments || '—' }}</dd>
					</template>
				</dl>
			</div>
			<p v-if="!list('kras').length" class="small muted">None</p>
		</div>

		<div class="pblock">
			<h2>3. Behaviour and competencies</h2>
			<div v-for="(c, i) in applicableComps" :key="i" style="margin-bottom:14px">
				<b>{{ c.competency }}<template v-if="c.weightage"> · {{ c.weightage }}%</template></b>
				<dl>
					<dt v-if="c.kra_label">Responsibility</dt><dd v-if="c.kra_label">{{ c.kra_label }}</dd>
					<dt>Expected</dt><dd>{{ c.target || '—' }}</dd>
					<dt>Self rating</dt><dd>{{ rating(c.self_rating) }}</dd>
					<dt>Evidence</dt><dd class="answer">{{ c.evidence || '—' }}</dd>
					<template v-if="c.manager_rating || c.manager_comments">
						<dt>Manager rating</dt><dd>{{ rating(c.manager_rating) }}</dd>
						<dt>Manager comments</dt><dd class="answer">{{ c.manager_comments || '—' }}</dd>
					</template>
				</dl>
			</div>
			<p v-if="!applicableComps.length" class="small muted">None</p>
		</div>

		<div class="pblock">
			<h2>4. Additional contribution</h2>
			<div v-for="(c, i) in list('contributions')" :key="i" style="margin-bottom:14px">
				<b>{{ c.area }}</b>
				<dl>
					<dt>Contribution</dt><dd class="answer">{{ c.contribution || '—' }}</dd>
					<dt>Impact</dt><dd class="answer">{{ c.impact || '—' }}</dd>
					<dt>Self rating</dt><dd>{{ rating(c.self_rating) }}</dd>
					<template v-if="c.manager_rating">
						<dt>Manager rating</dt><dd>{{ rating(c.manager_rating) }}</dd>
					</template>
				</dl>
			</div>
			<p v-if="!list('contributions').length" class="small muted">None</p>
		</div>

		<div class="pblock">
			<h2>5. Key achievements</h2>
			<dl>
				<template v-for="(a, i) in list('achievements')" :key="i">
					<template v-if="a.achievement">
						<dt>Achievement {{ a.sno || i + 1 }}</dt>
						<dd class="answer">{{ a.achievement }}<br /><span class="muted">Impact: {{ a.impact || '—' }}</span></dd>
					</template>
				</template>
			</dl>
			<p v-if="!any('achievements', 'achievement')" class="small muted">None</p>
		</div>

		<div class="pblock">
			<h2>6. Challenges and improvement areas</h2>
			<dl>
				<template v-for="(c, i) in list('challenges')" :key="i">
					<template v-if="c.area || c.challenge">
						<dt>{{ c.area || 'Challenge ' + (i + 1) }}</dt>
						<dd class="answer">
							{{ c.challenge }}
							<template v-if="c.action_taken"><br />Action: {{ c.action_taken }}</template>
							<template v-if="c.support_required"><br />Support required: {{ c.support_required }}</template>
						</dd>
					</template>
				</template>
			</dl>
			<p v-if="!any('challenges', 'area')" class="small muted">None</p>
		</div>

		<div class="pblock">
			<h2>7. Development and future goals</h2>
			<dl>
				<template v-for="(g, i) in list('goals')" :key="i">
					<template v-if="g.development_area || g.action_required">
						<dt>{{ g.development_area || 'Goal ' + (i + 1) }}</dt>
						<dd class="answer">
							{{ g.action_required }}
							<template v-if="g.expected_outcome"><br />Expected outcome: {{ g.expected_outcome }}</template>
						</dd>
					</template>
				</template>
			</dl>
			<p v-if="!any('goals', 'development_area')" class="small muted">None</p>
		</div>

		<div class="pblock">
			<h2>8. Overall self-assessment</h2>
			<dl>
				<template v-for="q in overallQs" :key="q.key">
					<dt>{{ q.q }}</dt><dd class="answer">{{ d[q.field] || '—' }}</dd>
				</template>
			</dl>
		</div>

		<div class="pblock">
			<h2>9. Organisational development</h2>
			<dl>
				<template v-for="(s, i) in list('suggestions')" :key="i">
					<template v-if="s.observation || s.solution || s.impact">
						<dt>{{ cardTitle(s.prompt_key) }}</dt>
						<dd class="answer">
							{{ s.observation }}
							<template v-if="s.solution"><br />{{ s.solution }}</template>
							<template v-if="s.impact"><br />{{ s.impact }}</template>
						</dd>
					</template>
				</template>
			</dl>
			<p v-if="!anySuggestion" class="small muted">Not filled in — this section is optional.</p>
		</div>

		<div class="pblock">
			<h2>10. Looking ahead — next cycle</h2>
			<dl>
				<template v-for="q in aheadQs" :key="q.key">
					<dt>{{ q.q }}</dt><dd class="answer">{{ d[q.field] || '—' }}</dd>
				</template>
			</dl>
		</div>

		<div class="pblock">
			<h2>11. Ratings</h2>
			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr>
							<th scope="col">Evaluation area</th>
							<th scope="col">Weight</th>
							<th scope="col">Self</th>
							<th scope="col">Manager</th>
						</tr>
					</thead>
					<tbody>
						<tr><td>Performance / KRAs &amp; KPIs</td><td>{{ w.kra || '—' }}%</td><td>{{ d.self_kra_rating || '–' }}</td><td>—</td></tr>
						<tr><td>Behaviour &amp; competencies</td><td>{{ w.competency || '—' }}%</td><td>{{ d.self_competency_rating || '–' }}</td><td>—</td></tr>
						<tr><td>Additional contribution</td><td>{{ w.additional || '—' }}%</td><td>{{ d.self_additional_rating || '–' }}</td><td>—</td></tr>
						<tr>
							<td><b>Weighted</b></td>
							<td>100%</td>
							<td><b>{{ num(d.self_weighted_score) }}</b></td>
							<td><b>{{ num(d.manager_weighted_score) }}</b></td>
						</tr>
						<tr>
							<td><b>Overall</b></td>
							<td>—</td>
							<td>{{ d.self_overall_rating || '–' }}</td>
							<td>{{ d.manager_overall_rating || '–' }}</td>
						</tr>
					</tbody>
				</table>
			</div>
			<dl v-if="d.self_overall_comment" style="margin-top:10px">
				<dt>Employee comments</dt><dd class="answer">{{ d.self_overall_comment }}</dd>
			</dl>
		</div>

		<div v-if="d.manager_key_feedback || d.manager_development_recs" class="pblock">
			<h2>12. Manager’s review</h2>
			<dl>
				<dt>Key feedback</dt><dd class="answer">{{ d.manager_key_feedback || '—' }}</dd>
				<dt>Development recommendations</dt><dd class="answer">{{ d.manager_development_recs || '—' }}</dd>
				<template v-if="d.manager_submitted_on">
					<dt>Submitted</dt><dd>{{ fmtDate(d.manager_submitted_on) }}</dd>
				</template>
			</dl>
		</div>

		<div v-if="d.hr_final_rating || d.hr_comments || d.calibration_notes || d.discussion_notes" class="pblock">
			<h2>13. HR and calibration</h2>
			<dl>
				<dt>Final rating</dt><dd>{{ d.hr_final_rating || '—' }}</dd>
				<dt v-if="d.hr_comments">HR comments</dt><dd v-if="d.hr_comments" class="answer">{{ d.hr_comments }}</dd>
				<dt v-if="d.calibration_notes">Calibration notes</dt><dd v-if="d.calibration_notes" class="answer">{{ d.calibration_notes }}</dd>
				<dt v-if="d.discussion_notes">Discussion notes</dt><dd v-if="d.discussion_notes" class="answer">{{ d.discussion_notes }}</dd>
			</dl>
		</div>

		<div class="pblock">
			<h2>14. Declaration</h2>
			<p class="small">
				I confirm that the information provided in this self-appraisal is accurate and reflects my
				performance and contributions during the appraisal period to the best of my knowledge.
			</p>
			<dl style="margin-top:10px">
				<dt>Signed</dt><dd>{{ d.declaration_name || '—' }}</dd>
				<dt>Date</dt><dd>{{ fmtDate(d.declared_on || d.submitted_on) || '—' }}</dd>
			</dl>
		</div>
	</div>
</template>

<script>
import { fmtDate, ratingWord, SUGGESTION_CARDS } from '../appraisal/store.js';

const OVERALL = [
	{ key: 'contributions', field: 'q_contributions', q: 'What are your three most significant contributions during the appraisal period?' },
	{ key: 'handled_well', field: 'q_handled_well', q: 'What responsibilities or areas do you believe you handled particularly well?' },
	{ key: 'improve', field: 'q_improve', q: 'What would you like to improve in the next appraisal cycle?' },
	{ key: 'additional_resp', field: 'q_additional_resp', q: 'What additional responsibilities would you like to take up?' },
	{ key: 'support', field: 'q_support', q: 'What support, resources or training would help you perform better?' },
];

const AHEAD = [
	{ key: 'outcomes', field: 'ahead_outcomes', q: 'Top three outcomes you want to achieve in the next cycle' },
	{ key: 'responsibility', field: 'ahead_responsibility', q: 'Additional responsibility or leadership opportunity you would like to take up' },
	{ key: 'support', field: 'ahead_support', q: 'Skills, resources or organisational support that would enable greater impact' },
	{ key: 'value', field: 'ahead_value', q: 'If given additional responsibility, what measurable value can you create?' },
];

export default {
	name: 'HrReadView',
	props: {
		doc: { type: Object, default: () => ({}) },
	},
	data() {
		return { overallQs: OVERALL, aheadQs: AHEAD };
	},
	computed: {
		d() {
			return this.doc || {};
		},
		w() {
			return this.d.cycle_weights || {};
		},
		applicableComps() {
			return this.list('competencies').filter(function (c) {
				return c.applicable === undefined || Number(c.applicable);
			});
		},
		anySuggestion() {
			return this.list('suggestions').some(function (s) {
				return s.observation || s.solution || s.impact;
			});
		},
	},
	methods: {
		fmtDate: fmtDate,
		list(key) {
			return Array.isArray(this.d[key]) ? this.d[key] : [];
		},
		any(key, field) {
			return this.list(key).some(function (row) {
				return String(row[field] || '').trim();
			});
		},
		rating(n) {
			return n ? n + ' · ' + ratingWord(n) : '–';
		},
		num(v) {
			return v === null || v === undefined || v === '' ? '–' : Number(v).toFixed(2);
		},
		cardTitle(key) {
			const card = SUGGESTION_CARDS.filter(function (c) {
				return c.key === key;
			})[0];
			return card ? card.title : key || 'Suggestion';
		},
	},
};
</script>
