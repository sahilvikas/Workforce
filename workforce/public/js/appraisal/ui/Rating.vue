<template>
	<div class="rating" :class="{ compact: compact, readonly: readonly, err: invalid }" role="group" :aria-label="groupLabel">
		<button
			v-for="n in 5"
			:key="n"
			type="button"
			:class="['r' + n, { on: Number(modelValue) === n }]"
			:aria-pressed="Number(modelValue) === n ? 'true' : 'false'"
			:aria-label="n + ' — ' + word(n)"
			:disabled="readonly"
			@click="pick(n)"
		>
			<span class="n" aria-hidden="true">{{ n }}</span>
			<span class="w" aria-hidden="true">{{ word(n) }}</span>
		</button>
	</div>
</template>

<script>
import { ratingWord } from '../store.js';

export default {
	name: 'WfaRating',
	props: {
		modelValue: { type: [Number, String], default: 0 },
		compact: { type: Boolean, default: false },
		readonly: { type: Boolean, default: false },
		invalid: { type: Boolean, default: false },
		label: { type: String, default: 'Self rating' },
	},
	emits: ['update:modelValue'],
	computed: {
		groupLabel() {
			return this.label + ', 1 to 5';
		},
	},
	methods: {
		word(n) {
			return ratingWord(n);
		},
		pick(n) {
			if (this.readonly) return;
			this.$emit('update:modelValue', Number(this.modelValue) === n ? 0 : n);
		},
	},
};
</script>
