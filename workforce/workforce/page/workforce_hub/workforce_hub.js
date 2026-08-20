frappe.pages['workforce-hub'].on_page_load = function(wrapper) {
	frappe.require('workforce_hub.bundle.js', () => {
		const page = frappe.ui.make_app_page({
			parent: wrapper,
			title: '',
			single_column: true
		});

		// Hide Frappe's default page head
		$(wrapper).find('.page-head').hide();
		$(wrapper).find('.page-head-wrapper').hide();

		// Override container width for this page only
		const style = document.createElement('style');
		style.textContent = `
			[data-page-container="workforce-hub"] .container-xl,
			[data-page-container="workforce-hub"] .container-lg,
			[data-page-container="workforce-hub"] .container-md,
			[data-page-container="workforce-hub"] .container-sm,
			[data-page-container="workforce-hub"] .container {
				max-width: 100% !important;
			}
			[data-page-container="workforce-hub"] .page-body {
				margin: 0 !important;
				padding: 0 !important;
			}
		`;
		document.head.appendChild(style);
		wrapper.setAttribute('data-page-container', 'workforce-hub');

		// Remove default padding
		$(page.body).css({ 'margin': '0', 'padding': '0' });

		const el = document.createElement('div');
		el.id = 'workforce-hub-app';
		$(page.body).html(el);

		workforce.ui.mountHub(el);
	});
};