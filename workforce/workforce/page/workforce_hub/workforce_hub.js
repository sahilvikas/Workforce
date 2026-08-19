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

		workforce.ui.mountHub(el);
	});
};