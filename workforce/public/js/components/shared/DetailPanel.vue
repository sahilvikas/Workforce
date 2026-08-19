<template>
	<div v-if="visible" class="wf-panel-overlay" @click.self="close">
		<div class="wf-panel">
			<div class="panel-header">
				<h3>{{ title }}</h3>
				<button class="panel-close" @click="close">&times;</button>
			</div>
			<div class="panel-body">
				<slot></slot>
			</div>
			<div v-if="$slots.actions" class="panel-actions">
				<slot name="actions"></slot>
			</div>
		</div>
	</div>
</template>

<script>
export default {
	name: 'DetailPanel',
	props: {
		visible: { type: Boolean, default: false },
		title: { type: String, default: 'Details' }
	},
	methods: {
		close() {
			this.$emit('close');
		}
	},
	watch: {
		visible(val) {
			document.body.style.overflow = val ? 'hidden' : '';
		}
	}
};
</script>

<style scoped>
.wf-panel-overlay {
	position: fixed;
	top: 0; left: 0; right: 0; bottom: 0;
	background: rgba(0, 0, 0, 0.3);
	z-index: 100;
	display: flex;
	justify-content: flex-end;
}
.wf-panel {
	width: 520px;
	max-width: 90vw;
	background: #fff;
	height: 100%;
	display: flex;
	flex-direction: column;
	box-shadow: -4px 0 20px rgba(0, 0, 0, 0.1);
	animation: slideIn 0.25s ease;
}
@keyframes slideIn {
	from { transform: translateX(100%); }
	to { transform: translateX(0); }
}
.panel-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 20px 24px;
	border-bottom: 1px solid #e5e7eb;
}
.panel-header h3 { margin: 0; font-size: 18px; font-weight: 600; }
.panel-close {
	background: none; border: none;
	font-size: 24px; color: #6b7280; cursor: pointer;
}
.panel-close:hover { color: #111827; }
.panel-body { flex: 1; overflow-y: auto; padding: 24px; }
.panel-actions {
	padding: 16px 24px;
	border-top: 1px solid #e5e7eb;
	display: flex; gap: 10px;
}
</style>