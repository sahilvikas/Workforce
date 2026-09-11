<template>
	<span class="wf-badge" :class="'tone-' + tone">{{ label }}</span>
</template>

<script>
import { toneFor } from '../utils/statusMeta.js';

export default {
	name: 'Badge',
	props: {
		label: { type: String, required: true }
	},
	computed: {
		tone() {
			return toneFor(this.label);
		}
	}
};
</script>

<style scoped>
.wf-badge {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	height: 24px;
	padding: 0 10px;
	border-radius: 999px;
	font-size: 12.5px;
	font-weight: 500;
	white-space: nowrap;
	line-height: 1;
}
.wf-badge::before {
	content: "";
	width: 6px;
	height: 6px;
	border-radius: 50%;
	background: currentColor;
	flex: none;
}
.tone-ok { background: var(--wf-ok-tint, #DCFCE7); color: var(--wf-ok, #166534); }
.tone-ok::before { background: var(--wf-ok-dot, #10B981); }
.tone-hold { background: var(--wf-hold-tint, #FEF3C7); color: var(--wf-hold, #92400E); }
.tone-primary { background: var(--wf-primary-tint, #EEF2FF); color: var(--wf-primary-2, #4338CA); }
.tone-decision { background: var(--wf-amber-tint, #FEF3C7); color: var(--wf-amber-ink, #92400E); }
.tone-decision::before { background: var(--wf-amber, #F59E0B); }
.tone-bad { background: var(--wf-bad-tint, #FEE2E2); color: var(--wf-bad-ink, #991B1B); }
.tone-grey { background: #F3F4F6; color: var(--wf-mut, #6B7280); }
</style>