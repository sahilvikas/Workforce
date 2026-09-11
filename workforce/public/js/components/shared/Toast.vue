<template>
	<transition name="toast-fade">
		<div v-if="visible" class="wf-toast" :class="'toast-' + type" role="status">
			<svg class="toast-icon" viewBox="0 0 24 24" aria-hidden="true">
				<path v-if="type === 'error'" d="M6 6l12 12M18 6L6 18" />
				<path v-else-if="type === 'info'" d="M12 8v.01M11 12h1v5h1" />
				<path v-else d="M20 6L9 17l-5-5" />
			</svg>
			<span>{{ message }}</span>
		</div>
	</transition>
</template>

<script>
export default {
	name: 'Toast',
	props: {
		message: { type: String, default: '' },
		type: { type: String, default: 'success' },
		visible: { type: Boolean, default: false }
	},
	emits: ['hide'],
	watch: {
		visible(val) {
			if (val) setTimeout(() => this.$emit('hide'), 3000);
		}
	}
};
</script>

<style scoped>
.wf-toast {
	position: fixed;
	left: 50%; bottom: 28px;
	transform: translateX(-50%);
	max-width: calc(100vw - 32px);
	padding: 12px 18px;
	border-radius: 10px;
	font-size: 14px; font-weight: 500;
	z-index: 999;
	display: flex; align-items: center; gap: 10px;
	background: var(--wf-primary-deep, #312E81);
	color: #fff;
	box-shadow: var(--wf-float, 0 20px 50px -14px rgba(49, 46, 129, .28));
}
.toast-error { background: var(--wf-bad-ink, #991B1B); }
.toast-icon { width: 18px; height: 18px; flex: none; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: opacity .25s ease, transform .25s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translate(-50%, 12px); }
</style>