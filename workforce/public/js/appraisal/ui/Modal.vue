<template>
	<div class="modal-bg" role="dialog" aria-modal="true" :aria-label="title" @keydown.esc="$emit('close')">
		<div ref="box" class="modal" tabindex="-1">
			<h2 v-if="title">{{ title }}</h2>
			<slot />
		</div>
	</div>
</template>

<script>
export default {
	name: 'WfaModal',
	props: {
		title: { type: String, default: '' },
	},
	emits: ['close'],
	mounted() {
		if (this.$refs.box) this.$refs.box.focus();
	},
};
</script>
