# Context for /appraisal — the employee appraisal app.
#
# The template is a complete HTML document (it contains </body>), so frappe's
# TemplatePage renders it as-is instead of wrapping it in templates/web.html.
# That is what keeps the website navbar and footer off this page.

from frappe.utils.jinja_globals import bundled_asset

# Read by TemplatePage.set_pymodule_properties: never store this page in the
# website page cache, so the HTML always points at the newest bundle hash.
no_cache = 1
sitemap = 0


def get_context(context):
	context.no_cache = 1
	context.sitemap = 0
	context.title = "Appraisal"

	# Same hashed path include_script() emits, exposed for <meta name="wfa-build">
	# so a tab that has been asleep can tell it is running an old bundle.
	context.wfa_build = bundled_asset("appraisal.bundle.js")

	return context
