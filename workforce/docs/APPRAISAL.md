# Appraisal app

One Vue 3 app on a public (guest) www page, serving both sides of the cycle: the
employee's self-appraisal and the manager's review of their team. HR's console is
not built yet.

## Route

| URL | What it is |
|---|---|
| `/appraisal?t=<token>` | The whole app. `t` is the per-person token HR mails out. |

No token → the "needs your personal link" screen. Tabs and panels are all
client-side; the URL never changes. The token stays in the query string; the
session id from login lives in `sessionStorage['wfa_s_' + token]` and the last tab
in `sessionStorage['wfa_tab_' + token]`. Nothing else is stored in the browser (no
localStorage, no service worker, no application cache).

`/appraisal` renders a complete HTML document. Frappe's `TemplatePage` only wraps
a www template in `templates/web.html` when the source has neither `{% extends %}`
nor `</body>` (see `frappe/website/page_renderers/template_page.py`,
`set_properties_from_source`), so shipping a full document is what keeps the
website navbar, footer and frappe's web bundles off the page.

## The door

`wfa_login` returns `{status, is_manager, is_ceo, has_draft, current_step}`, and
that decides what the person sees:

```
has_own_form = status !== 'Not Applicable'
has_team     = is_manager || is_ceo
```

- `has_own_form && !has_team` → the employee flow, on its own.
- `has_team` → a two-tab shell, **My team** · **My appraisal**. The second tab is
  hidden when `!has_own_form`.
  - Land on **My team** when there is no own form, or when the own form is
    Submitted or later.
  - Otherwise land on **My appraisal**, with the team tab showing a badge counting
    reviewable people.
  - The last tab is remembered in `sessionStorage` and wins on the next load.

On a reload there is no login payload, so `boot()` asks the server instead: it
calls `wfa_team_list` first. `ok:1` means a team (and carries `has_own_form`);
`reason:'not_manager'` means the employee flow. A manager who also has a form then
loads it, because the landing rule needs its status.

The read-only "submitted copy" is shown **only** when the person's own status is
Submitted or later. A `Not Applicable` status has no form at all and must never
render one — that was the bug where a manager-only link looked like a submitted
appraisal.

## Files

