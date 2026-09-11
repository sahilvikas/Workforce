<template>
	<div v-if="visible" class="wf-dialog-overlay" @click.self="close">
		<div class="wf-dialog" :class="'dialog-' + size" role="dialog" aria-modal="true">
			<div class="dialog-header">
				<h3>{{ title }}</h3>
				<button class="dialog-close" type="button" aria-label="Close" @click="close">
					<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
				</button>
			</div>
			<div class="dialog-body">
				<slot></slot>
			</div>
			<div class="dialog-footer">
				<div class="dialog-footer-left">
					<slot name="footer-extra"></slot>
				</div>
				<div class="dialog-footer-right">
					<button class="btn-secondary" type="button" @click="close">Cancel</button>
					<button class="btn-primary" type="button" @click="$emit('submit')" :disabled="loading">
						{{ loading ? 'Saving...' : submitLabel }}
					</button>
				</div>
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
	emits: ['close', 'submit'],
	methods: {
		close() { this.$emit('close'); },
		onKey(e) { if (e.key === 'Escape' && this.visible) this.close(); }
	},
	watch: {
		visible(val) {
			document.body.style.overflow = val ? 'hidden' : '';
		}
	},
	mounted() { document.addEventListener('keydown', this.onKey); },
	beforeUnmount() {
		document.removeEventListener('keydown', this.onKey);
		document.body.style.overflow = '';
	}
};
</script>

<style scoped>
.wf-dialog-overlay {
	position: fixed;
	top: 60px; left: 0; right: 0; bottom: 0;
	background: rgba(17, 24, 39, 0.40);
	z-index: 200;
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 16px;
}
.wf-dialog {
	background: var(--wf-surface, #fff);
	border-radius: 16px;
	box-shadow: var(--wf-float, 0 20px 50px -14px rgba(49, 46, 129, .28));
	display: flex;
	flex-direction: column;
	max-height: calc(85vh - 60px);
	animation: wfDialogIn .2s var(--wf-ease, ease);
}
@keyframes wfDialogIn {
	from { opacity: 0; transform: translateY(12px); }
	to { opacity: 1; transform: none; }
}
.dialog-sm { width: 440px; }
.dialog-md { width: 560px; }
.dialog-lg { width: 720px; }
.dialog-header {
	display: flex; align-items: center; gap: 12px;
	padding: 20px 24px 16px;
	border-bottom: 1px solid var(--wf-line, #E5E7EB);
}
.dialog-header h3 { margin: 0; font-size: 18px; font-weight: 600; letter-spacing: -.01em; color: var(--wf-ink, #111827); flex: 1; }
.dialog-close {
	width: 34px; height: 34px; border-radius: 8px;
	border: 0; background: transparent; color: var(--wf-mut, #6B7280);
	display: grid; place-items: center; cursor: pointer;
}
.dialog-close:hover { background: var(--wf-line-2, #F9FAFB); color: var(--wf-ink, #111827); }
.dialog-close svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.dialog-body { padding: 22px 24px; overflow-y: auto; flex: 1; }
.dialog-footer {
	padding: 14px 24px;
	border-top: 1px solid var(--wf-line, #E5E7EB);
	display: flex; justify-content: space-between; align-items: center; gap: 10px;
}
.dialog-footer-left { display: flex; gap: 10px; }
.dialog-footer-left:empty { display: none; }
.dialog-footer-right { display: flex; gap: 10px; margin-left: auto; }
.btn-primary {
	height: 38px; padding: 0 18px; border-radius: var(--wf-r-ctl, 9px);
	background: var(--wf-primary, #4F46E5); color: #fff; border: 1px solid var(--wf-primary, #4F46E5);
	font-weight: 500; font-size: 14px; cursor: pointer;
}
.btn-primary:hover { background: var(--wf-primary-2, #4338CA); border-color: var(--wf-primary-2, #4338CA); }
.btn-primary:disabled { opacity: .5; cursor: not-allowed; }
.btn-secondary {
	height: 38px; padding: 0 16px; border-radius: var(--wf-r-ctl, 9px);
	background: #fff; color: var(--wf-ink-2, #374151); border: 1px solid var(--wf-line, #E5E7EB);
	font-weight: 500; font-size: 14px; cursor: pointer;
}
.btn-secondary:hover { background: var(--wf-line-2, #F9FAFB); border-color: #D1D5DB; }

@media (max-width: 768px) {
	.dialog-sm, .dialog-md, .dialog-lg { width: 100%; }
	.dialog-header { padding: 16px; }
	.dialog-body { padding: 16px; }
	.dialog-footer { padding: 12px 16px; flex-direction: column; align-items: stretch; }
	.dialog-footer-right { justify-content: flex-end; }
}
</style>