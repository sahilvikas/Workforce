/* Entry point for the appraisal app served at /appraisal?t=<token>.
 *
 * Frappe's esbuild picks up every *.bundle.js under public/js automatically and
 * writes a hashed file, which include_script('appraisal.bundle.js') resolves
 * from assets.json. Nothing here is referenced by a fixed filename.
 *
 * Styles: the SFC <style> blocks and theme.css are collected by frappe's
 * esbuild vue-style plugin into a frappe.dom.set_style(...) call prepended to
 * this bundle. The page shims frappe.dom.set_style before loading it.
 */

import { createApp } from 'vue';
import './appraisal/theme.css';
import App from './appraisal/App.vue';

function mount() {
	const el = document.getElementById('appraisal-root');
	if (!el) return;
	createApp(App).mount(el);
}

if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', mount);
} else {
	mount();
}
