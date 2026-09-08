# Appraisal app — employee side

The self-appraisal form employees fill in, served as a single-page Vue 3 app on a
public (guest) www page. Manager and HR areas are not built yet; `App.vue` keeps
a `door` switch (`'employee'`) as the place they will hang off.

## Route

| URL | What it is |
|---|---|
| `/appraisal?t=<token>` | The whole app. `t` is the per-employee token HR mails out. |

No token → the "needs your personal link" screen. The token never leaves the URL
and the query string; the session id returned by login is held in
`sessionStorage['wfa_s_' + token]` and nothing else is stored in the browser (no
localStorage, no service worker, no application cache).

`/appraisal` renders a complete HTML document. Frappe's `TemplatePage` only wraps
a www template in `templates/web.html` when the source has neither `{% extends %}`
nor `</body>` (see `frappe/website/page_renderers/template_page.py`,
`set_properties_from_source`), so shipping a full document is what keeps the
website navbar, footer and frappe's web bundles off the page.

## Files

```
workforce/public/js/appraisal.bundle.js        entry; mounts App on #appraisal-root
workforce/public/js/appraisal/
  App.vue          screen switch, top bar, save indicator, toasts, stale-build check
  api.js           POST transport and the failure shape
  store.js         state, draft, validation, scores, the single save queue
  theme.css        design tokens and every shared class (ported from the prototype)
  ui/              Button, Field, TextArea, Rating, Chip, Toast, Modal, Stepper, Skeleton
  employee/
    Login.vue Welcome.vue Wizard.vue Done.vue PrintView.vue NoLink.vue Locked.vue Closed.vue
    steps/   Details Kras Comps Contrib Achievements Challenges Goals Overall
             Suggestions Ahead Summary Declaration
workforce/www/appraisal/index.html             bare shell + include_script + csrf marker
workforce/www/appraisal/index.py               get_context: no_cache, bundle hash for <meta>
workforce/appraisal_headers.py                 optional after_request hook (see Deployment)
workforce/docs/appraisal-prototype.html        the design reference this was ported from
```

Nothing here imports from `workforce/public/js/components/` — the Hub and this app
share no code.

### Styles

Frappe's esbuild collects the SFC `<style>` blocks *and* `theme.css` into one CSS
file and its `frappe-vue-style` plugin inlines it into the bundle as a
`frappe.dom.set_style(...)` call (`frappe/esbuild/frappe-vue-style.js`). This page
does not load frappe's web bundle, so `index.html` defines that one function
before the bundle runs. Do not remove that shim — without it the app loads unstyled.

## Endpoints

All calls are `POST /api/method/<name>`, body `application/x-www-form-urlencoded`
with a single field `data=<JSON string>`, headers `Accept: application/json`,
`Cache-Control: no-cache` and `X-Frappe-CSRF-Token` when the page has a real token.
The response envelope is `{ message: <payload> }`.

Every payload is either `{ok:1, ...}` or `{ok:0, reason:'<key>', message:'<sentence>'}`.
On a non-2xx the first `_server_messages` entry becomes `message`, otherwise
"Something went wrong. Please try again.". **Server messages are rendered
verbatim, everywhere.** Reads retry once on a network failure; writes never retry
(the save queue owns its own retry).

| Endpoint | Sent | Returns |
|---|---|---|
| `wfa_login` | `{t, password}` | `{ok:1, s, expires_on, employee_name, status, current_step, has_draft, is_manager, is_ceo}` — failures `bad_link`, `locked`, `not_sent`, `no_password`, `wrong_password` (+ `attempts_left`) |
| `wfa_get_form` | `{t, s}` | `{ok:1, status, current_step, last_saved_on, submitted_on, editable, window_open, window_note, reopen_count, reopen_reason, header, cycle, definitions, draft}` |
| `wfa_save_draft` | `{t, s, draft, step}` | `{ok:1, saved_on}` — failures `locked`, `window_closed`, `too_big` |
| `wfa_submit` | `{t, s, draft}` | `{ok:1, status, submitted_on, self_weighted_score, self_overall_rating, manager_name, mails}` — failure `incomplete` with `errors:[{step, msg}]` |

`reason` of `no_session` or `session_expired` on *any* call clears the stored
session and raises the login overlay; the draft stays in memory and is flushed
the moment the password is accepted.

