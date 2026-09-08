<template>
	<div>
		<Button variant="ghost" size="sm" @click="$emit('back')">← Back to team</Button>

		<!-- loading -->
		<div v-if="review.loading || (!review.loaded && !review.loadError)" class="mt-3" aria-busy="true">
			<div class="card">
				<Skeleton width="220px" height="22px" />
				<Skeleton width="320px" height="13px" mt="10px" />
			</div>
			<div v-for="n in 2" :key="n" class="review">
				<div class="rowhead"><Skeleton width="240px" height="15px" /></div>
				<div class="side left">
					<Skeleton width="100%" height="13px" />
					<Skeleton width="90%" height="13px" mt="8px" />
					<Skeleton width="70%" height="13px" mt="8px" />
				</div>
				<div class="side">
					<Skeleton width="100%" height="38px" radius="10px" />
					<Skeleton width="100%" height="110px" mt="14px" radius="10px" />
				</div>
			</div>
			<span class="sr-only">Loading the review</span>
		</div>

		<!-- failed -->
		<div v-else-if="review.loadError" class="card mt-3">
			<h3>We couldn’t open this review</h3>
			<p class="mt-2">{{ review.loadError }}</p>
			<div class="row mt-3">
				<Button variant="primary" @click="reopen">Try again</Button>
				<Button variant="ghost" @click="$emit('back')">Back to team</Button>
			</div>
		</div>

		<template v-else>
			<div class="row between mt-2 wrap">
				<div>
					<h2>{{ header.employee_name }}</h2>
					<p class="muted small mt-1">{{ subline }}</p>
				</div>
				<span class="chip" :class="complete ? 'moss' : 'gold'">
					{{ complete ? 'Review complete' : totals.done + ' of ' + totals.need + ' rated' }}
				</span>
			</div>

			<div v-if="!editable" class="notice moss-note mt-3">
				Review submitted{{ submittedDate ? ' ' + submittedDate : '' }}. It is with HR now — this is a read-only copy.
			</div>
			<div v-else-if="review.panelNote" class="notice gold mt-3">{{ review.panelNote }}</div>

			<div class="review-layout mt-2">
				<div>
					<!-- KRAs -->
					<div id="rv-kras">
						<ReviewBlock
							v-for="(k, i) in kras"
							:key="'k' + i"
							:title="(i + 1) + '. ' + k.kra"
							:weight="k.weightage"
							:first-name="firstName"
							:self-rating="k.self_rating"
							:rating="draft.kras[i].rating"
							:comment="draft.kras[i].comment"
							:readonly="!editable"
							@update:rating="draft.kras[i].rating = $event"
							@update:comment="draft.kras[i].comment = $event"
						>
							<div class="compare">
								<span class="lbl">Target</span><span>{{ k.target || '—' }}</span>
							</div>
							<div class="mt-2 small muted">Actual result</div>
							<div class="q">{{ k.actual_result || '—' }}</div>
							<div class="mt-2 small muted">Evidence</div>
							<div class="q">{{ k.employee_comments || '—' }}</div>
						</ReviewBlock>
					</div>

					<!-- competencies -->
					<template v-if="comps.length">
						<h3 class="mt-4" id="rv-comps">Behaviour and competencies</h3>
						<ReviewBlock
							v-for="(c, i) in comps"
							:key="'c' + i"
							:title="c.competency"
							:weight="c.weightage"
							:first-name="firstName"
							:self-rating="c.self_rating"
							:rating="draft.comps[i].rating"
							:comment="draft.comps[i].comment"
							:readonly="!editable"
							@update:rating="draft.comps[i].rating = $event"
							@update:comment="draft.comps[i].comment = $event"
						>
							<div v-if="c.kra_label" class="compare">
								<span class="lbl">Responsibility</span><span>{{ c.kra_label }}</span>
							</div>
							<div v-if="c.target" class="compare mt-1">
								<span class="lbl">Expected</span><span>{{ c.target }}</span>
							</div>
							<div class="mt-2 small muted">Examples / evidence</div>
							<div class="q">{{ c.evidence || '—' }}</div>
						</ReviewBlock>
					</template>

					<!-- additional contribution: only what they filled in -->
					<template v-if="filled.length || blanks.length">
						<h3 class="mt-4" id="rv-contribs">Additional contribution</h3>
						<ReviewBlock
							v-for="x in filled"
							:key="'x' + x.i"
							:title="x.c.area"
							:weight="x.c.weightage"
							:first-name="firstName"
							:self-rating="x.c.self_rating"
							:rating="draft.contribs[x.i].rating"
							:comment="draft.contribs[x.i].comment"
							:readonly="!editable"
							@update:rating="draft.contribs[x.i].rating = $event"
							@update:comment="draft.contribs[x.i].comment = $event"
						>
							<div class="small muted">Contribution</div>
							<div class="q">{{ x.c.contribution || '—' }}</div>
							<div class="mt-2 small muted">Impact</div>
							<div class="q">{{ x.c.impact || '—' }}</div>
						</ReviewBlock>
						<p v-if="blanks.length" class="small muted mt-2">
							Not filled by {{ firstName }}: {{ blanks.join(', ') }}
						</p>
					</template>

					<SelfAnswers
						:self="review.self"
						:first-name="firstName"
						:open="review.everythingOpen"
						@toggle="review.everythingOpen = !review.everythingOpen"
					/>

					<!-- overall -->
					<div id="rv-overall" class="card mt-4">
						<h3>Overall</h3>
						<div class="grid2 mt-2">
							<div class="field">
								<label>Your overall rating</label>
								<Rating
									:model-value="draft.overall_rating"
									:readonly="!editable"
									label="Your overall rating"
									@update:model-value="draft.overall_rating = $event"
								/>
							</div>
							<div class="field">
								<label>Weighted from your ratings</label>
								<div class="row">
									<b style="font-size:30px;letter-spacing:-.02em">{{ shown }}</b>
									<span class="muted">/ 5 · employee’s own: {{ selfShown }}</span>
								</div>
								<div class="hint prose">
									Calculated live from the KRA and competency ratings above. Your overall rating can
									differ — HR sees both.
								</div>
							</div>
						</div>

						<div class="grid2 mt-3">
							<TextArea
								:model-value="draft.key_feedback"
								label="Key feedback"
								placeholder="What went well, what didn’t, in plain words. The employee reads this after calibration."
								:disabled="!editable"
								:invalid="showErr && !text(draft.key_feedback)"
								@update:model-value="draft.key_feedback = $event"
							/>
							<TextArea
								:model-value="draft.development_recs"
								label="Development recommendations"
								placeholder="Specific skills, exposure or responsibility to add next cycle."
								:disabled="!editable"
								:invalid="showErr && !text(draft.development_recs)"
								@update:model-value="draft.development_recs = $event"
							/>
						</div>

						<div v-if="editable" class="row between mt-3 wrap">
							<span class="small muted">Saved automatically. You can leave and come back.</span>
							<Button variant="primary" :disabled="!canSubmit || review.submitting" @click="send">
								{{ review.submitting ? 'Submitting…' : 'Submit review to HR' }}
							</Button>
						</div>
						<p v-if="editable && !canSubmit" class="xs muted mt-2">{{ missing }}</p>

						<div v-if="review.submitErrors.length" class="mt-3">
							<b class="small">The server could not accept this yet</b>
							<ul class="errlist">
								<li v-for="(e, i) in review.submitErrors" :key="i">{{ e.msg }}</li>
							</ul>
						</div>
					</div>
				</div>

				<!-- sticky mini-summary, wide screens only -->
				<aside class="review-side">
					<div class="card">
						<div class="xs muted">Weighted from your ratings</div>
						<b class="score">{{ shown }}</b><span class="muted small"> / 5</span>
						<div class="bar"><i :style="{ width: (score / 5) * 100 + '%' }"></i></div>
						<div class="xs muted mt-1">{{ totals.done }} of {{ totals.need }} rated</div>
						<div class="xs muted mt-1">Employee’s own: {{ selfShown }}</div>
						<Button
							v-if="editable"
							variant="primary"
							size="sm"
							class="mt-3"
							block
							:disabled="review.submitting"
							@click="shortcut"
						>
							Submit
						</Button>
					</div>
				</aside>
			</div>
		</template>
	</div>
