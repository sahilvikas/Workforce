<template>
	<ApprovalsTab stage="cmo" />
</template>

<script>
// The CMO queue is the same screen as leadership approvals, at a different stage.
// Keeping this file means the Hub's existing route and role rules stay untouched.
import ApprovalsTab from './ApprovalsTab.vue';

export default {
	name: 'CmoApprovalsTab',
	components: { ApprovalsTab }
};
</script>