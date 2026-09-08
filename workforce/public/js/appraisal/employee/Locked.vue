<template>
	<div class="screen">
		<div class="card">
			<h2>This link is locked</h2>
			<p v-if="message" class="mt-2">{{ message }}</p>
			<p v-else class="muted mt-2">
				Too many wrong passwords. HR has been notified and can unlock it for you.
			</p>
			<p class="small muted mt-3">There is nothing to retry here — ask HR to unlock the link.</p>
		</div>
	</div>
</template>

<script>
export default {
	name: 'WfaLocked',
	props: {
		// Whatever the server said, shown exactly as it said it.
		message: { type: String, default: '' },
	},
};
</script>
