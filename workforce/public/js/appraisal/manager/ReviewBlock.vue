<template>
	<div class="review">
		<div class="rowhead">
			<span>{{ title }}</span>
			<span v-if="weight" class="w">{{ weight }}%</span>
		</div>

		<div class="side left">
			<h4>What {{ firstName }} wrote</h4>
			<slot />
			<div class="mt-2 row">
				<span class="small muted">Self rating</span>
				<span class="chip moss">{{ selfRating || '–' }}<template v-if="selfRating"> · {{ word(selfRating) }}</template></span>
			</div>
		</div>

		<div class="side">
			<h4>Your rating</h4>
			<Rating
				:model-value="rating"
				compact
				:readonly="readonly"
				:label="'Your rating for ' + title"
				@update:model-value="$emit('update:rating', $event)"
			/>
			<div class="row between mt-1 gapline">
				<span class="xs muted">{{ rating ? word(rating) : 'Pick a rating' }}</span>
				<span v-if="rating && selfRating" class="xs g" :class="wide ? 'err-text' : 'muted'">{{ gap }}</span>
			</div>
			<div class="mt-2">
				<TextArea
					:model-value="comment"
					label="Comment"
					placeholder="Why this rating? Point at the evidence."
					:disabled="readonly"
					@update:model-value="$emit('update:comment', $event)"
				/>
			</div>
		</div>
	</div>
</template>

<script>
import { ratingWord } from '../store.js';
import { gapText, gapIsWide } from '../review.js';
import Rating from '../ui/Rating.vue';
import TextArea from '../ui/TextArea.vue';

export default {
	name: 'WfaReviewBlock',
	components: { Rating, TextArea },
	props: {
		title: { type: String, default: '' },
		weight: { type: [Number, String], default: 0 },
		firstName: { type: String, default: '' },
		selfRating: { type: [Number, String], default: 0 },
		rating: { type: [Number, String], default: 0 },
		comment: { type: String, default: '' },
		readonly: { type: Boolean, default: false },
	},
	emits: ['update:rating', 'update:comment'],
	computed: {
		gap() {
			return gapText(this.rating, this.selfRating);
		},
		wide() {
			return gapIsWide(this.rating, this.selfRating);
		},
	},
	methods: {
		word(n) {
			return ratingWord(n);
		},
	},
};
</script>
