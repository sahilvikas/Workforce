<template>
	<transition name="panel-slide">
		<div v-if="visible" class="wf-panel-overlay" @click.self="close">
			<div class="wf-panel" :class="'panel-' + size" role="dialog" aria-modal="true">
				<div class="panel-header">
					<h3>{{ title }}</h3>
					<button class="panel-close" type="button" aria-label="Close" @click="close">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
					</button>
				</div>
				<div class="panel-body">
					<slot></slot>
				</div>
				<div class="panel-actions" v-if="$slots.actions">
					<slot name="actions"></slot>
				</div>
			</div>
		</div>
	</transition>
</template>

<script>
export default {
	name: 'DetailPanel',
	props: {
		visible: { type: Boolean, default: false },
		title: { type: String, default: '' },
		size: { type: String, default: 'md' }  // sm | md | lg
	},
	emits: ['close'],
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
.wf-panel-overlay {
	position: fixed;
	top: 60px; left: 0; right: 0; bottom: 0;
	background: rgba(17, 24, 39, 0.40);
	z-index: 190;
	display: flex;
	justify-content: flex-end;
}
.wf-panel {
	background: var(--wf-surface, #fff);
	height: 100%;
	box-shadow: var(--wf-float, 0 20px 50px -14px rgba(49, 46, 129, .28));
	display: flex;
	flex-direction: column;
	overflow: hidden;
}
.panel-sm { width: 400px; }
.panel-md { width: 560px; }
.panel-lg { width: 720px; }
.panel-header {
	display: flex; align-items: center; gap: 12px;
	padding: 20px 26px 16px;
	border-bottom: 1px solid var(--wf-line, #E5E7EB);
	flex-shrink: 0;
}
.panel-header h3 {
	margin: 0; flex: 1;
	font-size: 20px; font-weight: 600; letter-spacing: -.015em; line-height: 1.3;
	color: var(--wf-ink, #111827); word-break: break-word;
}
.panel-close {
	width: 34px; height: 34px; border-radius: 8px;
	border: 0; background: transparent; color: var(--wf-mut, #6B7280);
	display: grid; place-items: center; cursor: pointer; flex-shrink: 0;
}
.panel-close:hover { background: var(--wf-line-2, #F9FAFB); color: var(--wf-ink, #111827); }
.panel-close svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; }
.panel-body { padding: 22px 26px; overflow-y: auto; flex: 1; }
.panel-actions {
	padding: 14px 26px;
	border-top: 1px solid var(--wf-line, #E5E7EB);
	background: #fff;
	display: flex; justify-content: flex-end; gap: 10px;
	flex-shrink: 0;
}
.panel-slide-enter-active,
.panel-slide-leave-active { transition: opacity .2s ease; }
.panel-slide-enter-active .wf-panel,
.panel-slide-leave-active .wf-panel { transition: transform .28s var(--wf-ease, ease); }
.panel-slide-enter-from,
.panel-slide-leave-to { opacity: 0; }
.panel-slide-enter-from .wf-panel,
.panel-slide-leave-to .wf-panel { transform: translateX(100%); }

@media (max-width: 768px) {
	.panel-sm, .panel-md, .panel-lg { width: 100vw; }
	.panel-header { padding: 16px; }
	.panel-body { padding: 16px; }
	.panel-actions { padding: 12px 16px; }
}
</style>