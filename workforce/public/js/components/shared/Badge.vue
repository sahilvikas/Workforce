<template>
	<span class="wf-badge" :class="colorClass">{{ label }}</span>
</template>

<script>
const COLOR_MAP = {
	'Open': 'green', 'On Hold': 'orange', 'Closed': 'gray',
	'Applied': 'blue', 'Under Screening': 'orange', 'Shortlisted': 'green',
	'Rejected at Screening': 'red', 'Interview Scheduled': 'blue',
	'Interview In Progress': 'orange', 'All Rounds Complete': 'purple',
	'Selected': 'green', 'Not Selected': 'red', 'Offer Sent': 'blue',
	'Offer Accepted': 'green', 'Offer Declined': 'red',
	'Onboarding Initiated': 'purple',
	'Scheduled': 'blue', 'In Progress': 'orange', 'Completed': 'green',
	'Cancelled': 'gray', 'Pending': 'orange', 'Invited': 'blue',
	'Responded': 'green', 'Declined': 'red', 'Rejected': 'red',
	'Strongly Recommend': 'green', 'Recommend': 'green',
	'Neutral': 'orange', 'Do Not Recommend': 'red'
};

export default {
	name: 'Badge',
	props: {
		label: { type: String, required: true }
	},
	computed: {
		colorClass() {
			return 'badge-' + (COLOR_MAP[this.label] || 'gray');
		}
	}
};
</script>

<style scoped>
.wf-badge {
	display: inline-block;
	padding: 3px 10px;
	border-radius: 12px;
	font-size: 12px;
	font-weight: 600;
	white-space: nowrap;
}
.badge-green { background: #dcfce7; color: #166534; }
.badge-red { background: #fee2e2; color: #991b1b; }
.badge-blue { background: #dbeafe; color: #1e40af; }
.badge-orange { background: #ffedd5; color: #9a3412; }
.badge-purple { background: #f3e8ff; color: #6b21a8; }
.badge-gray { background: #f3f4f6; color: #4b5563; }
</style>