`step` values (in `wfa_save_draft` and in `wfa_submit`'s errors) are the step keys:

```
details, kras, comps, contrib, ach, chal, goals, overall, sugg (optional), ahead, summary, decl
```

## Draft contract

Sent exactly like this. `store.js` builds an empty draft of this shape from
`definitions` and deep-merges the saved draft over it, so a draft saved before HR
edited the KRAs still opens; rows longer than the definitions are dropped.

```js
{
  kras:        [ {actual:'', self:0, evidence:''} ],                   // same order/length as definitions.kras
  comps:       [ {competency:'Teamwork', self:0, evidence:''} ],        // one per definitions.comps
  contribs:    [ {area:'Process Improvement', contribution:'', impact:'', self:0} ], // one per definitions.contribs
  achievements:[ {what:'', impact:''} ],                                // 4 rows
  challenges:  [ {area:'', what:'', action:'', support:''} ],           // 3 rows
  goals:       [ {area:'', action:'', outcome:''} ],                    // 3 rows
  overall:     {contributions:'', handled_well:'', improve:'', additional_resp:'', support:''},
  suggestions: [ {key, observation:'', solution:'', impact:''} ],       // keys: gap, inefficiency, people, waste, automation, one_change
  ahead:       {outcomes:'', responsibility:'', support:'', value:''},
  sec:         {kra:0, comp:0, add:0, comment:''},
  decl:        {name:'', accepted:0}
}
```

## Validation (mirrors the server)

KRA: `actual` ≥ 20 characters, rating 1–5, `evidence` ≥ 30. Competency: rating and
`evidence` ≥ 20. Contribution: if either text box has content, a rating is
required. At least one achievement with its impact, and any achievement with text
needs an impact. At least one challenge (area + what) and one goal (area + action).
Overall: all five ≥ 20. Looking ahead: all four ≥ 10. Summary: `sec.kra` and
`sec.comp` set. Declaration: the typed name equals `header.employee_name`,
trimmed and case-insensitive, and the box is ticked. Lengths are measured trimmed.

`Next` runs these and shows inline errors; `Back` and the rail are always free.
The server stays the authority: an `incomplete` submit jumps to the first failing
step and lists the server's own messages.

## Autosave

`store.js` owns one queue. A deep watcher on the draft calls `markDirty()`, which
debounces 1.2s and then flushes. A flush snapshots the draft, and only one request
is ever in flight — if the draft moved on while it was away, it flushes again on
return, so snapshots can never land out of order. The indicator reflects the
latest snapshot, not the last response: `Saving…` / `Saved · just now|Ns ago|N min ago`
/ `Couldn't save — retrying`.

It also flushes on step change, rail click, and before submit; on
`visibilitychange → hidden` and `pagehide` it sends with `keepalive: true` so the
save survives the tab closing. A network failure or 5xx keeps everything in memory
and retries every 10s, and `beforeunload` warns while anything is unsaved. A real
refusal (`locked`, `window_closed`, `too_big`) stops the retries and shows the
server's sentence. `submit()` awaits any in-flight save first.

## Caching

- The bundle is written by frappe's esbuild as `appraisal.bundle.<hash>.js` and
  `include_script('appraisal.bundle.js')` resolves the current hash from
  `assets.json`. It is never referenced by a fixed filename, so every deploy is a
  new URL and no browser can serve an old bundle.
- `index.py` sets `no_cache = 1` (module level, read by
  `TemplatePage.set_pymodule_properties`) and `context.no_cache = 1`, so the HTML
  is never served from frappe's website page cache and always names the newest
  bundle.
- `index.html` repeats the hashed path in `<meta name="wfa-build">`. When a tab
  comes back after more than 20 minutes hidden, the app refetches `/appraisal`
  with `cache: 'no-store'`, compares that meta, and — if it changed — finishes any
  pending save and offers a non-blocking "A new version is ready" toast with a
  Reload button. It never reloads on its own.

### Deployment note — one line still needed in `hooks.py`

Frappe's `build_response` sets no `Cache-Control` on website pages and a www page
has no supported way to set a response header from `get_context()`; the renderer's
`headers` attribute is never filled from the page context. The supported hook is
`after_request`, and `workforce/appraisal_headers.py` is ready for it. hooks.py is
another developer's live file, so its owner should add:

```python
after_request = ["workforce.appraisal_headers.no_store_appraisal_page"]
```

Until that line exists the page is still never cached server-side and carries no
cache validators (no `ETag`, no `Last-Modified`), so browsers refetch it; the
header only makes that explicit for intermediary proxies.

## Building

`bench build --app workforce` picks up `workforce/public/js/appraisal.bundle.js`
automatically because of the `*.bundle.js` glob — no build config changes, and
nothing in `hooks.py` refers to it.

## Screens

Login · Welcome · the twelve wizard steps · Done · Print view · and the states a
user can land in without doing anything wrong: no token, locked link, window
closed, session expired (overlay over the wizard, nothing lost), already
submitted (read-only with a printable copy), reopened (banner carrying HR's
reason), and a failed load with a retry. Empty and loading states use skeletons
sized like the real content; there are no spinners.
