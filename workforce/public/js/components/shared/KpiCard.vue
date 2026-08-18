<template>
	<div class="wf-kpi-card">
		<div class="kpi-value">{{ value }}</div>
		<div class="kpi-label">{{ label }}</div>
	</div>
</template>

<script>
export default {
	name: 'KpiCard',
	props: {
		label: { type: String, required: true },
		value: { type: [String, Number], default: 0 }
	}
};
</script>

<style scoped>
.wf-kpi-card {
	background: #fff;
	border: 1px solid #e5e7eb;
	border-radius: 10px;
	padding: 20px;
	text-align: center;
	min-width: 140px;
	box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
}
.kpi-value { font-size: 28px; font-weight: 700; color: #4f46e5; }
.kpi-label { font-size: 13px; color: #6b7280; margin-top: 4px; }
</style>