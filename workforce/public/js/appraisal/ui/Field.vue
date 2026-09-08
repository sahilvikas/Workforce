<template>
	<div class="field">
		<label :for="fieldId">{{ label }}</label>
		<input
			v-if="!$slots.default"
			:id="fieldId"
			class="input"
			:class="{ err: !!error }"
			:type="type"
			:value="modelValue"
			:placeholder="placeholder"
			:disabled="disabled"
			:autocomplete="autocomplete"
			:aria-invalid="error ? 'true' : null"
			:aria-describedby="error ? fieldId + '-err' : hint ? fieldId + '-hint' : null"
			@input="$emit('update:modelValue', $event.target.value)"
			@keyup.enter="$emit('enter')"
		/>
		<slot :id="fieldId" />
		<div v-if="error" :id="fieldId + '-err'" class="err-text">{{ error }}</div>
		<div v-else-if="hint" :id="fieldId + '-hint'" class="hint">{{ hint }}</div>
	</div>
</template>

<script>
let uid = 0;

export default {
	name: 'WfaField',
	props: {
		label: { type: String, default: '' },
		modelValue: { type: [String, Number], default: '' },
		type: { type: String, default: 'text' },
		placeholder: { type: String, default: '' },
		hint: { type: String, default: '' },
		error: { type: String, default: '' },
		disabled: { type: Boolean, default: false },
		autocomplete: { type: String, default: 'off' },
	},
	emits: ['update:modelValue', 'enter'],
	data() {
		return { fieldId: 'wfa-f-' + ++uid };
	},
};
</script>
