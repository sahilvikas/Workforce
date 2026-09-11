<template>
	<component
		:is="clickable ? 'button' : 'div'"
		class="wf-kpi-card"
		:class="{ clickable, decision: decision && Number(value) > 0, zero: Number(value) === 0 }"
		:type="clickable ? 'button' : null"
		@click="clickable && $emit('click')"
	>
		<span v-if="decision" class="kpi-dm" title="You decide here"></span>
		<span class="kpi-value num">{{ value }}</span>
		<span class="kpi-label">{{ label }}</span>
		<span v-if="sub" class="kpi-sub">{{ sub }}</span>
		<svg v-if="clickable" class="kpi-go" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
	</component>
</template>

<script>
export default {
	name: 'KpiCard',
	props: {
		label: { type: String, required: true },
		value: { type: [String, Number], default: 0 },
		// new, optional (phase 01): existing usages keep working unchanged
		sub: { type: String, default: '' },
		decision: { type: Boolean, default: false },
		clickable: { type: Boolean, default: false }
	},
	emits: ['click']
};
</script>

<style scoped>
.wf-kpi-card {
	position: relative;
	display: flex;
	flex-direction: column;
	gap: 2px;
	text-align: left;
	background: var(--wf-surface, #fff);
	border: 1px solid var(--wf-line, #E5E7EB);
	border-radius: var(--wf-r-panel, 14px);
	padding: 16px 16px 14px;
	min-width: 140px;
	font: inherit;
	color: inherit;
}
.wf-kpi-card.clickable {
	cursor: pointer;
	transition: border-color .15s, box-shadow .15s, transform .15s;
}
.wf-kpi-card.clickable:hover {
	border-color: var(--wf-primary-soft, #E0E7FF);
	box-shadow: 0 8px 22px -14px rgba(49, 46, 129, .45);
	transform: translateY(-1px);
}
.wf-kpi-card.decision { box-shadow: inset 0 3px 0 var(--wf-amber, #F59E0B); }
.kpi-value { font-size: 30px; font-weight: 600; letter-spacing: -.02em; line-height: 1.1; color: var(--wf-primary, #4F46E5); }
.zero .kpi-value { color: #D1D5DB; }
.kpi-label { margin-top: 4px; font-size: 13.5px; font-weight: 600; color: var(--wf-ink, #111827); }
.kpi-sub { font-size: 12.5px; line-height: 1.35; color: var(--wf-mut, #6B7280); }
.kpi-dm {
	position: absolute; top: 16px; right: 16px;
	width: 9px; height: 9px; transform: rotate(45deg);
	border: 2px solid var(--wf-amber, #F59E0B); border-radius: 2px;
}
.kpi-go {
	position: absolute; right: 12px; bottom: 12px;
	width: 15px; height: 15px; fill: none; stroke: #C7D2FE; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round;
	transition: stroke .15s;
}
.wf-kpi-card.clickable:hover .kpi-go { stroke: var(--wf-primary, #4F46E5); }
</style>