<template>
	<div class="field">
		<label :for="fieldId">{{ label }}</label>
		<textarea
			:id="fieldId"
			ref="ta"
			class="input"
			:class="{ err: showError }"
			:value="modelValue"
			:placeholder="placeholder"
			:rows="rows"
			:disabled="disabled"
			:aria-invalid="showError ? 'true' : null"
			@input="onInput"
		></textarea>
		<div v-if="count && length" class="counter">{{ length }} characters</div>
		<div v-if="error" class="err-text">{{ error }}</div>
	</div>
</template>

<script>
let uid = 0;

export default {
	name: 'WfaTextArea',
	props: {
		label: { type: String, default: '' },
		modelValue: { type: String, default: '' },
		placeholder: { type: String, default: '' },
		rows: { type: Number, default: 3 },
		invalid: { type: Boolean, default: false },
		error: { type: String, default: '' },
		disabled: { type: Boolean, default: false },
		// Plain character count, no target. Off by default.
		count: { type: Boolean, default: false },
	},
	emits: ['update:modelValue'],
	data() {
		return { fieldId: 'wfa-t-' + ++uid };
	},
	computed: {
		length() {
			return String(this.modelValue || '').length;
		},
		showError() {
			return this.invalid || !!this.error;
		},
	},
	watch: {
		// Grow when the value arrives from a loaded draft, not only when typed.
		modelValue() {
			this.$nextTick(this.grow);
		},
	},
	mounted() {
		this.grow();
	},
	methods: {
		onInput(e) {
			this.$emit('update:modelValue', e.target.value);
			this.grow();
		},
		// CSS caps the height at 60vh and turns on the inner scrollbar there.
		grow() {
			const el = this.$refs.ta;
			if (!el) return;
			el.style.height = 'auto';
			el.style.height = el.scrollHeight + 'px';
		},
	},
};
</script>
