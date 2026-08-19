frappe.pages['workforce-hub'].on_page_load = function(wrapper) {
	frappe.require('workforce_hub.bundle.js', () => {
		const page = frappe.ui.make_app_page({
			parent: wrapper,
			title: 'Workforce Hub',
			single_column: true
		});

		$(page.page_container).find('.page-head').hide();

		const el = document.createElement('div');
		el.id = 'workforce-hub-app';
		$(page.body).html(el);

		// Vue 3 (Frappe v15+)
		if (Vue.createApp) {
			const app = Vue.createApp(workforce.ui.WorkforceHub);
			app.mount(el);
		} else {
			// Vue 2 fallback
			new Vue({
				el: el,
				render: h => h(workforce.ui.WorkforceHub)
			});
		}
	});
};