</template>

<script>
import { fmtDate, firstNameOf } from '../store.js';
import {
	review,
	openReview,
	filledContribs,
	blankContribNames,
	managerScore,
	selfScoreOf,
	ratedTotals,
	canSubmitReview,
	missingSummary,
	submitReview,
	reviewIssues,
} from '../review.js';
import Button from '../ui/Button.vue';
import Skeleton from '../ui/Skeleton.vue';
import Rating from '../ui/Rating.vue';
import TextArea from '../ui/TextArea.vue';
import ReviewBlock from './ReviewBlock.vue';
import SelfAnswers from './SelfAnswers.vue';

export default {
	name: 'WfaReviewPanel',
	components: { Button, Skeleton, Rating, TextArea, ReviewBlock, SelfAnswers },
	emits: ['back'],
	data() {
		return { review: review, shown: '0.00', raf: 0, showErr: false };
	},
	computed: {
		header() {
			return review.header || {};
		},
		draft() {
			return review.draft;
		},
		editable() {
			return !!Number(review.editable);
		},
		firstName() {
			return firstNameOf(this.header.employee_name);
		},
		kras() {
			return (review.self && review.self.kras) || [];
		},
		comps() {
			return (review.self && review.self.comps) || [];
		},
		filled() {
			return filledContribs();
		},
		blanks() {
			return blankContribNames();
		},
		score() {
			return managerScore();
		},
		selfShown() {
			const s = selfScoreOf();
			return s ? s.toFixed(2) : '–';
		},
		totals() {
			return ratedTotals();
		},
		complete() {
			return this.totals.need > 0 && this.totals.done === this.totals.need;
		},
		canSubmit() {
			return canSubmitReview();
		},
		missing() {
			return missingSummary();
		},
		submittedDate() {
			return fmtDate(review.managerSubmittedOn);
		},
		subline() {
			const bits = [];
			if (this.header.designation) bits.push(this.header.designation);
			const on = fmtDate(review.submittedOn);
			if (on) bits.push('submitted ' + on);
			const s = selfScoreOf();
			if (s) bits.push('self score ' + s.toFixed(2) + ' / 5');
			return bits.join(' · ');
		},
	},
	watch: {
		score: {
			immediate: true,
			handler(to, from) {
				this.animate(Number(from || 0), Number(to || 0));
			},
		},
	},
	beforeUnmount() {
		if (this.raf) cancelAnimationFrame(this.raf);
	},
	methods: {
		text(v) {
			return String(v || '').trim().length > 0;
		},
		reduced() {
			return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		},
		animate(from, to) {
			if (this.raf) cancelAnimationFrame(this.raf);
			if (!to) {
				this.shown = '0.00';
				return;
			}
			if (this.reduced()) {
				this.shown = to.toFixed(2);
				return;
			}
			const start = performance.now();
			const step = (now) => {
				const p = Math.min(1, (now - start) / 350);
				const eased = 1 - Math.pow(1 - p, 3);
				this.shown = (from + (to - from) * eased).toFixed(2);
				if (p < 1) this.raf = requestAnimationFrame(step);
			};
			this.raf = requestAnimationFrame(step);
		},
		reopen() {
			if (review.open) openReview(review.open);
		},
		scrollTo(id) {
			const el = document.getElementById(id);
			if (el && el.scrollIntoView) el.scrollIntoView({ behavior: this.reduced() ? 'auto' : 'smooth', block: 'start' });
		},
		shortcut() {
			if (this.canSubmit) {
				this.send();
				return;
			}
			this.showErr = true;
			const first = reviewIssues()[0];
			this.scrollTo('rv-' + (first ? first.step : 'overall'));
		},
		async send() {
			this.showErr = true;
			const r = await submitReview();
			if (r && r.ok) {
				window.scrollTo({ top: 0, behavior: this.reduced() ? 'auto' : 'smooth' });
				return;
			}
			if (r && r.reason === 'incomplete' && r.errors && r.errors.length) {
				this.scrollTo('rv-' + r.errors[0].step);
			}
		},
	},
};
</script>

<style>
/* A submitted review reads as done, not as a warning. */
.notice.moss-note {
	background: var(--moss-tint);
	border-color: transparent;
	color: var(--moss-deep);
}
</style>
