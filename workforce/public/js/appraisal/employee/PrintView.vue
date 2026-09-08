<template>
	<div>
		<div class="print-bar">
			<div class="row">
				<Button v-if="canGoBack" variant="ghost" @click="$emit('back')">Back</Button>
				<span class="small muted">{{ state.cycle.name }}</span>
			</div>
			<Button variant="primary" @click="print">Print or save as PDF</Button>
		</div>

		<div class="print-page">
			<h1>Self-appraisal — {{ state.header.employee_name }}</h1>
			<p class="small muted mt-1">
				{{ state.cycle.name }}
				<template v-if="state.submittedOn"> · submitted {{ fmtDate(state.submittedOn) }}</template>
			</p>

			<div class="pblock">
				<h2>1. Employee details</h2>
				<dl>
					<dt>Employee name</dt><dd>{{ h.employee_name }}</dd>
					<dt>Employee ID</dt><dd>{{ h.employee_id }}</dd>
					<dt>Department</dt><dd>{{ h.department }}</dd>
					<dt>Designation</dt><dd>{{ h.designation }}</dd>
					<dt>Date of joining</dt><dd>{{ fmtDate(h.date_of_joining) }}</dd>
					<dt>Reporting manager</dt><dd>{{ h.manager_name }}</dd>
					<dt>Appraisal period</dt><dd>{{ state.cycle.name }}</dd>
					<dt>Effective date</dt><dd>{{ fmtDate(state.cycle.effective_date) }}</dd>
				</dl>
			</div>

			<div class="pblock">
				<h2>2. KRAs and KPIs</h2>
				<div v-for="(k, i) in defs.kras" :key="i" style="margin-bottom:14px">
					<b>{{ i + 1 }}. {{ k.kra }}<template v-if="k.weightage"> · {{ k.weightage }}%</template></b>
					<dl>
						<dt>Measured by</dt><dd>{{ k.kpi }}</dd>
						<dt>Target</dt><dd>{{ k.target }}</dd>
						<dt>Actual result</dt><dd class="answer">{{ d.kras[i].actual }}</dd>
						<dt>Self rating</dt><dd>{{ d.kras[i].self || '—' }} {{ word(d.kras[i].self) }}</dd>
						<dt>Comments / evidence</dt><dd class="answer">{{ d.kras[i].evidence }}</dd>
					</dl>
				</div>
				<p v-if="!defs.kras.length" class="small muted">None</p>
			</div>

			<div class="pblock">
				<h2>3. Behaviour and competencies</h2>
				<div v-for="(c, i) in defs.comps" :key="i" style="margin-bottom:14px">
					<b>{{ c.competency }}<template v-if="c.weightage"> · {{ c.weightage }}%</template></b>
					<dl>
						<dt>Self rating</dt><dd>{{ d.comps[i].self || '—' }} {{ word(d.comps[i].self) }}</dd>
						<dt>Examples / evidence</dt><dd class="answer">{{ d.comps[i].evidence }}</dd>
					</dl>
				</div>
				<p v-if="!defs.comps.length" class="small muted">None</p>
			</div>

			<div class="pblock">
				<h2>4. Additional contribution</h2>
				<div v-for="(c, i) in defs.contribs" :key="i" style="margin-bottom:14px">
					<b>{{ c.area }}</b>
					<dl>
						<dt>Contribution</dt><dd class="answer">{{ d.contribs[i].contribution || '—' }}</dd>
						<dt>Impact</dt><dd class="answer">{{ d.contribs[i].impact || '—' }}</dd>
						<dt>Self rating</dt><dd>{{ d.contribs[i].self || '—' }}</dd>
					</dl>
				</div>
				<p v-if="!defs.contribs.length" class="small muted">None</p>
			</div>

			<div class="pblock">
				<h2>5. Key achievements</h2>
				<dl>
					<template v-for="(a, i) in d.achievements" :key="i">
						<template v-if="a.what">
							<dt>Achievement {{ i + 1 }}</dt>
							<dd class="answer">{{ a.what }}<br /><span class="muted">Impact: {{ a.impact }}</span></dd>
						</template>
					</template>
				</dl>
			</div>

			<div class="pblock">
				<h2>6. Challenges and improvement areas</h2>
				<dl>
					<template v-for="(c, i) in d.challenges" :key="i">
						<template v-if="c.area || c.what">
							<dt>{{ c.area || 'Challenge ' + (i + 1) }}</dt>
							<dd class="answer">
								{{ c.what }}
								<template v-if="c.action"><br />Action: {{ c.action }}</template>
								<template v-if="c.support"><br />Support required: {{ c.support }}</template>
							</dd>
						</template>
					</template>
				</dl>
			</div>

			<div class="pblock">
				<h2>7. Development and future goals</h2>
				<dl>
					<template v-for="(g, i) in d.goals" :key="i">
						<template v-if="g.area || g.action">
							<dt>{{ g.area || 'Goal ' + (i + 1) }}</dt>
							<dd class="answer">
								{{ g.action }}<template v-if="g.outcome"><br />Expected outcome: {{ g.outcome }}</template>
							</dd>
						</template>
					</template>
				</dl>
			</div>

			<div class="pblock">
				<h2>8. Overall self-assessment</h2>
				<dl>
					<template v-for="q in overallQs" :key="q.key">
						<dt>{{ q.q }}</dt><dd class="answer">{{ d.overall[q.key] || '—' }}</dd>
					</template>
				</dl>
			</div>

			<div class="pblock">
				<h2>9. Organisational development</h2>
				<dl>
					<template v-for="(card, i) in suggCards" :key="card.key">
						<template v-if="d.suggestions[i].observation || d.suggestions[i].solution || d.suggestions[i].impact">
							<dt>{{ card.title }}</dt>
							<dd class="answer">
								{{ d.suggestions[i].observation }}
								<template v-if="d.suggestions[i].solution"><br />{{ d.suggestions[i].solution }}</template>
								<template v-if="d.suggestions[i].impact"><br />{{ d.suggestions[i].impact }}</template>
							</dd>
						</template>
					</template>
				</dl>
				<p v-if="!anySugg" class="small muted">Not filled in — this section is optional.</p>
			</div>

			<div class="pblock">
				<h2>10. Looking ahead — next cycle</h2>
				<dl>
					<template v-for="q in aheadQs" :key="q.key">
						<dt>{{ q.q }}</dt><dd class="answer">{{ d.ahead[q.key] || '—' }}</dd>
					</template>
				</dl>
			</div>

			<div class="pblock">
				<h2>11. Overall self-rating</h2>
				<table class="table">
					<thead>
						<tr><th>Evaluation area</th><th>Weight</th><th>Weighted avg</th><th>Self rating</th></tr>
					</thead>
					<tbody>
						<tr><td>Performance / KRAs &amp; KPIs</td><td>{{ c.kra_weight }}%</td><td>{{ avg.kra ? avg.kra.toFixed(2) : '–' }}</td><td>{{ d.sec.kra || '–' }}</td></tr>
						<tr><td>Behaviour &amp; competencies</td><td>{{ c.competency_weight }}%</td><td>{{ avg.comp ? avg.comp.toFixed(2) : '–' }}</td><td>{{ d.sec.comp || '–' }}</td></tr>
						<tr><td>Additional contribution</td><td>{{ c.additional_weight }}%</td><td>{{ avg.add ? avg.add.toFixed(2) : '–' }}</td><td>{{ d.sec.add || '–' }}</td></tr>
						<tr><td><b>Overall</b></td><td>100%</td><td><b>{{ score ? score.toFixed(2) : '–' }}</b></td><td><b>{{ secScore ? secScore.toFixed(2) : '–' }}</b></td></tr>
					</tbody>
				</table>
				<dl v-if="d.sec.comment" style="margin-top:10px">
					<dt>Employee comments</dt><dd class="answer">{{ d.sec.comment }}</dd>
				</dl>
			</div>

			<div class="pblock">
				<h2>12. Declaration</h2>
				<p class="small">
					I confirm that the information provided in this self-appraisal is accurate and reflects my
					performance and contributions during the appraisal period to the best of my knowledge.
				</p>
				<dl style="margin-top:10px">
					<dt>Signed</dt><dd>{{ d.decl.name || '—' }}</dd>
					<dt>Date</dt><dd>{{ fmtDate(state.submittedOn) || today }}</dd>
				</dl>
			</div>
		</div>
	</div>
