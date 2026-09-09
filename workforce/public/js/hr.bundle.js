/* Entry point for the HR console at /hr.
 *
 * Same pattern as appraisal.bundle.js: frappe's esbuild picks up every
 * *.bundle.js under public/js and writes a hashed file that
 * include_script('hr.bundle.js') resolves from assets.json.
 *
 * The stylesheet is the appraisal app's — one design system, one file — with
 * the HR classes appended to it. Styles reach the page through
 * frappe.dom.set_style(), which www/hr/index.html shims before this loads.
 */

import { createApp } from 'vue';
import './appraisal/theme.css';
import HrApp from './hr/HrApp.vue';

function mount() {
	const el = document.getElementById('hr-root');
	if (!el) return;
	createApp(HrApp).mount(el);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', mount);
} else {
	mount();
}
