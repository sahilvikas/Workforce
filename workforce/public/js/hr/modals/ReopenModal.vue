<template>
	<Modal :title="title" @close="$emit('close')">
		<p class="muted small mt-1">{{ blurb }}</p>

		<div class="mt-3">
			<TextArea
				v-model="reason"
				label="Reason (goes in the email)"
				placeholder="e.g. KRA 3 result refers to the wrong period — please correct."
			/>
		</div>

		<div class="row mt-3" style="justify-content:flex-end">
			<Button @click="$emit('close')">Cancel</Button>
			<Button variant="danger" :disabled="!reason.trim() || busy" @click="run">
				{{ busy ? 'Reopening…' : 'Reopen and notify' }}
			</Button>
		</div>
	</Modal>
</template>

<script>
import { reopen, refreshDrawer, toast } from '../hrStore.js';
import Modal from '../../appraisal/ui/Modal.vue';
import Button from '../../appraisal/ui/Button.vue';
import TextArea from '../../appraisal/ui/TextArea.vue';

export default {
	name: 'ReopenModal',
	components: { Modal, Button, TextArea },
	props: {
		appraisal: { type: String, default: '' },
		name: { type: String, default: '' },
		target: { type: String, default: 'employee' },
	},
	emits: ['close'],
	data() {
		return { reason: '', busy: false };
	},
	computed: {
		title() {
			return 'Reopen ' + (this.name ? this.name + '’s' : 'this') + ' appraisal';
		},
		blurb() {
			return this.target === 'manager'
				? 'The manager’s ratings stay. It goes back to Manager Review and they are emailed the reason.'
				: 'Their answers stay. They get an email explaining what to change and the form unlocks for them.';
		},
	},
	methods: {
		async run() {
			this.busy = true;
			const r = await reopen(this.appraisal, this.reason.trim(), this.target);
			this.busy = false;
			if (r && r.ok) {
				await refreshDrawer();
				toast(r.message || 'Reopened and emailed');
				this.$emit('close');
				return;
			}
			if (r && r.message) toast(r.message);
		},
	},
};
</script>