```
workforce/public/js/appraisal.bundle.js        entry; mounts App on #appraisal-root
workforce/public/js/appraisal/
  App.vue          door + boot, top bar, save indicator, toasts, stale-build check
  api.js           POST transport and the failure shape
  saveQueue.js     the autosave queue, shared by the draft and the review
  store.js         employee state, draft, validation, scores, door helpers
  review.js        manager state: team list, one open review, its validation
  theme.css        design tokens and every shared class (ported from the prototype)
  ui/              Button, Field, TextArea, Rating, Chip, Toast, Modal, Stepper, Skeleton
  employee/
    EmployeeArea.vue Login Welcome Wizard Done PrintView NoLink Locked Closed
    steps/   Details Kras Comps Contrib Achievements Challenges Goals Overall
             Suggestions Ahead Summary Declaration
  manager/
    ManagerArea.vue  tabs and routing between the list and the panel
    TeamList.vue     who is waiting, who is done
    ReviewPanel.vue  one review end to end
    ReviewBlock.vue  one rated block: what they wrote | your rating and comment
    SelfAnswers.vue  the collapsed "everything else they wrote" accordion
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

## Layout

The content column is **1240px** (`--col`), with the wizard rail still 260px. Body
text is constrained separately (`.prose`, `.answer`, `.stephead p`) so paragraphs
stay near an 80-character measure however wide the window is.

| Breakpoint | What changes |
|---|---|
| < 820px | Everything stacks. The rail is replaced by the "Step n of 12" bar; review blocks are one column. |
| ≥ 820px | Review blocks split into "what they wrote" / "your rating"; achievement-style rows go two-up. |
| ≥ 1100px | KRA, competency and contribution cards split into a 340px definition panel (sticky inside the card) and the answers beside it; achievement-style rows go three-up; the review panel gains its 240px sticky mini-summary. |

Textareas start at 110px and grow with their content, capped at 60vh before they
scroll internally.

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

### Employee

| Endpoint | Sent | Returns |
|---|---|---|
| `wfa_login` | `{t, password}` | `{ok:1, s, expires_on, employee_name, status, current_step, has_draft, is_manager, is_ceo}` — failures `bad_link`, `locked`, `not_sent`, `no_password`, `wrong_password` (+ `attempts_left`) |
| `wfa_get_form` | `{t, s}` | `{ok:1, status, current_step, last_saved_on, submitted_on, editable, window_open, window_note, reopen_count, reopen_reason, header, cycle, definitions, draft}` |
| `wfa_save_draft` | `{t, s, draft, step}` | `{ok:1, saved_on}` — failures `locked`, `window_closed`, `too_big` |
| `wfa_submit` | `{t, s, draft}` | `{ok:1, status, submitted_on, self_weighted_score, self_overall_rating, manager_name, mails}` — failure `incomplete` with `errors:[{step, msg}]` |

### Manager

| Endpoint | Sent | Returns |
|---|---|---|
| `wfa_team_list` | `{t, s}` | `{ok:1, manager_name, is_ceo, has_own_form, window_open, window_note, manager_start, manager_end, cycle, team:[…]}` — failure `not_manager` |
| `wfa_get_review` | `{t, s, appraisal}` | `{ok:1, appraisal, status, editable, window_note, submitted_on, manager_submitted_on, header, weights, self, review}` — failures `not_found`, `not_yours`, `not_submitted` |
| `wfa_save_review` | `{t, s, appraisal, review}` | `{ok:1, saved_on, status}` — failures `locked`, `window_closed` |
| `wfa_submit_review` | `{t, s, appraisal, review}` | `{ok:1, appraisal, status:'Manager Submitted', manager_weighted_score, manager_overall_rating, hr_notified}` — failure `incomplete` with `errors:[{step, msg}]` |

Each team row: `{employee, employee_name, employee_id, designation, department,
is_manager, appraisal, status, submitted_on, manager_submitted_on,
self_weighted_score, manager_weighted_score, reviewable, review_done}`.
`reviewable` is 1 only for Submitted / Manager Review inside the window; a row that
is neither reviewable nor done is not openable and toasts its status instead.

Statuses, in order: `Not prepared, Draft, Ready, Sent, In Progress, Submitted,
Manager Review, Manager Submitted, Calibrated, Final Approved, Discussed, Closed`.
Chips: Sent / In Progress marigold, Submitted / Manager Review sky, Manager
Submitted and later moss, anything earlier plain.

`reason` of `no_session` or `session_expired` on *any* call clears the stored
session and raises the login overlay; whatever is in memory — draft or review —
stays there and is flushed the moment the password is accepted.

Employee step keys (used by `wfa_save_draft` and `wfa_submit`'s errors):

```
details, kras, comps, contrib, ach, chal, goals, overall, sugg (optional), ahead, summary, decl
```

Review step keys (used by `wfa_submit_review`'s errors): `kras, comps, contribs, overall`.

## Draft contract (employee)

`store.js` builds an empty draft of this shape from `definitions` and deep-merges
the saved draft over it, so a draft saved before HR edited the KRAs still opens;
rows longer than the definitions are dropped.

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

## Review contract (manager)

Built empty from `self` and deep-merged with the saved `review`, the same way.

```js
{
  kras:     [ {rating:0, comment:''} ],                                // same order as self.kras
  comps:    [ {competency:'Teamwork', rating:0, comment:''} ],          // one per self.comps
  contribs: [ {area:'Process Improvement', rating:0, comment:''} ],     // one per self.contribs
  overall_rating: 0,
  key_feedback: '',
  development_recs: ''
}
```

Contributions the employee left blank are not rated: they are listed in one muted
line ("Not filled by <first name>: …") and excluded from what Submit requires.

## Validation

**There are no character minimums anywhere, on either side.** Required means
non-empty. The client mirrors the server's rules and its wording so the two never
disagree.

Employee — KRA: actual result, a rating, and comments/evidence. Competency: a
rating and an example. Contribution: if either text box has content, a rating is
required. At least one achievement with its impact, and any achievement with text
needs one. At least one challenge (area + what) and one goal (area + action). All
five overall answers and all four looking-ahead answers. Summary: the KRA and
competency section ratings. Declaration: the typed name equals
`header.employee_name`, trimmed and case-insensitive, and the box is ticked.

Manager — every KRA, every competency and every *filled* contribution rated, an
overall rating, and both text boxes non-empty. The Submit button says what is
still missing in one line.

Weighted score, both sides: Σ(weight × rating) / Σ(weight) per section, combined
across sections by the cycle weights, counting only sections that have a rating.
Contributions carry no comparable weight, so they average plainly.

## Autosave

`saveQueue.js` is the single implementation, instantiated once for the employee
draft and once for the manager review. A deep watcher on each document marks the
queue dirty, so no field can be forgotten. A flush snapshots the document, and
only one request is ever in flight — if it moved on while the request was away,
the queue flushes again on return, so snapshots can never land out of order. The
indicator reflects the latest snapshot, not the last response: `Saving…` /
`Saved · just now|Ns ago|N min ago` / `Couldn't save — retrying`.

Both queues also flush on step change, rail click, tab change and before submit;
on `visibilitychange → hidden` and `pagehide` they send with `keepalive: true` so
the save survives the tab closing. A network failure or 5xx keeps everything in
memory and retries every 10s, and `beforeunload` warns while either queue is
dirty. A real refusal (`locked`, `window_closed`, `too_big`) stops the retries and
shows the server's sentence. Submitting awaits any in-flight save first.

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

Employee: Login · Welcome · twelve wizard steps · Done · print view.
Manager: the team list · one review panel · the same print-free chrome.
Plus every state a person can land in without doing anything wrong: no token,
locked link, window closed, session expired (overlay over whatever they were
doing, nothing lost), already submitted (read-only with a printable copy),
reopened (banner carrying HR's reason), an empty team, a review that is already
submitted (read-only), and a failed load with a retry. Empty and loading states
use skeletons sized like the real content; there are no spinners.

## Motion

Easing is `cubic-bezier(.2,.7,.2,1)` throughout, and everything below is disabled
under `prefers-reduced-motion: reduce`.

Step and panel changes slide 18px in the direction of travel over 260ms
(`mode="out-in"`), including team list → review panel. The rail's connector fills
progressively (400ms) and completed ticks scale in from 0.6 (220ms). Rating
buttons lift 1px on hover (120ms) and fill on select (180ms); on both sides the
running score counts to its new value over 350ms and its bar eases over 500ms. The
manager's gap-vs-self line fades in over 180ms and the progress chip transitions
from marigold to moss over 220ms when the last rating lands. The save indicator's
dot pulses while saving. Toasts rise 8px and fade in (250ms), auto-dismiss after
2.6s, three at most. The Done screen is the only sequenced entrance: the tick pops,
its check draws, and the stage timeline staggers in at 60ms intervals.
