<template>
	<div class="skel" :style="style" aria-hidden="true"></div>
</template>

<script>
export default {
	name: 'WfaSkeleton',
	props: {
		width: { type: String, default: '100%' },
		height: { type: String, default: '14px' },
		radius: { type: String, default: '6px' },
		mt: { type: String, default: '0' },
	},
	computed: {
		style() {
			return {
				width: this.width,
				height: this.height,
				borderRadius: this.radius,
				marginTop: this.mt,
			};
		},
	},
};
</script>
