<template>
	<transition name="toast-fade">
		<div v-if="visible" class="wf-toast" :class="'toast-' + type">
			<span class="toast-icon">{{ icon }}</span>
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
	computed: {
		icon() {
			return { success: '✓', error: '✕', info: 'ℹ' }[this.type] || 'ℹ';
		}
	},
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
	top: 20px; right: 20px;
	padding: 12px 20px;
	border-radius: 8px;
	font-size: 14px; font-weight: 500;
	z-index: 999;
	display: flex; align-items: center; gap: 8px;
	box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}
.toast-success { background: #dcfce7; color: #166534; }
.toast-error { background: #fee2e2; color: #991b1b; }
.toast-info { background: #dbeafe; color: #1e40af; }
.toast-icon { font-weight: 700; }
.toast-fade-enter-active, .toast-fade-leave-active { transition: all 0.3s ease; }
.toast-fade-enter-from, .toast-fade-leave-to { opacity: 0; transform: translateY(-10px); }
</style>