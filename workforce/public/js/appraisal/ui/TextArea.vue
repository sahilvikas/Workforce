<template>
	<div class="field">
		<label :for="fieldId">{{ label }}</label>
		<textarea
			:id="fieldId"
			class="input"
			:class="{ err: showError }"
			:value="modelValue"
			:placeholder="placeholder"
			:rows="rows"
			:disabled="disabled"
			:aria-invalid="showError ? 'true' : null"
			:aria-describedby="min ? fieldId + '-c' : null"
			@input="$emit('update:modelValue', $event.target.value)"
		></textarea>
		<div v-if="min" :id="fieldId + '-c'" class="counter" :class="{ ok: length >= min }">
			{{ length }} / {{ min }} min
		</div>
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
		min: { type: Number, default: 0 },
		rows: { type: Number, default: 3 },
		invalid: { type: Boolean, default: false },
		error: { type: String, default: '' },
		disabled: { type: Boolean, default: false },
	},
	emits: ['update:modelValue'],
	data() {
		return { fieldId: 'wfa-t-' + ++uid };
	},
	computed: {
		length() {
			return String(this.modelValue || '').trim().length;
		},
		showError() {
			return this.invalid || !!this.error;
		},
	},
};
</script>
