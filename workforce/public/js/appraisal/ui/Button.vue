<template>
	<button
		:type="type"
		class="btn"
		:class="[variant, { sm: size === 'sm', block: block }]"
		:disabled="disabled"
		@click="$emit('click', $event)"
	>
		<slot />
	</button>
</template>

<script>
export default {
	name: 'WfaButton',
	props: {
		variant: { type: String, default: '' },
		size: { type: String, default: '' },
		block: { type: Boolean, default: false },
		disabled: { type: Boolean, default: false },
		type: { type: String, default: 'button' },
	},
	emits: ['click'],
};
</script>
