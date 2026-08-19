import { createApp } from 'vue';
import WorkforceHub from './components/WorkforceHub.vue';

// Register mount function globally
if (!window.workforce) window.workforce = {};
if (!window.workforce.ui) window.workforce.ui = {};
window.workforce.ui.mountHub = function(el) {
	const app = createApp(WorkforceHub);
	app.mount(el);
};