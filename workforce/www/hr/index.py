# Context for /hr — the appraisal HR console.
#
# Like www/appraisal, the template is a complete HTML document (it contains
# </body>), so frappe's TemplatePage renders it as-is instead of wrapping it in
# templates/web.html, and no website navbar or footer appears.
#
# Unlike /appraisal this page is for logged-in staff: a guest is redirected to
# the login page, and only the three appraisal roles below get the console. The
# standard ERPNext "HR Manager" / "HR User" roles are held by almost everyone on
# this site and are deliberately not accepted here.

import frappe
from frappe.utils.jinja_globals import bundled_asset

no_cache = 1
sitemap = 0

HR_ROLES = {"WF HR Manager", "WF Admin", "WF Recruitment Coordinator"}


def get_context(context):
	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = "/login?redirect-to=/hr"
		raise frappe.Redirect

	roles = set(frappe.get_roles(frappe.session.user))

	context.no_cache = 1
	context.sitemap = 0
	context.title = "Appraisal · HR"

	payload = {
		"user": frappe.session.user,
		"full_name": frappe.db.get_value("User", frappe.session.user, "full_name"),
		"has_access": 1 if roles & HR_ROLES else 0,
	}
	# Escaped so a stray "</script>" inside a full name cannot close the tag it
	# is being written into. < is valid JSON and parses back to "<".
	context.hr_ctx = frappe.as_json(payload).replace("<", "\\u003c")

	# The same hashed path include_script() emits, for the wfa-build meta tag.
	context.wfa_build = bundled_asset("hr.bundle.js")

	return context