</template>

<script>
import {
	state,
	OVERALL_QUESTIONS,
	AHEAD_QUESTIONS,
	SUGGESTION_CARDS,
	sectionAverages,
	selfScore,
	sectionScore,
	ratingWord,
	fmtDate,
	todayLong,
} from '../store.js';
import Button from '../ui/Button.vue';

export default {
	name: 'WfaPrintView',
	components: { Button },
	props: {
		canGoBack: { type: Boolean, default: true },
	},
	emits: ['back'],
	data() {
		return {
			state: state,
			overallQs: OVERALL_QUESTIONS,
			aheadQs: AHEAD_QUESTIONS,
			suggCards: SUGGESTION_CARDS,
		};
	},
	computed: {
		d() {
			return state.draft;
		},
		defs() {
			return state.definitions;
		},
		h() {
			return state.header;
		},
		c() {
			return state.cycle;
		},
		avg() {
			return sectionAverages();
		},
		score() {
			return selfScore();
		},
		secScore() {
			return sectionScore();
		},
		today() {
			return todayLong();
		},
		anySugg() {
			return this.d.suggestions.some(function (x) {
				return x.observation || x.solution || x.impact;
			});
		},
	},
	methods: {
		fmtDate,
		word(n) {
			return n ? '· ' + ratingWord(n) : '';
		},
		print() {
			window.print();
		},
	},
};
</script>
