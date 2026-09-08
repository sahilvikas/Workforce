<template>
	<div>
		<div class="row between wrap">
			<div>
				<h2>Reviews waiting for you</h2>
				<p class="muted small mt-1">{{ subline }}</p>
			</div>
		</div>

		<div v-if="!review.windowOpen && review.windowNote" class="notice gold mt-3">{{ review.windowNote }}</div>

		<!-- loading -->
		<div v-if="review.teamLoading && !review.teamLoaded" class="rows mt-3" aria-busy="true">
			<div v-for="n in 4" :key="n" class="team-card flat">
				<Skeleton width="38px" height="38px" radius="50%" />
				<div class="who">
					<Skeleton width="160px" height="15px" />
					<Skeleton width="220px" height="12px" mt="8px" />
				</div>
				<Skeleton width="90px" height="22px" radius="999px" />
			</div>
			<span class="sr-only">Loading your team</span>
		</div>

		<!-- failed -->
		<div v-else-if="review.teamError" class="card mt-3">
			<h3>We couldn’t load your team</h3>
			<p class="mt-2">{{ review.teamError }}</p>
			<Button variant="primary" class="mt-3" @click="reload">Try again</Button>
		</div>

		<!-- empty -->
		<div v-else-if="!rows.length" class="card mt-3">
			<h3>Nobody reports to you in this cycle</h3>
			<p class="muted mt-2">
				If that looks wrong, HR can check who is mapped to you before the review window closes.
			</p>
		</div>

		<!-- the team -->
		<div v-else class="rows mt-3">
			<button
				v-for="row in rows"
				:key="row.appraisal || row.employee"
				type="button"
				class="team-card"
				@click="pick(row)"
			>
				<span class="avatar" :class="avatarTone(row)">{{ initials(row.employee_name) }}</span>
				<span class="who">
					<b>{{ row.employee_name }}</b>
					<span class="small muted">{{ [row.designation, row.department].filter(Boolean).join(' · ') }}</span>
				</span>
				<span class="chip" :class="tone(row.status)"><span class="dot" aria-hidden="true"></span>{{ row.status }}</span>
				<span v-if="dateOf(row)" class="small muted">{{ dateOf(row) }}</span>
				<span class="act" :class="{ muted: !action(row).strong }">{{ action(row).label }}</span>
			</button>
		</div>

		<p v-if="rows.length" class="xs muted mt-3">
			People who haven’t submitted yet can’t be reviewed. HR sends them reminders; you can also just ask.
		</p>
	</div>
</template>

<script>
import { state, fmtDate, initials, toast } from '../store.js';
import {
	review,
	groupedTeam,
	statusTone,
	reviewableCount,
	loadTeam,
} from '../review.js';
import Button from '../ui/Button.vue';
import Skeleton from '../ui/Skeleton.vue';

export default {
	name: 'WfaTeamList',
	components: { Button, Skeleton },
	emits: ['open'],
	data() {
		return { state: state, review: review };
	},
	computed: {
		rows() {
			return groupedTeam();
		},
		subline() {
			const waiting = reviewableCount();
			const total = review.team.length;
			const closes = fmtDate(review.managerEnd);
			const head = waiting + ' of ' + total + ' submitted and waiting';
			return closes ? head + ' · window closes ' + closes : head;
		},
	},
	methods: {
		initials: initials,
		tone: statusTone,
		reload() {
			loadTeam();
		},
		avatarTone(row) {
			const t = statusTone(row.status);
			if (t === 'moss') return 'ink';
			return t === 'gold' ? 'gold' : t === 'sky' ? 'sky' : '';
		},
		dateOf(row) {
			return fmtDate(row.manager_submitted_on || row.submitted_on);
		},
		action(row) {
			if (Number(row.reviewable) && review.windowOpen) return { label: 'Review', strong: true };
			if (Number(row.review_done)) return { label: 'Submitted ✓', strong: true };
			if (Number(row.reviewable) && !review.windowOpen) return { label: 'Window closed', strong: false };
			return { label: 'Waiting for self-appraisal', strong: false };
		},
		pick(row) {
			const openable = (Number(row.reviewable) && review.windowOpen) || Number(row.review_done);
			if (!openable) {
				toast(row.employee_name + ' — ' + row.status);
				return;
			}
			this.$emit('open', row);
		},
	},
};
</script>
