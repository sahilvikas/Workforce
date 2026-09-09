# Response headers for /appraisal.
#
# Frappe's website renderer (frappe.website.utils.build_response) sets no
# Cache-Control header, and a www page has no supported way to set one from
# get_context(): the renderer's own `headers` attribute is never populated from
# the page context. The supported hook is after_request, which has to be
# declared in hooks.py:
#
#     after_request = ["workforce.appraisal_headers.no_store_appraisal_page"]
#
# hooks.py belongs to another developer's live work, so that one line is left
# for its owner — see workforce/docs/APPRAISAL.md. Until it is added the pages are
# still never served from frappe's website cache (each index.py sets no_cache = 1)
# and carry no cache validators, so browsers refetch them; the header makes that
# explicit for proxies too.
#
# Covers both /appraisal (guest) and /hr (logged in).


PAGES = ("/appraisal", "/hr")


def no_store_appraisal_page(response=None, request=None):
	"""after_request hook: stop the appraisal HTML from being cached anywhere."""
	if response is None or request is None:
		return

	path = (getattr(request, "path", "") or "").rstrip("/")
	if path not in PAGES:
		return

	content_type = str(response.headers.get("Content-Type", ""))
	if not content_type.startswith("text/html"):
		return

	response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
	response.headers["Pragma"] = "no-cache"
	response.headers["Expires"] = "0"
