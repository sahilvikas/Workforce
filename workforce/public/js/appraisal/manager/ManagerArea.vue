<template>
	<div>
		<div class="mgr-tabs">
			<div class="tabs" role="tablist" aria-label="Appraisal sections">
				<button
					type="button"
					role="tab"
					:aria-selected="state.tab === 'team' ? 'true' : 'false'"
					:class="{ on: state.tab === 'team' }"
					@click="go('team')"
				>
					My team
					<span v-if="badge" class="badge">{{ badge }}</span>
					<span v-if="badge" class="sr-only">reviews waiting</span>
				</button>
				<button
					v-if="state.hasOwnForm"
					type="button"
					role="tab"
					:aria-selected="state.tab === 'mine' ? 'true' : 'false'"
					:class="{ on: state.tab === 'mine' }"
					@click="go('mine')"
				>
					My appraisal
				</button>
			</div>
		</div>

		<div v-if="state.tab === 'team'" class="mgr stepwrap">
			<transition :name="dir" mode="out-in">
				<TeamList v-if="!review.open" key="list" @open="open" />
				<ReviewPanel v-else key="panel" @back="back" />
			</transition>
		</div>

		<EmployeeArea v-else @print="$emit('print')" />
	</div>
</template>

<script>
import { state, rememberTab } from '../store.js';
import { review, loadTeam, openReview, closeReview, reviewableCount } from '../review.js';
import TeamList from './TeamList.vue';
import ReviewPanel from './ReviewPanel.vue';
import EmployeeArea from '../employee/EmployeeArea.vue';

export default {
	name: 'WfaManagerArea',
	components: { TeamList, ReviewPanel, EmployeeArea },
	emits: ['print'],
	data() {
		return { state: state, review: review, dir: 'slide' };
	},
	computed: {
		badge() {
			return reviewableCount();
		},
	},
	created() {
		if (!review.teamLoaded && !review.teamLoading) loadTeam();
	},
	methods: {
		go(tab) {
			if (state.tab === tab) return;
			rememberTab(tab);
			window.scrollTo({ top: 0, behavior: 'auto' });
		},
		open(row) {
			this.dir = 'slide';
			openReview(row);
			window.scrollTo({ top: 0, behavior: 'auto' });
		},
		async back() {
			this.dir = 'slideback';
			await closeReview();
			window.scrollTo({ top: 0, behavior: 'auto' });
		},
	},
};
</script>
