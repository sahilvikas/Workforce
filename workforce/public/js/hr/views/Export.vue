<template>
	<div>
		<div class="head">
			<div>
				<h1>Export</h1>
				<p>Two shapes. Both are plain CSV that opens cleanly in Excel or Google Sheets.</p>
			</div>
		</div>

		<div class="two">
			<div class="card">
				<h3>Wide — one row per person</h3>
				<p class="small muted mt-1">
					Every field flat: details, each KRA’s target / result / self / manager rating, all
					free-text answers, scores, stage dates. Good for the calibration meeting.
				</p>
				<Button variant="primary" class="mt-3" :disabled="!!hr.exporting" @click="run('wide')">
					{{ hr.exporting === 'wide' ? 'Preparing…' : 'Download wide CSV' }}
				</Button>
			</div>

			<div class="card">
				<h3>Long — one row per KRA</h3>
				<p class="small muted mt-1">
					Person × KRA rows with weight, target, result, both ratings and comments. Pivot-friendly.
				</p>
				<Button variant="primary" class="mt-3" :disabled="!!hr.exporting" @click="run('long')">
					{{ hr.exporting === 'long' ? 'Preparing…' : 'Download long CSV' }}
				</Button>

				<div class="sec">
					<h3>Per-person PDF</h3>
					<p class="small muted mt-1">
						Open any person in Monitor → “Print view” → save as PDF. Same layout as the paper form.
					</p>
				</div>
			</div>
		</div>

		<p class="xs muted mt-3">
			People marked Not Applicable — the CEO and manager-only token holders — are left out of both
			exports.
		</p>
	</div>
</template>

<script>
import { hr, exportRows, isoDay, today, toast } from '../hrStore.js';
import { downloadCsv } from '../csv.js';
import Button from '../../appraisal/ui/Button.vue';

export default {
	name: 'HrExport',
	components: { Button },
	data() {
		return { hr: hr };
	},
	methods: {
		async run(shape) {
			hr.exporting = shape;
			const r = await exportRows(shape);
			hr.exporting = '';
			if (!r || !r.ok) {
				toast((r && r.message) || 'Something went wrong. Please try again.');
				return;
			}
			const rows = [r.columns || []].concat(r.rows || []);
			const cycle = String(r.cycle || hr.cycleName || 'cycle').replace(/[^A-Za-z0-9_-]+/g, '-');
			downloadCsv(cycle + '-' + shape + '-' + isoDay(today()) + '.csv', rows);
			toast((r.count || 0) + ' row' + ((r.count || 0) === 1 ? '' : 's') + ' downloaded');
		},
	},
};
</script>
