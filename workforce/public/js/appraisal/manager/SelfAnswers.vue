<template>
	<div class="acc">
		<button type="button" :aria-expanded="open ? 'true' : 'false'" @click="$emit('toggle')">
			Everything else {{ firstName }} wrote
			<span class="caret" aria-hidden="true">{{ open ? '▲' : '▼' }}</span>
		</button>

		<div v-if="open" class="body">
			<div class="sec">
				<h3>Key achievements</h3>
				<div v-for="(a, i) in list('achievements')" :key="i" class="small mt-1">
					<template v-if="a.achievement">
						• {{ a.achievement }}<span v-if="a.impact" class="muted"> — {{ a.impact }}</span>
					</template>
				</div>
				<div v-if="!any('achievements', 'achievement')" class="small muted">None</div>
			</div>

			<div class="sec">
				<h3>Challenges</h3>
				<div v-for="(c, i) in list('challenges')" :key="i" class="small mt-2">
					<template v-if="c.area || c.challenge">
						<b>{{ c.area }}</b>
						<div class="muted answer">{{ c.challenge }}</div>
						<div v-if="c.action_taken" class="muted answer">Action: {{ c.action_taken }}</div>
						<div v-if="c.support_required" class="muted answer">Support: {{ c.support_required }}</div>
					</template>
				</div>
				<div v-if="!any('challenges', 'area')" class="small muted">None</div>
			</div>

			<div class="sec">
				<h3>Development goals</h3>
				<div v-for="(g, i) in list('goals')" :key="i" class="small mt-2">
					<template v-if="g.development_area || g.action_required">
						<b>{{ g.development_area }}</b>
						<div class="muted answer">
							{{ g.action_required }}<template v-if="g.expected_outcome"> — {{ g.expected_outcome }}</template>
						</div>
					</template>
				</div>
				<div v-if="!any('goals', 'development_area')" class="small muted">None</div>
			</div>

			<div class="sec">
				<h3>Overall self-assessment</h3>
				<div v-for="q in overallQs" :key="q.key" class="small mt-2">
					<div class="muted">{{ q.q }}</div>
					<div class="answer">{{ overall[q.key] || '—' }}</div>
				</div>
			</div>

			<div class="sec">
				<h3>Organisational development</h3>
				<div v-for="(s, i) in list('suggestions')" :key="i" class="small mt-2">
					<template v-if="s.observation || s.solution || s.impact">
						<b>{{ cardTitle(s.key) }}</b>
						<div class="muted answer">{{ s.observation }}</div>
						<div class="muted answer">{{ s.solution }}</div>
						<div class="muted answer">{{ s.impact }}</div>
					</template>
				</div>
				<div v-if="!anySugg" class="small muted">Skipped — this section is optional</div>
			</div>

			<div class="sec">
				<h3>Looking ahead</h3>
				<div v-for="q in aheadQs" :key="q.key" class="small mt-2">
					<div class="muted">{{ q.q }}</div>
					<div class="answer">{{ ahead[q.key] || '—' }}</div>
				</div>
			</div>

			<div class="sec">
				<h3>Their own section ratings</h3>
				<div class="small mt-1">
					KRAs {{ sec.kra || '–' }} · competencies {{ sec.comp || '–' }} · additional {{ sec.add || '–' }}
				</div>
				<div v-if="sec.comment" class="small muted answer mt-1">{{ sec.comment }}</div>
			</div>
		</div>
	</div>
</template>

<script>
import { OVERALL_QUESTIONS, AHEAD_QUESTIONS, SUGGESTION_CARDS } from '../store.js';

export default {
	name: 'WfaSelfAnswers',
	props: {
		self: { type: Object, default: () => ({}) },
		firstName: { type: String, default: '' },
		open: { type: Boolean, default: false },
	},
	emits: ['toggle'],
	data() {
		return { overallQs: OVERALL_QUESTIONS, aheadQs: AHEAD_QUESTIONS };
	},
	computed: {
		overall() {
			return this.self.overall || {};
		},
		ahead() {
			return this.self.ahead || {};
		},
		sec() {
			return this.self.sec || {};
		},
		anySugg() {
			return this.list('suggestions').some(function (s) {
				return s.observation || s.solution || s.impact;
			});
		},
	},
	methods: {
		list(key) {
			return Array.isArray(this.self[key]) ? this.self[key] : [];
		},
		any(key, field) {
			return this.list(key).some(function (row) {
				return String(row[field] || '').trim();
			});
		},
		cardTitle(key) {
			const card = SUGGESTION_CARDS.filter(function (c) {
				return c.key === key;
			})[0];
			return card ? card.title : key;
		},
	},
};
</script>
