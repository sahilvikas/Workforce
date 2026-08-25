<template>
	<transition name="panel-slide">
		<div v-if="visible" class="wf-panel-overlay" @click.self="close">
			<div class="wf-panel" :class="'panel-' + size">
				<div class="panel-header">
					<h3>{{ title }}</h3>
					<button class="panel-close" @click="close">&times;</button>
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
	methods: {
		close() { this.$emit('close'); }
	},
	watch: {
		visible(val) {
			document.body.style.overflow = val ? 'hidden' : '';
		}
	},
	beforeUnmount() {
		document.body.style.overflow = '';
	}
};
</script>

<style scoped>
.wf-panel-overlay {
	position: fixed;
	top: 60px;
	left: 0;
	right: 0;
	bottom: 0;
	background: rgba(0, 0, 0, 0.3);
	z-index: 190;
	display: flex;
	justify-content: flex-end;
}

.wf-panel {
	background: #fff;
	height: 100%;
	box-shadow: -8px 0 40px rgba(0, 0, 0, 0.12);
	display: flex;
	flex-direction: column;
	overflow: hidden;
}

.panel-sm { width: 380px; }
.panel-md { width: 520px; }
.panel-lg { width: 680px; }

.panel-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px 24px;
	border-bottom: 1px solid #e5e7eb;
	background: #f9fafb;
	flex-shrink: 0;
}
.panel-header h3 {
	margin: 0;
	font-size: 17px;
	font-weight: 600;
	color: #111827;
	line-height: 1.3;
	word-break: break-word;
	padding-right: 12px;
}
.panel-close {
	background: none;
	border: none;
	font-size: 24px;
	color: #6b7280;
	cursor: pointer;
	padding: 0;
	line-height: 1;
	flex-shrink: 0;
}
.panel-close:hover { color: #111827; }

.panel-body {
	padding: 20px 24px;
	overflow-y: auto;
	flex: 1;
}

.panel-actions {
	padding: 16px 24px;
	border-top: 1px solid #e5e7eb;
	background: #fff;
	display: flex;
	justify-content: flex-end;
	gap: 10px;
	flex-shrink: 0;
}

/* Slide-in animation */
.panel-slide-enter-active,
.panel-slide-leave-active {
	transition: opacity 0.2s ease;
}
.panel-slide-enter-active .wf-panel,
.panel-slide-leave-active .wf-panel {
	transition: transform 0.25s ease;
}
.panel-slide-enter-from,
.panel-slide-leave-to {
	opacity: 0;
}
.panel-slide-enter-from .wf-panel,
.panel-slide-leave-to .wf-panel {
	transform: translateX(100%);
}

@media (max-width: 768px) {
	.panel-sm, .panel-md, .panel-lg { width: 100vw; }
	.panel-header { padding: 16px; }
	.panel-body { padding: 16px; }
	.panel-actions { padding: 12px 16px; }
}
</style>