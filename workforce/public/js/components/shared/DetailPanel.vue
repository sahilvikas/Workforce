<template>
	<div v-if="visible" class="wf-dialog-overlay" @click.self="close">
		<div class="wf-dialog" :class="'dialog-' + size">
			<div class="dialog-header">
				<h3>{{ title }}</h3>
				<button class="dialog-close" @click="close">&times;</button>
			</div>
			<div class="dialog-body">
				<slot></slot>
			</div>
			<div class="dialog-footer">
				<button class="btn-secondary" @click="close">Cancel</button>
				<button class="btn-primary" @click="$emit('submit')" :disabled="loading">
					{{ loading ? 'Saving...' : submitLabel }}
				</button>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'Dialog',
	props: {
		visible: { type: Boolean, default: false },
		title: { type: String, default: '' },
		submitLabel: { type: String, default: 'Save' },
		loading: { type: Boolean, default: false },
		size: { type: String, default: 'md' }
	},
	methods: {
		close() { this.$emit('close'); }
	},
	watch: {
		visible(val) {
			document.body.style.overflow = val ? 'hidden' : '';
		}
	}
};
</script>

<style scoped>
.wf-dialog-overlay {
	position: fixed;
	top: 60px;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.4);
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
}
.wf-dialog {
	background: #fff;
	border-radius: 12px;
	box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
	display: flex;
	flex-direction: column;
	max-height: calc(85vh - 60px);
	animation: fadeUp 0.2s ease;
}
@keyframes fadeUp {
	from { opacity: 0; transform: translateY(20px); }
	to { opacity: 1; transform: translateY(0); }
}
.dialog-sm { width: 420px; }
.dialog-md { width: 560px; }
.dialog-lg { width: 720px; }
.dialog-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px 24px;
	border-bottom: 1px solid #e5e7eb;
}
.dialog-header h3 { margin: 0; font-size: 18px; font-weight: 600; }
.dialog-close {
	background: none; border: none;
	font-size: 22px; color: #6b7280; cursor: pointer;
}
.dialog-body { padding: 24px; overflow-y: auto; flex: 1; }
.dialog-footer {
	padding: 16px 24px;
	border-top: 1px solid #e5e7eb;
	display: flex;
	justify-content: flex-end;
	gap: 10px;
}
.btn-primary {
	background: #4f46e5; color: #fff; border: none;
	padding: 10px 24px; border-radius: 8px;
	font-weight: 600; cursor: pointer; font-size: 14px;
}
.btn-primary:hover { background: #4338ca; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-secondary {
	background: #fff; color: #374151;
	border: 1px solid #d1d5db;
	padding: 10px 24px; border-radius: 8px;
	font-weight: 500; cursor: pointer; font-size: 14px;
}
.btn-secondary:hover { background: #f9fafb; }

@media (max-width: 768px) {
	.dialog-sm, .dialog-md, .dialog-lg { width: 95vw; }
	.dialog-header { padding: 16px; }
	.dialog-body { padding: 16px; }
	.dialog-footer { padding: 12px 16px; }
}
</style>