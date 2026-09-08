<template>
	<span class="chip" :class="tone"><slot /></span>
</template>

<script>
export default {
	name: 'WfaChip',
	props: {
		tone: { type: String, default: '' },
	},
};
</script>
