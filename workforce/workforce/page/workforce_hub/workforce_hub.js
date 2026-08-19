frappe.pages['workforce-hub'].on_page_load = function(wrapper) {
	frappe.require('workforce_hub.bundle.js', () => {
		const page = frappe.ui.make_app_page({
			parent: wrapper,
			title: '',
			single_column: true
		});

		// Hide Frappe's default page head completely
		$(wrapper).find('.page-head').hide();
		$(wrapper).find('.page-head-wrapper').hide();

		// Remove default padding from page body
		$(page.body).css({
			'margin': '0',
			'padding': '0'
		});

		const el = document.createElement('div');
		el.id = 'workforce-hub-app';
		$(page.body).html(el);

		workforce.ui.mountHub(el);
	});
};