<template>
	<div>
		<div class="stephead">
			<div class="k">Section 11</div>
			<h2>Overall self-rating</h2>
			<p>
				Section ratings are pre-filled from your weighted averages. Change them if you think the
				average misses something — say why.
			</p>
		</div>

		<div class="card">
			<div class="table-wrap">
				<table class="table">
					<thead>
						<tr>
							<th>Evaluation area</th>
							<th>Weight</th>
							<th>Weighted avg</th>
							<th>Your rating</th>
						</tr>
					</thead>
					<tbody>
						<tr>
							<td>Performance / KRAs &amp; KPIs</td>
							<td>{{ c.kra_weight }}%</td>
							<td>{{ avg.kra ? avg.kra.toFixed(2) : '–' }}</td>
							<td style="min-width:220px">
								<Rating v-model="sec.kra" compact label="Section rating for KRAs" :invalid="state.showErr && !sec.kra" />
							</td>
						</tr>
						<tr>
							<td>Behaviour &amp; competencies</td>
							<td>{{ c.competency_weight }}%</td>
							<td>{{ avg.comp ? avg.comp.toFixed(2) : '–' }}</td>
							<td>
								<Rating v-model="sec.comp" compact label="Section rating for competencies" :invalid="state.showErr && !sec.comp" />
							</td>
						</tr>
						<tr>
							<td>Additional contribution</td>
							<td>{{ c.additional_weight }}%</td>
							<td>{{ avg.add ? avg.add.toFixed(2) : '–' }}</td>
							<td>
								<Rating v-model="sec.add" compact label="Section rating for additional contribution" />
							</td>
						</tr>
						<tr>
							<td><b>Overall</b></td>
							<td>100%</td>
							<td><b>{{ score ? score.toFixed(2) : '–' }}</b></td>
							<td>
								<b>{{ secScore ? secScore.toFixed(2) : '–' }}</b>
								<span class="muted small"> from your section ratings</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-if="state.showErr && (!sec.kra || !sec.comp)" class="err-text mt-2">
				Rate performance and competencies before you continue.
			</div>

			<div class="field mt-3">
				<label for="wfa-sec-comment">Employee comments</label>
				<textarea
					id="wfa-sec-comment"
					v-model="sec.comment"
					class="input"
					placeholder="Optional — context for the ratings above."
				></textarea>
			</div>
		</div>

		<div class="card mt-3 summary">
			<div class="sec-h" style="margin-bottom:0">
				<h3>Everything you’ve written</h3>
				<span class="small muted">Tap “edit” to jump back</span>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>KRAs</h3><button class="edit" type="button" @click="go('kras')">edit</button></div>
				<div v-for="(k, i) in defs.kras" :key="i" class="small" style="margin-bottom:10px">
					<b>{{ k.kra }}</b> — rated {{ d.kras[i].self || '–' }}
					<div class="muted answer">{{ d.kras[i].actual || 'No result written' }}</div>
					<div class="muted answer" v-if="d.kras[i].evidence">{{ d.kras[i].evidence }}</div>
				</div>
				<div v-if="!defs.kras.length" class="small muted">None</div>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>Competencies</h3><button class="edit" type="button" @click="go('comps')">edit</button></div>
				<div v-for="(cp, i) in defs.comps" :key="i" class="small" style="margin-bottom:8px">
					<b>{{ cp.competency }}</b> — rated {{ d.comps[i].self || '–' }}
					<div class="muted answer" v-if="d.comps[i].evidence">{{ d.comps[i].evidence }}</div>
				</div>
				<div v-if="!defs.comps.length" class="small muted">None</div>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>Additional contribution</h3><button class="edit" type="button" @click="go('contrib')">edit</button></div>
				<div v-for="(ct, i) in defs.contribs" :key="i" class="small" style="margin-bottom:8px">
					<template v-if="d.contribs[i].contribution || d.contribs[i].impact">
						<b>{{ ct.area }}</b> — rated {{ d.contribs[i].self || '–' }}
						<div class="muted answer">{{ d.contribs[i].contribution }}</div>
						<div class="muted answer" v-if="d.contribs[i].impact">{{ d.contribs[i].impact }}</div>
					</template>
				</div>
				<div v-if="!anyContrib" class="small muted">Nothing added</div>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>Achievements</h3><button class="edit" type="button" @click="go('ach')">edit</button></div>
				<div v-for="(a, i) in d.achievements" :key="i" class="small">
					<template v-if="a.what">
						• {{ a.what }}<span class="muted" v-if="a.impact"> — {{ a.impact }}</span>
					</template>
				</div>
				<div v-if="!d.achievements.some((a) => a.what)" class="small muted">None yet</div>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>Challenges</h3><button class="edit" type="button" @click="go('chal')">edit</button></div>
				<div v-for="(ch, i) in d.challenges" :key="i" class="small" style="margin-bottom:6px">
					<template v-if="ch.area || ch.what">
						<b>{{ ch.area }}</b>
						<div class="muted answer">{{ ch.what }}</div>
					</template>
				</div>
				<div v-if="!d.challenges.some((x) => x.area || x.what)" class="small muted">None yet</div>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>Development goals</h3><button class="edit" type="button" @click="go('goals')">edit</button></div>
				<div v-for="(g, i) in d.goals" :key="i" class="small" style="margin-bottom:6px">
					<template v-if="g.area || g.action">
						<b>{{ g.area }}</b>
						<div class="muted answer">{{ g.action }}<template v-if="g.outcome"> — {{ g.outcome }}</template></div>
					</template>
				</div>
				<div v-if="!d.goals.some((x) => x.area || x.action)" class="small muted">None yet</div>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>Overall self-assessment</h3><button class="edit" type="button" @click="go('overall')">edit</button></div>
				<div v-for="q in overallQs" :key="q.key" class="small" style="margin-bottom:8px">
					<div class="muted">{{ q.q }}</div>
					<div class="answer">{{ d.overall[q.key] || '—' }}</div>
				</div>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>Organisational development</h3><button class="edit" type="button" @click="go('sugg')">edit</button></div>
				<div v-for="(card, i) in suggCards" :key="card.key" class="small" style="margin-bottom:8px">
					<template v-if="d.suggestions[i].observation || d.suggestions[i].solution || d.suggestions[i].impact">
						<b>{{ card.title }}</b>
						<div class="muted answer">{{ d.suggestions[i].observation }}</div>
						<div class="muted answer">{{ d.suggestions[i].solution }}</div>
						<div class="muted answer">{{ d.suggestions[i].impact }}</div>
					</template>
				</div>
				<div v-if="!anySugg" class="small muted">Skipped — this section is optional</div>
			</div>

			<div class="sec">
				<div class="sec-h"><h3>Looking ahead</h3><button class="edit" type="button" @click="go('ahead')">edit</button></div>
				<div v-for="q in aheadQs" :key="q.key" class="small" style="margin-bottom:8px">
					<div class="muted">{{ q.q }}</div>
					<div class="answer">{{ d.ahead[q.key] || '—' }}</div>
				</div>
			</div>
		</div>
	</div>
</template>

<script>
import {
	state,
	STEPS,
	OVERALL_QUESTIONS,
	AHEAD_QUESTIONS,
	SUGGESTION_CARDS,
	sectionAverages,
	selfScore,
	sectionScore,
	prefillSectionRatings,
} from '../../store.js';
import Rating from '../../ui/Rating.vue';

export default {
	name: 'StepSummary',
	components: { Rating },
	emits: ['go'],
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
		sec() {
			return state.draft.sec;
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
		anyContrib() {
			return this.d.contribs.some(function (x) {
				return x.contribution || x.impact;
			});
		},
		anySugg() {
			return this.d.suggestions.some(function (x) {
				return x.observation || x.solution || x.impact;
			});
		},
	},
	created() {
		prefillSectionRatings();
	},
	methods: {
		go(key) {
			const i = STEPS.map(function (s) {
				return s.key;
			}).indexOf(key);
			if (i >= 0) this.$emit('go', i);
		},
	},
};
</script>
