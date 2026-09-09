<template>
	<Modal :title="'Calibrate ' + (name || 'this appraisal')" @close="$emit('close')">
		<p class="muted small mt-1">
			The final rating HR records after comparing this review against the rest of the department.
			Both the self and manager scores stay on the record.
		</p>

		<div class="field mt-3">
			<label>HR / management final rating</label>
			<Rating v-model="rating" compact label="HR final rating" />
			<div class="hint">{{ rating ? word : 'Pick a rating from 1 to 5.' }}</div>
		</div>

		<div class="mt-3">
			<TextArea v-model="notes" label="Calibration notes (optional)" />
		</div>

		<div class="row mt-3" style="justify-content:flex-end">
			<Button @click="$emit('close')">Cancel</Button>
			<Button variant="primary" :disabled="!rating || busy" @click="run">
				{{ busy ? 'Saving…' : 'Mark calibrated' }}
			</Button>
		</div>
	</Modal>
</template>

<script>
import { advance, refreshDrawer, toast } from '../hrStore.js';
import { ratingWord } from '../../appraisal/store.js';
import Modal from '../../appraisal/ui/Modal.vue';
import Button from '../../appraisal/ui/Button.vue';
import Rating from '../../appraisal/ui/Rating.vue';
import TextArea from '../../appraisal/ui/TextArea.vue';

export default {
	name: 'CalibrateModal',
	components: { Modal, Button, Rating, TextArea },
	props: {
		appraisal: { type: String, default: '' },
		name: { type: String, default: '' },
	},
	emits: ['close'],
	data() {
		return { rating: 0, notes: '', busy: false };
	},
	computed: {
		word() {
			return ratingWord(this.rating);
		},
	},
	methods: {
		async run() {
			this.busy = true;
			const extra = { hr_rating: this.rating };
			if (this.notes.trim()) extra.notes = this.notes.trim();
			const r = await advance(this.appraisal, 'Calibrated', extra);
			this.busy = false;
			if (r && r.ok) {
				await refreshDrawer();
				toast('Calibrated at ' + this.rating);
				this.$emit('close');
				return;
			}
			if (r && r.message) toast(r.message);
		},
	},
};
</script>
