# Appraisal — full reference

Everything about the appraisal module: what exists, how it behaves, what it sends
and what it expects back. Written for whoever picks this up next.

- **Routes:** `/appraisal?t=<token>` — employee and manager, guest plus a token —
  and `/hr` — the HR console, logged in. Sections 1–18 are `/appraisal`; §19 is `/hr`.
- **Built:** employee self-appraisal, manager review of a team, HR console
- **Frontend lives in:** `workforce/public/js/appraisal*`, `workforce/public/js/hr*`,
  `workforce/www/appraisal/`, `workforce/www/hr/`
- **Backend:** the `wfa_*` whitelisted methods, maintained outside this repo (server
  scripts on the site). This document is the contract the frontend holds them to.

---

## 1. How a person gets in

1. HR mails each person a link, `/appraisal?t=<token>`, plus an 8-character
   password in the same mail.
2. The page opens, reads `t` from the query string, and shows the password screen.
   With no `t` it shows the "needs your personal link" screen and nothing else.
3. `wfa_login` exchanges `{t, password}` for a session id `s`, which is kept in
   `sessionStorage['wfa_s_' + <token>]`.
4. Every later call sends `{t, s, …}`. The token alone opens nothing.
5. Five wrong passwords lock the link. The screen then says so and offers no
   retry — only HR can unlock it.

The session lives in `sessionStorage`, so it survives a reload and dies with the
tab. Nothing else is stored in the browser: no `localStorage`, no cookies of our
own, no service worker, no offline cache. The only other key is
`sessionStorage['wfa_tab_' + <token>]`, remembering which tab a manager was on.

If any call comes back with `reason` of `no_session` or `session_expired`, the
stored session is dropped and a login panel appears **over** whatever the person
was doing. Their unsaved text stays in memory and is pushed the instant the
password is accepted. Nothing is lost and they land back on the same step.

---

## 2. The page shell

`workforce/www/appraisal/index.html` is a complete HTML document — it contains
`</body>`. That matters: frappe's `TemplatePage` only wraps a www template in
`templates/web.html` when the source has neither `{% extends %}` nor `</body>`
(`frappe/website/page_renderers/template_page.py`, `set_properties_from_source`).
Shipping a full document is what keeps the website navbar, footer, bootstrap CSS
and frappe's web bundles off this page. `curl -s .../appraisal | grep -c navbar`
returns 0.

What the shell contains, and why:

| Piece | Why it is there |
|---|---|
| `<div id="appraisal-root">` | The mount point. |
| Google Fonts link for Inter (400/500/600) | The type the design is drawn in; falls back to `system-ui`. |
| `<meta name="wfa-build" content="{{ wfa_build }}">` | The hashed bundle path, so a stale tab can notice a new deploy. |
| `frappe.dom.set_style` shim | **Load-bearing.** See below. |
| `<!-- csrf_token -->` | Frappe replaces this comment with `<script>frappe.csrf_token = "…"</script>`. |
| `{{ include_script('appraisal.bundle.js') }}` | Resolves the current hash from `assets.json`. |
| `<noscript>` panel | Says the form needs JavaScript. |

### The set_style shim

Frappe's esbuild collects the SFC `<style>` blocks *and* `theme.css` into one CSS
file, then `frappe/esbuild/frappe-vue-style.js` **removes that CSS file from the
outputs** and prepends `frappe.dom.set_style("…all the css…")` to the JS bundle.
That function normally comes from frappe's web bundle, which this page
deliberately does not load. So `index.html` defines it — a dozen lines that create
a `<style>` element and append it to `<head>`.

Delete that shim and the app loads completely unstyled with a console error. It is
the single most surprising thing in this codebase.

### CSRF

Guest sessions in frappe have no `csrf_token` in session data
(`frappe/sessions.py`, sid `Guest` returns `{"user": "Guest"}`), and
`validate_csrf_token` returns early when there is no saved token. So guest POSTs
are accepted without one. `api.js` still sends `X-Frappe-CSRF-Token` whenever the
page exposes a real-looking value, and skips it when the value is empty, `"None"`,
`"undefined"` or `"null"` — which is what the placeholder produces for a guest.

---

## 3. Build, deploy and caching

```
cd ~/frappe-bench && git -C apps/workforce pull
bench build --app workforce
bench --site erp.cozycornerpatios.com clear-cache
```

`bench build` picks up `workforce/public/js/appraisal.bundle.js` automatically —
frappe globs `public/**/*.bundle.{js,ts,css,…}`. No build config, no `hooks.py`
entry, nothing to register.

Three separate mechanisms keep anyone from running an old build:

1. **Hashed bundle.** esbuild writes `appraisal.bundle.<hash>.js` (`entryNames:
   "[dir]/[name].[hash]"`) and records it in `assets.json` under the key
   `appraisal.bundle.js`. `include_script()` resolves it at render time. Every
   deploy is a new URL, so a cached bundle can never be the wrong one. Nothing
   references the bundle by a fixed filename anywhere.
2. **Uncached HTML.** `index.py` sets `no_cache = 1` at module level (read by
   `TemplatePage.set_pymodule_properties`) and `context.no_cache = 1`, so the page
   is never served from frappe's website page cache and always names the newest
   hash.
3. **Stale-tab detection.** The page repeats the hashed path in
   `<meta name="wfa-build">`. When a tab returns after more than 20 minutes
   hidden, the app refetches `/appraisal` with `cache: 'no-store'`, compares the
   meta, and if it differs finishes any pending save and raises a non-blocking
   toast — "A new version is ready — reload when convenient" — with a Reload
   button. It never reloads by itself, and never while someone is typing.

### The one line still missing in hooks.py

Frappe's `build_response` sets no `Cache-Control` on website pages, and a www page
has no supported way to set a response header from `get_context()` — the
renderer's `headers` attribute is never populated from the page context. The
supported hook is `after_request`, and `workforce/appraisal_headers.py` is written
and waiting for it. `hooks.py` belongs to another developer's live work, so its
owner needs to add:

```python
after_request = ["workforce.appraisal_headers.no_store_appraisal_page"]
```

Until then the page is still never cached server-side and carries no cache
validators (no `ETag`, no `Last-Modified`), so browsers refetch it anyway. The
header only makes that explicit for intermediary proxies. `curl -I
https://erp.cozycornerpatios.com/appraisal` will not show `no-store` before that
line lands.

---

## 4. Files

```
workforce/public/js/appraisal.bundle.js     entry: imports theme.css + App.vue, mounts on #appraisal-root
workforce/public/js/appraisal/
  App.vue           door + boot, top bar, save indicator, login overlay, toasts, stale-build check
  api.js            the POST transport and the one failure shape
  saveQueue.js      the autosave engine, instantiated twice
  store.js          employee state: draft, steps, validation, scores, door helpers, page lifecycle
  review.js         manager state: team list, the open review, its validation and scores
  theme.css         tokens and every shared class, ported from the prototype
  ui/
    Button.vue      variant primary|ghost|danger, size sm, block, disabled
    Field.vue       label + input (or a slot), hint, error, generated id
    TextArea.vue    label + auto-growing textarea, optional plain character count
    Rating.vue      the 1–5 scale; compact, readonly, invalid, label
    Chip.vue        tone moss|gold|brick|sky|ink
    Toast.vue       reads store.toasts, renders the stack
    Modal.vue       backdrop + panel, focus moved into it on mount
    Stepper.vue     mode="rail" (list, ticks, connector) or mode="mobile" (Step n of 12 + bar)
    Skeleton.vue    width, height, radius, mt
  employee/
    EmployeeArea.vue  loads the form if needed, then routes between the screens below
    Login.vue         password panel; also used as the expiry overlay
    Welcome.vue       first-visit vs resume copy, three facts, Start / Continue
    Wizard.vue        rail + pane + footbar, step transitions, live score, submit
    Done.vue          tick, "went to <manager>", stage timeline, Download a copy
    PrintView.vue     the whole form in paper order, print stylesheet
    NoLink.vue        no token
    Locked.vue        link locked after five wrong passwords
    Closed.vue        the self-appraisal window is shut
    steps/            Details Kras Comps Contrib Achievements Challenges Goals
                      Overall Suggestions Ahead Summary Declaration
  manager/
    ManagerArea.vue   the two tabs; routes between list and panel
    TeamList.vue      who is waiting, who is done
    ReviewPanel.vue   one review end to end
    ReviewBlock.vue   one rated block: what they wrote | your rating and comment
    SelfAnswers.vue   collapsed accordion of everything else the employee wrote
workforce/www/appraisal/index.html   the shell described above
workforce/www/appraisal/index.py     no_cache, title, the hashed bundle path
workforce/appraisal_headers.py       the after_request hook, not yet registered
workforce/docs/appraisal-prototype.html   the design reference this was ported from
```

Nothing here imports from `workforce/public/js/components/` or `shared/`. The Hub
and this app share no code and no CSS.

---

## 5. Design system

### Tokens (`theme.css`, `:root`)

| Token | Value | Used for |
|---|---|---|
| `--chalk` | `#EEF1F3` | page background |
| `--paper` | `#FFFFFF` | cards, panels, bars |
| `--line` | `#DCE1E6` | hairlines, card borders |
| `--line-2` | `#C3CBD3` | input and button borders |
| `--ink` | `#0F1A24` | primary text |
| `--ink-2` | `#3E4C5A` | secondary text, labels |
| `--ink-3` | `#71808E` | muted text, hints |
| `--moss` | `#0F4C5C` | primary action, ticks, progress |
| `--moss-2` | `#1E6B7E` | focus rings, hover borders |
| `--moss-tint` | `#DEEAEE` | current step, weight chips |
| `--moss-deep` | `#093642` | primary hover, rating 5 |
| `--marigold` / `--marigold-tint` | `#C98A1B` / `#FAEFD8` | pending, attention |
| `--brick` / `--brick-tint` | `#B3382C` / `#F7E2DE` | errors, wide rating gaps |
| `--sky` / `--sky-tint` | `#4A5FA8` / `#E6E9F5` | in-review states |
| `--r-s` `--r-m` `--r-l` | 6px, 10px, 14px | radii |
| `--ease` | `cubic-bezier(.2,.7,.2,1)` | every transition |
| `--col` | `1240px` | the content column |

Type: Inter, 15px, line-height 1.5. Headings 600 weight, letter-spacing −0.01em.
h1 28px, h2 20px, h3 16px; the welcome h1 is 34px and the step h2 24px.

### The rating scale

Five equal buttons, number above a guide word. The selected colour carries meaning:

| Value | Word | Selected colour |
|---|---|---|
| 1 | Unsatisfactory | `#B85C38` |
| 2 | Needs improvement | `#9C6A3C` |
| 3 | Meets expectations | `#5E6F5C` |
| 4 | Exceeds expectations | `var(--moss)` |
| 5 | Exceptional | `var(--moss-deep)` |

`compact` hides the guide words (used in tables and the manager's blocks);
`readonly` disables interaction. Each button is a real `<button>` carrying
`aria-pressed` and `aria-label="4 — Exceeds expectations"`. Clicking the selected
value clears it.

### Breakpoints

| Width | Layout |
|---|---|
| < 820px | Everything stacks. Rail hidden, replaced by a "Step n of 12" bar. Review blocks single column. Row grids single column. |
| ≥ 820px | Review blocks split into "what they wrote" / "your rating". Achievement-style rows two-up. |
| ≥ 1100px | KRA / competency / contribution cards split into a 340px definition panel — sticky inside the card — with the answers beside it. Achievement-style rows three-up, their inner field pairs stacking. The review panel gains a 240px sticky mini-summary. |
| < 400px | Rating buttons tighten (smaller numbers, 4px gap) so five still fit at 360px. |

Body text is constrained independently of the grid (`.prose` 72ch, `.answer`
78ch, `.stephead p` 600px, `.rows.narrow` 900px) so widening the window never
stretches a paragraph past a comfortable measure. Textareas start at 110px and
grow with their content up to 60vh, then scroll internally.

---

## 6. The door — who sees what

`wfa_login` returns `status`, `is_manager` and `is_ceo`, and those decide
everything:

```
has_own_form = status !== 'Not Applicable'
has_team     = is_manager || is_ceo
```

| Case | What renders |
|---|---|
| `has_own_form && !has_team` | The employee flow on its own. No tabs. |
| `has_team && !has_own_form` | The manager shell with one tab, **My team**. No "My appraisal" tab at all. |
| `has_team && has_own_form` | Two tabs. Lands on **My team** if the own form is Submitted or later, otherwise on **My appraisal** with the team tab showing a badge counting reviewable people. |

The last tab is remembered in `sessionStorage` and wins on the next load.

On a reload there is no login payload, so `App.boot()` asks the server rather than
trusting anything cached: it calls `wfa_team_list` first. `ok:1` means a team (and
the response carries `has_own_form`); `reason:'not_manager'` means the employee
flow. A manager who also has a form then loads it too, because the landing rule
needs its status.

**The read-only "submitted copy" is shown only when the person's own status is
Submitted or later** — not merely when `editable` is 0. A `Not Applicable` person
has no form fetched at all, so there is nothing to render as one. That distinction
is what fixed a manager-only link rendering as a submitted appraisal.

---

## 7. The employee side, screen by screen

### Login

Heading is the cycle name once known, otherwise "Your self-appraisal" (the cycle
name only arrives with the form, after login). Sub-line names the email address
when we have it. The password field uppercases as you type and strips spaces and
dashes, so pasting `k7m3-qx2p` from the mail becomes `K7M3QX2P`. The server's
message is shown exactly as sent, with a separate line for the attempts left:
"4 attempts left before the link locks." A `locked` reason switches to the Locked
screen, which offers no retry.

### Welcome

Cycle name chip, then either "Hello <first name>, this is your self-appraisal." or
"Welcome back, <first name>." with "You were on '<step>'. Everything you typed is
saved." Three facts: **~35 min**, **Auto-saved**, and the **submit-by date**
(`cycle.self_end`, formatted `d MMM yyyy`). Buttons: *Start*, or *Continue where I
left off* plus *Start from the beginning*. A reopened form shows HR's reason here
as a banner.

### The twelve steps

| # | Key | Label | What is on it |
|---|---|---|---|
| 1 | `details` | Your details | Read-only facts HR filled in, plus the cycle instructions if any. |
| 2 | `kras` | KRAs and KPIs | One card per KRA: the definition (KPI, target, weight) and three answers — actual result, self rating, comments/evidence. |
| 3 | `comps` | Competencies | One card per competency: responsibility, expectation, a rating and examples. |
| 4 | `contrib` | Additional contribution | One card per area: contribution, impact, and a rating that appears once either box has text. |
| 5 | `ach` | Achievements | Four rows of achievement + impact. |
| 6 | `chal` | Challenges | Three rows of area, what happened, action taken, support required. |
| 7 | `goals` | Development goals | Three rows of area, action, expected outcome. |
| 8 | `overall` | Overall self-assessment | Five questions. |
| 9 | `sugg` | Organisational development | **Optional.** Six cards, three questions each. Has a Skip button. |
| 10 | `ahead` | Looking ahead | Four questions about the next cycle. |
| 11 | `summary` | Rating summary | Section weights, weighted averages, the person's own section ratings, a comment box, and a full read-through of everything with "edit" links. |
| 12 | `decl` | Declaration | The declaration text, typed name as signature, today's date, a checkbox, Submit. |

The step keys are what `wfa_save_draft` sends as `step` and what `wfa_submit`'s
errors refer to.

The five **overall** questions, in draft-key order:

| Key | Question |
|---|---|
| `contributions` | What are your three most significant contributions during the appraisal period? |
| `handled_well` | What responsibilities or areas do you believe you handled particularly well? |
| `improve` | What would you like to improve in the next appraisal cycle? |
| `additional_resp` | What additional responsibilities would you like to take up? |
| `support` | What support, resources or training would help you perform better? |

The four **looking ahead** questions:

| Key | Question |
|---|---|
| `outcomes` | Top three outcomes you want to achieve in the next cycle |
| `responsibility` | Additional responsibility or leadership opportunity you would like to take up |
| `support` | Skills, resources or organisational support that would enable greater impact |
| `value` | If given additional responsibility, what measurable value can you create? |

The six **organisational development** cards (`key` → title): `gap` Organisational
gap · `inefficiency` Process inefficiency · `people` Team / cross-functional ·
`waste` Cost, errors, wastage · `automation` Simplify / automate · `one_change`
One change. Each asks an observation, a solution and an impact.

### The wizard shell

Desktop: a 260px rail listing all twelve steps with tick markers, a connector that
fills as far as the last completed step, and a live score card. Any step in the
rail is clickable at any time. Content column up to 1240px. A sticky translucent
footbar carries *Back* and *Save and continue* (or *Looks right, continue* on the
summary, *Submit my appraisal* on the declaration, plus *Skip* on the optional
step).

Below 820px the rail is replaced by a "Step n of 12" bar with a progress line;
the footbar is unchanged. The pane keeps 110–120px of bottom padding so the
footbar never covers the last field.

*Next* validates the current step and shows inline errors plus a toast — "A few
things need filling in before you continue". *Back* and the rail are always free.

### Live score

The rail card shows the weighted self score so far and how many ratings have been
given. On the summary step the section ratings are pre-filled from the section
averages, rounded — but only where the person has not already chosen one.

### Done

A tick pops and its check draws, then: "Submitted. Thank you, <first name>." and
"Your self-appraisal went to <manager> at <time>. A copy is on its way to
<email>." A stage timeline built from the cycle dates follows — self-appraisal
submitted (today), manager review, HR calibration and final approval, discussion
with your manager — each item fading in 60ms after the last. *Download a copy*
opens the print view.

### Print view

The whole submitted form in the paper form's section order, twelve numbered
blocks, with a Print or save as PDF button. The print stylesheet hides the top
bar, the tabs, the toolbar and the toasts, and avoids breaking a block across
pages. It is also what a person sees when their form is already submitted —
read-only, with no Back button.

---

## 8. The manager side

### Team list

Heading "Reviews waiting for you"; sub-line "N of M submitted and waiting ·
window closes <date>". One row per person: initials avatar, name, designation ·
department, status chip, the relevant date, and a right-aligned affordance.

| Condition | Affordance | Clickable |
|---|---|---|
| `reviewable` and the window is open | **Review** | opens the panel |
| `review_done` | **Submitted ✓** | opens the panel read-only |
| `reviewable` but the window is shut | Window closed | no — toasts the status |
| anything else | Waiting for self-appraisal | no — toasts the status |

Rows are grouped: reviewable first, then done, then everyone else, preserving the
server's order inside each group. Chip colours: Sent and In Progress marigold,
Submitted and Manager Review sky, Manager Submitted and later moss, anything
earlier plain. A shut window shows `window_note` as a banner. An empty team gets
its own screen rather than an empty list.

### Review panel

Header: *← Back to team*, the person's name, "designation · submitted <date> ·
self score X / 5", and a progress chip reading "n of N rated" that turns from
marigold to moss and reads "Review complete" when the last rating lands.

Then one block per KRA, per competency, and per **filled** contribution. Each
block is two columns at ≥820px:

- **Left, tinted — "What <first name> wrote":** for a KRA, the target, the actual
  result and the evidence; for a competency, the responsibility, what was expected
  and their examples; for a contribution, what they did and its impact. Under it,
  their self rating as a chip with its guide word.
- **Right — "Your rating":** the compact 1–5 scale, a line beneath it showing the
  guide word for the chosen rating and the gap against the employee — "matches
  self rating", "+1 vs self", "−2 vs self", in brick once the gap reaches 2 — and
  a comment box: *"Why this rating? Point at the evidence."*

Contributions the employee left blank are not rated. They appear as one muted
line: "Not filled by <first name>: Cost Saving, Cross-Team Support".

Below that, a collapsed accordion — "Everything else <first name> wrote" — holding
the achievements, challenges, goals, the five overall answers, the organisational
development cards, looking ahead, and their own section ratings and comment.

Then the **Overall** card: the manager's overall rating on the full scale with
guide words, a live "Weighted from your ratings X.XX / 5 · employee's own Y.YY"
that counts up as ratings change, Key feedback and Development recommendations
boxes, a "Saved automatically. You can leave and come back." line, and **Submit
review to HR**. The button stays disabled until everything is rated and both boxes
have text, with a helper line saying exactly what is missing: *"Still needed: 2
KRAs to rate, 1 competency to rate, an overall rating, key feedback."*

On screens ≥1100px a 240px column sticks alongside with the running score, the
rated count, the employee's own score and a Submit shortcut — which submits when
it can, and otherwise scrolls to the first thing that is missing.

After submitting, the panel becomes read-only with a moss banner — "Review
submitted <date>. It is with HR now — this is a read-only copy." — and the team
row flips to "Submitted ✓" without another round trip.

---

## 9. API reference

Every call is:

```
POST /api/method/<name>
Content-Type: application/x-www-form-urlencoded; charset=UTF-8
Accept: application/json
Cache-Control: no-cache
X-Frappe-CSRF-Token: <only when the page has a real one>

data=<URL-encoded JSON string>
```

The response envelope is always `{ "message": <payload> }`. Every payload is
either `{ok: 1, …}` or `{ok: 0, reason: '<key>', message: '<sentence>'}`.

`api(name, payload, options)` never rejects. Transport problems become the same
failure shape, so callers only ever branch on `payload.ok`:

| Situation | What `api()` resolves with |
|---|---|
| HTTP non-2xx | `reason: 'http_<status>'`, `message` = the first `_server_messages` entry (a JSON string of JSON strings; the `.message` of the first, tags stripped), else the generic sentence |
| Network failure | `reason: 'network'` |
| Body is not JSON, or has no `message` object | `reason: 'bad_response'` |

The generic sentence is exactly **"Something went wrong. Please try again."**

Reads (`wfa_get_form`, `wfa_team_list`, `wfa_get_review`) retry once on a network
failure. Writes never retry — the save queue owns retrying, so a write is never
sent twice by two different mechanisms.

**Every server `message` is rendered verbatim.** Nothing is reworded, shortened or
prettified client-side.

### wfa_login

```jsonc
// send
{ "t": "<token>", "password": "K7M3QX2P" }

// ok
{ "ok": 1, "s": "<session id>", "expires_on": "2026-09-12 23:59:59",
  "employee_name": "Bhanu Pratap", "status": "Sent", "current_step": "kras",
  "has_draft": 1, "is_manager": 0, "is_ceo": 0 }
```

Failures: `bad_link`, `locked`, `not_sent`, `no_password`, `wrong_password`. A
`wrong_password` may add `attempts_left` (a number), which is rendered as its own
line. `locked` switches to the Locked screen.

### wfa_get_form

```jsonc
// send
{ "t": "<token>", "s": "<session>" }

// ok
{ "ok": 1,
  "status": "In Progress", "current_step": "kras",
  "last_saved_on": "2026-09-08 12:00:00", "submitted_on": "",
  "editable": 1, "window_open": 1, "window_note": "",
  "reopen_count": 0, "reopen_reason": "",
  "header": { "employee_name": "…", "employee_id": "…", "email": "…",
              "department": "…", "designation": "…", "date_of_joining": "2025-02-25",
              "manager_name": "…", "is_manager": 0, "is_ceo": 0 },
  "cycle":  { "name": "…", "revision_label": "…", "effective_date": "2026-04-01",
              "closure_date": "…", "self_start": "…", "self_end": "2026-09-12",
              "manager_start": "…", "manager_end": "…",
              "calibration_start": "…", "final_approval_end": "…",
              "discussion_start": "…", "discussion_end": "…",
              "kra_weight": 70, "competency_weight": 20, "additional_weight": 10,
              "instructions": "…", "rating_guide": "…" },
  "definitions": {
    "kras":    [ { "sno": 1, "kra": "…", "weightage": 16, "kpi": "…", "target": "…" } ],
    "comps":   [ { "competency": "Teamwork", "weightage": 8, "kra_label": "…",
                   "kpi": "…", "target": "…" } ],
    "contribs":[ { "area": "Process Improvement", "weightage": 10, "kpi": "…", "target": "…" } ]
  },
  "draft": { /* the draft contract below, or {} when nothing is saved */ } }
```

`current_step` may be a step key or an index; both are accepted. Dates are
`YYYY-MM-DD` and are rendered as `d MMM yyyy`.

### wfa_save_draft

```jsonc
// send
{ "t": "…", "s": "…", "draft": { /* draft contract */ }, "step": "kras" }
// ok
{ "ok": 1, "saved_on": "2026-09-08 12:00:00" }
```

Failures `locked`, `window_closed`, `too_big` **stop the autosave permanently** for
that session and show the message in the indicator — they are treated as decisions,
not glitches. Anything else is treated as transient and retried.

### wfa_submit

```jsonc
// send
{ "t": "…", "s": "…", "draft": { /* draft contract */ } }
// ok
{ "ok": 1, "status": "Submitted", "submitted_on": "2026-09-08 18:42:00",
  "self_weighted_score": 4.12, "self_overall_rating": 4,
  "manager_name": "Vivek Singh", "mails": ["bhanu@…"] }
// incomplete
{ "ok": 0, "reason": "incomplete",
  "errors": [ { "step": "kras", "msg": "KRA 1: write the actual result" },
              { "step": "overall", "msg": "Answer all five overall questions" } ] }
```

On `incomplete` the app jumps to the first error's step, turns on inline errors,
and lists every message the server sent on the declaration step.

### wfa_team_list

```jsonc
// send
{ "t": "…", "s": "…" }
// ok
{ "ok": 1, "manager_name": "Vivek Singh", "is_ceo": 0, "has_own_form": 1,
  "window_open": 1, "window_note": "",
  "manager_start": "2026-09-15", "manager_end": "2026-09-19",
  "cycle": "2025 Performance Appraisal Cycle",
  "team": [ { "employee": "E2", "employee_name": "Bhanu Pratap",
              "employee_id": "INCOR101", "designation": "…", "department": "…",
              "is_manager": 0, "appraisal": "APR-0001", "status": "Submitted",
              "submitted_on": "2026-09-07", "manager_submitted_on": "",
              "self_weighted_score": 4.12, "manager_weighted_score": null,
              "reviewable": 1, "review_done": 0 } ] }
```

Failure `not_manager` when the person has no team — which is also how the app
recognises a plain employee on reload, so this must be returned rather than an
empty list.

`reviewable` is 1 only for Submitted / Manager Review inside the window.

### wfa_get_review

```jsonc
// send
{ "t": "…", "s": "…", "appraisal": "APR-0001" }
// ok
{ "ok": 1, "appraisal": "APR-0001", "status": "Submitted", "editable": 1,
  "window_note": "", "submitted_on": "2026-09-07", "manager_submitted_on": "",
  "header": { "employee_name": "…", "employee_id": "…", "department": "…",
              "designation": "…", "date_of_joining": "…", "manager_name": "…" },
  "weights": { "kra": 70, "competency": 20, "additional": 10, "rating_guide": "…" },
  "self": {
    "kras": [ { "sno": 1, "kra": "…", "weightage": 16, "kpi": "…", "target": "…",
                "actual_result": "…", "self_rating": 4, "employee_comments": "…" } ],
    "comps": [ { "competency": "Teamwork", "weightage": 8, "kra_label": "…",
                 "kpi": "…", "target": "…", "self_rating": 4, "evidence": "…" } ],
    "contribs": [ { "area": "…", "weightage": 10, "kpi": "…", "target": "…",
                    "contribution": "…", "impact": "…", "self_rating": 4 } ],
    "achievements": [ { "sno": 1, "achievement": "…", "impact": "…" } ],
    "challenges": [ { "sno": 1, "area": "…", "challenge": "…",
                      "action_taken": "…", "support_required": "…" } ],
    "goals": [ { "sno": 1, "development_area": "…", "action_required": "…",
                 "expected_outcome": "…" } ],
    "overall": { "contributions": "…", "handled_well": "…", "improve": "…",
                 "additional_resp": "…", "support": "…" },
    "suggestions": [ { "key": "gap", "observation": "…", "solution": "…", "impact": "…" } ],
    "ahead": { "outcomes": "…", "responsibility": "…", "support": "…", "value": "…" },
    "sec": { "kra": 4, "comp": 4, "add": 4, "comment": "…" },
    "self_weighted_score": 4.12, "self_overall_rating": 4 },
  "review": { /* the review contract, or {} if the manager has not started */ } }
```

Note the field names on `self` differ from the employee draft — `actual_result`
and `employee_comments` rather than `actual` and `evidence`, `achievement` rather
than `what`. That is deliberate: `self` is the stored, submitted document, not the
draft. Failures: `not_found`, `not_yours`, `not_submitted` (its message names the
person).

### wfa_save_review

```jsonc
// send
{ "t": "…", "s": "…", "appraisal": "APR-0001", "review": { /* review contract */ } }
// ok
{ "ok": 1, "saved_on": "2026-09-08 12:01:00", "status": "Manager Review" }
```

Failures `locked`, `window_closed` stop the autosave, as on the employee side.

### wfa_submit_review

```jsonc
// send
{ "t": "…", "s": "…", "appraisal": "APR-0001", "review": { /* review contract */ } }
// ok
{ "ok": 1, "appraisal": "APR-0001", "status": "Manager Submitted",
  "manager_weighted_score": 3.86, "manager_overall_rating": 4, "hr_notified": 1 }
// incomplete
{ "ok": 0, "reason": "incomplete",
  "errors": [ { "step": "kras", "msg": "KRA 2: give a rating" } ] }
```

Review error steps are `kras`, `comps`, `contribs`, `overall`.

### Session failures, on any endpoint

`reason` of `no_session` or `session_expired` clears the stored session and raises
the login overlay. Whatever is in memory — draft or review — stays and is flushed
the moment the password is accepted. This is checked on every single response,
including autosaves.

---

## 10. The contracts

### Draft (employee)

Sent exactly like this. `store.js` builds an empty draft of this shape from
`definitions` and deep-merges the saved draft over it — so a draft saved before HR
edited the KRAs still opens, and rows beyond the current definitions are dropped
silently.

```js
{
  kras:        [ {actual:'', self:0, evidence:''} ],       // same order/length as definitions.kras
  comps:       [ {competency:'Teamwork', self:0, evidence:''} ],  // one per definitions.comps
  contribs:    [ {area:'Process Improvement', contribution:'', impact:'', self:0} ],
  achievements:[ {what:'', impact:''} ],                    // exactly 4 rows
  challenges:  [ {area:'', what:'', action:'', support:''} ],     // exactly 3 rows
  goals:       [ {area:'', action:'', outcome:''} ],        // exactly 3 rows
  overall:     {contributions:'', handled_well:'', improve:'', additional_resp:'', support:''},
  suggestions: [ {key, observation:'', solution:'', impact:''} ],  // 6, keyed as listed above
  ahead:       {outcomes:'', responsibility:'', support:'', value:''},
  sec:         {kra:0, comp:0, add:0, comment:''},
  decl:        {name:'', accepted:0}
}
```

The merge copies only keys the empty row already has, and keeps their types — a
number stays a number, a string stays a string. Unknown keys in a saved draft are
ignored rather than carried forward.

### Review (manager)

Built empty from `self`, deep-merged with the saved `review`, the same way.

```js
{
  kras:     [ {rating:0, comment:''} ],                          // same order as self.kras
  comps:    [ {competency:'Teamwork', rating:0, comment:''} ],   // one per self.comps
  contribs: [ {area:'Process Improvement', rating:0, comment:''} ],  // one per self.contribs
  overall_rating: 0,
  key_feedback: '',
  development_recs: ''
}
```

`contribs` carries a row for every contribution area, including the ones the
employee left blank — those simply stay at 0 and are not required.

---

## 11. Validation

**There are no character minimums anywhere, on either side.** Required means
non-empty, measured after trimming. The client mirrors the server's rules *and its
wording*, so the two never contradict each other.

### Employee

| Step | Rule | Message |
|---|---|---|
| `kras` | actual result non-empty | `KRA 1: write the actual result` |
| | rating 1–5 | `KRA 1: pick a rating from 1 to 5` |
| | comments/evidence non-empty | `KRA 1: add comments or evidence` |
| `comps` | rating | `Teamwork: pick a rating` |
| | evidence non-empty | `Teamwork: add an example or evidence` |
| `contrib` | rating required only if either text box has content | `Process Improvement: you wrote something here — rate it too` |
| `ach` | at least one row with both boxes | `Add at least one achievement with its impact` |
| | any row with text needs an impact | `Achievement 2: add the impact` |
| `chal` | at least one row with area + what | `Add at least one challenge` |
| `goals` | at least one row with area + action | `Add at least one goal` |
| `overall` | all five non-empty | `Answer all five overall questions` |
| `sugg` | — optional, always valid | |
| `ahead` | all four non-empty | `Answer all four looking-ahead questions` |
| `summary` | `sec.kra` and `sec.comp` set | `Rate performance / KRAs and KPIs` |
| `decl` | typed name equals `header.employee_name`, trimmed, case-insensitive | `Type your name exactly as "…"` |
| | checkbox ticked | `Tick the declaration` |

The declaration's Submit button is disabled until every non-optional step passes,
the name matches and the box is ticked.

### Manager

Every KRA rated, every competency rated, every **filled** contribution rated, an
overall rating, and both text boxes non-empty. `missingSummary()` turns whatever
is outstanding into one sentence under the button.

---

## 12. Score formulas

Both sides use the same arithmetic, in `store.js`:

```
sectionAverage = Σ(weight × rating) / Σ(weight)     // rows that have a rating
contributions  = mean(ratings)                       // no comparable weight, so a plain mean
overall        = Σ(sectionAverage × sectionWeight) / Σ(sectionWeight)
```

Only sections that have at least one rating take part, so an untouched section
never drags the total down. Section weights come from `cycle.kra_weight`,
`competency_weight`, `additional_weight` on the employee side and from
`weights.kra`, `weights.competency`, `weights.additional` on the manager side.

On the summary step the employee's section ratings are pre-filled from these
averages, rounded — and only where the person has not chosen one themselves. The
"Overall" row of the summary table shows their own section ratings combined,
which can legitimately differ from the computed average.

---

## 13. The autosave engine

`saveQueue.js` is one implementation, instantiated twice: once in `store.js` for
the employee draft, once in `review.js` for the manager review. Both behave
identically.

- A **deep watcher** on the document marks the queue dirty. No field is wired up
  individually, so none can be forgotten.
- Dirty schedules a flush **1.2s** later. Typing keeps pushing it out.
- A flush **snapshots** the document and increments a sequence number. **Only one
  request is ever in flight.** If the document changed while a request was away,
  the queue flushes again when it returns — snapshots can never land out of order,
  and a stale one can never overwrite a newer one.
- The indicator reflects the **latest snapshot**, not the last response:
  `Saving…` / `Saved · just now` → `Ns ago` → `N min ago` / `Couldn't save —
  retrying`.
- It also flushes on step change, rail click, tab change, and before submit.
- On `visibilitychange → hidden` and on `pagehide` it sends with
  `keepalive: true`, so closing the tab mid-sentence still saves.
- A network failure or a 5xx keeps everything in memory, shows "Couldn't save —
  retrying" and retries every **10s** until it succeeds — no user action needed.
- `beforeunload` warns while either queue is dirty.
- `locked`, `window_closed` and `too_big` stop the retries and show the server's
  sentence. Everything else is transient.
- Submitting awaits any in-flight save first, so a save can never race a submit.

Save states, in the order they appear: `idle` → `saving` → `saved`, with
`retrying` and `stopped` as the two ways out.

---

## 14. Every state a person can land in

| State | What they see |
|---|---|
| No `t` in the URL | "This page needs your personal link" |
| Bad token | The server's `bad_link` message on the login screen |
| Link not sent yet / no password set | The server's `not_sent` / `no_password` message |
| Wrong password | The server's message plus "N attempts left before the link locks." |
| Five wrong passwords | The Locked screen, no retry offered |
| Self-appraisal window shut | The Closed screen with `window_note` and the window dates |
| Form reopened by HR | A marigold banner carrying HR's reason, on Welcome and above every wizard step |
| Already submitted | The read-only print view with a Print or save as PDF button |
| Manager-only link | The team list; no "My appraisal" tab, and never a submitted-form view |
| Session expired mid-typing | A login panel over the work; nothing lost; flushed and resumed on re-login |
| Network down | "Couldn't save — retrying", recovering by itself |
| Save refused (locked / window closed / too big) | The server's sentence, retries stopped |
| Load failed | A card with the server's message and a Try again button |
| Empty team | "Nobody reports to you in this cycle" |
| Team member not submitted | Row shows "Waiting for self-appraisal"; tapping toasts the status |
| Review already submitted | The panel read-only with a moss "Review submitted" banner |
| A new build deployed while the tab slept | A toast with a Reload button, after any pending save completes |

Every loading state uses a skeleton sized like the real content — there are no
spinners anywhere, and no layout shift when data arrives.

---

## 15. Accessibility

- Every input and textarea has a real `<label for>`; ids are generated per
  instance so nothing collides.
- Rating buttons are `<button>` elements with `aria-pressed` and
  `aria-label="4 — Exceeds expectations"`, inside a `role="group"` labelled with
  what is being rated. They are in the tab order and announce both value and word.
- The rail steps are buttons, with `aria-current="step"` on the current one and a
  visually hidden "Step 3 of 12, complete".
- The save indicator is a `role="status" aria-live="polite"` region, so changes are
  announced without stealing focus.
- The manager tabs carry `role="tab"` and `aria-selected`; the accordion reports
  `aria-expanded`.
- Errors are tied to their field with `aria-describedby` and `aria-invalid`.
- Focus is visible everywhere — a 2px `--moss-2` outline with a 2px offset.
- Loading regions are marked `aria-busy` and carry a hidden description.
- The page declares `lang="en"`.

---

## 16. Motion

Easing is `cubic-bezier(.2,.7,.2,1)` throughout. Everything below is switched off
under `prefers-reduced-motion: reduce` — both the CSS transitions and the
JavaScript-driven counters and smooth scrolls, which snap instead.

| Element | Motion |
|---|---|
| Step change | Outgoing pane fades and slides 18px in the direction of travel, incoming from the opposite side, 260ms, `out-in`; the pane scrolls to the top at the same time |
| Team list → review panel | The same 260ms slide |
| Rail marker | Ring fills to moss over 200ms; a completed tick scales in from 0.6 over 220ms |
| Rail connector | A second line whose height is the completed ratio, 400ms |
| Rating button | 1px hover lift over 120ms; 180ms fill on select |
| Score | Counts to its new value over 350ms; its bar eases over 500ms |
| Manager gap line | Fades in over 180ms |
| Progress chip | Marigold → moss over 220ms when the last rating lands |
| Save indicator | Dot pulses (opacity .3↔1, 1s) while saving; "Saved" fades in over 200ms |
| Footbar primary button | 1px press on `:active`; disabled has no motion |
| Toasts | Rise 8px and fade in over 250ms, auto-dismiss after 2.6s, three at most |
| Done screen | Tick circle pops (.9 → 1, 400ms), then the check draws (500ms, 200ms delay), then the timeline items stagger in at 60ms intervals |
| Modal, Locked, Closed | A single 220ms fade with a 10px rise |

Nothing else moves. No parallax, no card hover effects, no spinners.

---

## 17. How this was verified

There is no bench on the development machine, so verification was done by
reproducing frappe's esbuild configuration exactly (same `esbuild-plugin-vue3`,
`entryNames`, `target: es2017`, defines) and driving the **real built bundle** in
jsdom against a mock backend.

| Suite | Covers | Result |
|---|---|---|
| Employee flow | login, wrong password, autosave debounce, validation, every step, submit (refused then accepted), done, print | 43/43 |
| Resilience | no token, reload resume, offline retry and recovery, session expiry, read-only, closed window, reopen banner | 20/20 |
| Manager | door, team list ordering and affordances, review panel, partial-review resume, blocked and successful submit, read-only reopen, both-tabs landing rules, panel accessibility | 49/49 |
| Accessibility | labels, names, ids, rating semantics, live region, language | 9/9 |

Zero console errors or warnings across all of them, and zero build warnings in
both development and production modes.

**Not verified here, because they need the deployed app in a real browser:** the
rendered layout at 1440px and 360px, Lighthouse, reduced-motion behaviour, the
`curl -I` cache header, and any run against real tokens.

---

## 18. What the HR console needed — done, see §19

Built. The notes below were the plan; §19 is what actually shipped.

- `App.vue` decides the door in one place (`applyDoor` in `store.js`). An HR door
  is a third branch there, not a rewrite.
- `saveQueue.js` is generic — an HR-side editor gets the same autosave by passing
  its own `snapshot`/`send` pair.
- `theme.css` carries only what the employee and manager sides use. The HR
  console's classes (`.kpi`, `.matrix`, `.drawer`, `.tpl-row`, `.weightbar`,
  `.toggle`) still live in `appraisal-prototype.html` and need porting across —
  same tokens, same easing, so they will drop in cleanly.
- Statuses, chip tones and the score formulas are exported from `store.js` and
  `review.js` rather than duplicated in components, so HR views can reuse them.

---

## 19. HR console

The console HR runs the cycle from. Same design system, same transport, same
`ui/` kit as the employee and manager app — a second page rather than a second
application.

### Route and shell

| URL | What it is |
|---|---|
| `/hr` | The console. Logged in, role-gated. |
| `/hr?print=<appraisal>` | One appraisal rendered alone for the browser's print dialog. |

`workforce/www/hr/index.html` is the same kind of shell as `/appraisal`: a full
HTML document (so frappe skips `templates/web.html` and no navbar renders), the
Inter font, the `wfa-build` meta, the `<!-- csrf_token -->` marker, the
`frappe.dom.set_style` shim, a `<noscript>` panel, and
`include_script('hr.bundle.js')`. It adds one line the guest page does not need:

```html
<script>window.WFA_HR = {{ hr_ctx }};</script>
```

`index.py` builds `hr_ctx` with `frappe.as_json(...)` and then replaces `<` with
`<` — still valid JSON, and a full name containing `</script>` can no longer
close the tag it is written into.

Unlike `/appraisal`, POSTs from this page **are** CSRF-checked, because the
session is a real user rather than Guest. `api.js` already sends the token
whenever the page exposes a real one, so nothing special is needed.

### The door

`index.py` redirects a guest before rendering anything:

```python
if frappe.session.user == "Guest":
    frappe.local.flags.redirect_location = "/login?redirect-to=/hr"
    raise frappe.Redirect
```

Access is granted by exactly three roles: **WF HR Manager**, **WF Admin**,
**WF Recruitment Coordinator**. The standard ERPNext `HR Manager` / `HR User`
roles are held by nearly every user on this site and are deliberately never
consulted.

| State | What renders | Endpoints called |
|---|---|---|
| `WFA_HR.has_access` is 0 | "You don't have access to the HR console", naming the three roles | none, ever |
| any endpoint answers `reason: 'not_allowed'` | the same card | nothing further |
| `api()` returns `http_401` / `http_403` | "Your session has ended" with a **Sign in again** link to `/login?redirect-to=/hr` | nothing further |

Both failures are handled in one place — `call()` in `hrStore.js` — so no view
has to think about them.

### Files

```
workforce/public/js/hr.bundle.js       entry: appraisal/theme.css + hr/HrApp.vue, mounts on #hr-root
workforce/public/js/hr/
  HrApp.vue      left nav, cycle switcher, the door cards, drawer + modal host, print route
  hrStore.js     cycles, roster, templates, derived dashboard numbers, every endpoint wrapper
  csv.js         RFC 4180 CSV out (CRLF, quoted, UTF-8 BOM) and a tolerant CSV parser
  HrToast.vue    the toast stack, bound to hrStore instead of the appraisal store
  Drawer.vue     one appraisal: stage rail, actions by status, activity
  ReadView.vue   a whole WF Appraisal in paper order, print stylesheet
  views/         Dashboard Cycle Templates TemplateEditor People Send Monitor Export
  modals/        PersonModal ImportModal ReopenModal CalibrateModal
workforce/www/hr/index.html            the shell
workforce/www/hr/index.py              redirect, roles, hr_ctx, bundle hash
```

Shared, not copied: `appraisal/api.js`, `appraisal/ui/*`, and from
`appraisal/store.js` the statuses, `statusTone`, `statusIndex`, `ratingWord`,
`fmtDate` and `SUGGESTION_CARDS`. `theme.css` gained the HR classes
(`.hr`, `.hr-nav`, `.hr-main`, `.kpi`, `.matrix`, `.bars`, `.drawer`, `.tpl-row`,
`.tplcard`, `.weightbar`, `.toggle`, `.filters`, `.mailprev`, `.pw`) appended to
it; no existing rule changed.

`statusTone` used to live in `review.js`. It now lives in `store.js` and
`review.js` re-exports it, so the manager area and the console cannot drift
apart on chip colours.

### Build and caching

`bench build --app workforce` picks `hr.bundle.js` up from the `*.bundle.js` glob
and writes `hr.bundle.<hash>.js`, which `include_script('hr.bundle.js')` resolves
from `assets.json`. `index.py` sets `no_cache = 1` and the page carries the hashed
path in `<meta name="wfa-build">`, exactly as `/appraisal` does (§3).

One trap, which cost this page a release: **frappe's esbuild only folds a bundle's
CSS into its JS when the bundle contains an SFC `<style>` block.**
`esbuild/frappe-vue-style.js`'s `get_files()` looks for an input matching
`.vue?type=style`, and schedules the `frappe.dom.set_style(...)` prepend only for
those bundles. Every HR component originally kept its styling in `theme.css` and
declared no `<style>` of its own, so the plugin skipped `hr.bundle`, esbuild wrote
`hr.bundle.<hash>.css` as a plain file, nothing linked it, and `/hr` loaded with
no CSS at all.

Two things stop that happening again:

1. `HrApp.vue` carries a `<style>` block with one real shell rule and a comment
   saying why it must stay. It is as load-bearing as the `set_style` shim itself.
2. `index.py`'s `_hr_css()` globs `public/dist/js/hr.bundle.*.css` and, if a file
   is there, `index.html` links it. When the CSS is inlined no such file exists,
   the glob finds nothing, and nothing is linked — so the fallback costs nothing
   in the normal case.

To check which path a build took:

```bash
grep -c set_style sites/assets/workforce/dist/js/hr.bundle.*.js   # expect 1
ls sites/assets/workforce/dist/js/ | grep 'hr.bundle.*css'        # expect nothing
```

### Statuses

`Draft, Ready, Sent, In Progress, Submitted, Manager Review, Manager Submitted,
Calibrated, Final Approved, Discussed, Closed, Not Applicable`.

A person with no appraisal row yet reads as **Not sent**. `Not Applicable` is the
CEO / manager-only token holder: present in the roster, never sent an appraisal,
and excluded from every count, the matrix and both exports.

Chips: Sent and In Progress marigold, Submitted and Manager Review sky, Manager
Submitted and later moss, `Not Applicable` ink, Draft and Ready plain.

### Doctypes

The `WF Appraisal*` doctypes were created in the ERPNext UI and have never been
exported to this repo — there is no `workforce/workforce/doctype/` folder. That
matters in one direction only: `bench migrate` syncs doctypes **from JSON files
in an app** (`frappe/model/sync.py`, "Sync's doctype and docfields from txt files
to database"), so a doctype with no file in any app is left exactly as the site
has it. **Changes made in the UI cannot be reverted by migrate while that stays
true.**

The two Select fields widened for this release, for the record:

| Doctype | Field | Options |
|---|---|---|
| WF Appraisal Competency | `competency` | Teamwork, Communication, Ownership, Problem-solving, Discipline, Adaptability |
| WF Appraisal Contribution | `area` | Process Improvement, Additional Responsibility, Cost Saving, Cross-Team Support, Initiatives Beyond Regular KRAs |

If these doctypes should live in the repo — worth doing, so a rebuilt site gets
them — export them from the site rather than hand-writing them; a partial JSON
committed here *would* be synced by the next migrate and would overwrite the live
definition with whatever the file omits. Either turn on `developer_mode` in
`site_config.json` and re-save each DocType in the Desk, which writes the JSON
into the app, or:

```bash
bench --site erp.cozycornerpatios.com export-doc DocType "WF Appraisal Competency"
bench --site erp.cozycornerpatios.com export-doc DocType "WF Appraisal Contribution"
```

Then commit whatever lands under `workforce/workforce/doctype/`.

### Dates

The employee app never `Date`-parses server strings. This page has to group by
day and measure day differences, so it parses **the first 10 characters only**
(`YYYY-MM-DD`) as a calendar date and never touches the time part — `dayOf()`,
`daysBetween()` and `isoDay()` in `hrStore.js`. Timestamps render through
`fmtDateTime` (`d MMM yyyy, HH:mm`) and `fmtShort` (`d MMM, HH:mm`).

### Views

Nav order, with counts: **Dashboard · Cycle · KRA templates (n) · People (n) ·
Send (n) · Monitor · Export**. The cycle switcher sits above the nav; changing it
refetches the roster and templates. The chosen cycle and view persist in
`sessionStorage['wfa_hr_cycle']` and `['wfa_hr_view']`. The signed-in line shows
`WFA_HR.full_name` and `user`.

**Dashboard** — everything is derived from the roster; no extra call is made.
Five KPIs (invited-not-submitted, waiting-for-manager, ready-for-calibration,
calibrated-or-beyond, submission rate), a department × status matrix whose cells
open Monitor pre-filtered, a 14-day submissions bar chart drawn as plain divs (no
chart library), and a "needs a nudge" list: managers sitting on a review for more
than three days, and people who were sent a link and never opened it. "Remind N
not submitted" calls `remind` with `{who:'employee', cycle, all_pending:1}` and
summarises the result in one toast.

**Cycle** — the full cycle doc. Save sends only the keys that changed, except the
three weights, which always travel together because the server validates them as
a set. Weight bar, "must total 100", six stage-window pairs, the Enforce dates
and Strict weights toggles, CEO picker (roster rows with `is_ceo`), sender email,
status, and a New cycle button.

**KRA templates** — cards with a weight bar, "used by N", and an amber chip when
the template is not complete. The editor covers name, team, notes, active, KRA
rows (add, remove, reorder, weight, KPI, target), the competencies each with an
on/off toggle, and the contribution areas.

The competency and contribution lists belong to the server: `get_templates`
returns every row in its own order and `save_template` rebuilds both tables in
that order, so the editor renders whatever came back and never assumes a length.
Today that is six competencies — Teamwork, Communication, Ownership,
Problem-solving, Discipline, Adaptability — and five contribution areas —
Process Improvement, Additional Responsibility, Cost Saving, Cross-Team Support,
Initiatives Beyond Regular KRAs. `NEW_TEMPLATE_COMPETENCIES` and
`NEW_TEMPLATE_CONTRIB_AREAS` in `hrStore.js` seed a brand new template and are
used for nothing else; adding a seventh competency server-side needs no frontend
change beyond that seed. The employee, manager and read views already render
from rows. Live "weights
total X of Y" chips. The client mirrors the server's readiness rule — KRA weights
total the section weight, every KRA has a name, a KPI and a target, and under
`strict_weights` the applicable competency weights total their section — and
refuses to save until it passes. Duplicate is a create carrying the same rows.

**People** — the roster table. The template picker saves inline through
`save_employee`. Edit and Add open PersonModal; Import CSV opens ImportModal,
which parses the file in the browser, calls `import_roster` with `dry:1`, shows
the per-row report, and only enables the real import when the dry run reports
zero errors.

**Send** — who, preview, send.

Step 1 lists everyone still invitable. A person is **sendable** when their
appraisal is missing, `Draft`, `Ready`, or `Not Applicable` **with no
`sent_on`** — that last case is the manager or CEO who has no form of their own
this cycle and gets a reviews-only link. Only people filling in a form need a
template, so the "no template" warning applies to rows with `is_manager` and
`is_ceo` both 0; a reviews-only row shows a muted **Reviews only** chip in the
template column instead of a picker. A manager who *does* have a template keeps
the picker and is treated like anyone else.

Step 2 is the real mail. `wfa_hr_preview` renders exactly what `wfa_hr_send`
would send for the selected person — the password masked, the link a placeholder,
nothing written and nothing mailed — and the page shows the recipient, the
subject and the variant, with the HTML in a sandboxed `<iframe srcdoc>` sized to
its content. The frame carries `sandbox="allow-same-origin"`: without
`allow-scripts` nothing in the document can run, and same-origin is what lets the
page measure it. Selection changes are debounced 300 ms; with several people
selected it renders the first and says each person gets their own.

Step 3 does two calls in order: `prepare` for the selected people who have no
record yet — which for a reviews-only manager creates their `Not Applicable`
record — then `send` for every selected row that is now `Ready` or
`Not Applicable`. Results are listed per row; a `Not Applicable` row is marked
"reviews-only link". A row that came back `Draft` is shown with its problems and
an "Open in Monitor" link. A `Draft` appraisal is never mailed.

**Monitor** — search, department, status and manager filters over the roster,
with both weighted scores, last activity and a locked chip. A row with an
appraisal opens the drawer; a row without one says so.

**Export** — two buttons, each calling `export` and building the CSV client-side
with `csv.js`, downloaded as `<cycle>-<shape>-<YYYY-MM-DD>.csv`. Nothing is
written on the server.

### The drawer

Header, chips (status, self, manager, HR rating, locked, reopened), the stage
rail from `Sent … Closed` with its hint text, then the actions for the current
status:

| Status | Actions |
|---|---|
| Draft | Fix KRAs — an inline definition editor calling `save_definitions`, with the server's `readiness_problems` shown above it · Go to Send |
| Ready | Go to Send |
| Sent, In Progress | Send reminder (`remind` employee) · Resend password (`resend`) · Unlock (`unlock`, only when locked) |
| Submitted | Mark reviewed → to manager (`advance` → Manager Review) · Reopen for employee |
| Manager Review | Remind manager (`remind` manager) · Reopen for employee |
| Manager Submitted | Calibrate — HR rating 1–5 plus notes, then `advance` → Calibrated · Reopen for manager |
| Calibrated | Final approval recorded (`advance`) |
| Final Approved | Discussion held — optional notes inline, then `advance` → Discussed |
| Discussed | Close (`advance` → Closed) |
| Submitted or later | Read the form (ReadView inline, drawer widens) · Print view (`/hr?print=<name>` in a new tab) |

Every action refreshes the drawer through `get_appraisal` and the roster through
`get_roster`, then toasts the server's own `message`. The activity list is the
endpoint's `activity`, newest first, as `d MMM, HH:mm · owner · content`.

The drawer is `role="dialog"` with `aria-modal`, takes focus on open, returns it
on close, and closes on Escape — as do the modals.

### Endpoints

All eight are `api('wfa_hr_<name>', payload)` through the same wrapper as the
appraisal app: `data=<JSON>`, the `{ok:1,…}` / `{ok:0, reason, message}` envelope,
reads retried once on a network failure, writes never retried, every `message`
rendered verbatim. Common failures on all of them: `not_allowed`, `bad_json`,
`unknown`.

| Endpoint | Sent | Returns |
|---|---|---|
| `get_cycles` | `{cycle?}` | `{ok:1, cycles:[…], cycle:<full doc or null>}` — the requested one, else Active, else newest |
| `save_cycle` | `{name?, values:{…}}` | `{ok:1, name, status}` — failures `missing_name`, `weights` |
| `get_templates` | `{cycle?, template?}` | `{ok:1, templates:[…], template:<detail or null>, kra_weight, competency_weight}` |
| `save_template` | `{name?, values:{…}}` | `{ok:1, name, created, kra_sum, comp_sum}` — failures `missing_name`, `duplicate` |
| `get_roster` | `{cycle}` | `{ok:1, people:[…], departments:[…]}` — feeds Dashboard, People, Send and Monitor |
| `save_employee` | `{employee_id, values:{…}}` | `{ok:1, name, created}` — failures `missing_id`, `missing_name`, `bad_manager`, `self_manager`, `bad_template` |
| `import_roster` | `{rows:[…], dry}` | `{ok:1, dry, new, updated, errors, applied, report:[…]}` |
| `prepare` | `{cycle, employees:[…], template?, force_template?}` | `{ok:1, created, results:[…]}` — failures `bad_cycle`, `no_people` |
| `send` | `{appraisals:[…]}` | `{ok:1, sent, results:[…]}` — failure `no_rows` |
| `resend` / `unlock` | `{appraisal}` | `{ok:1, appraisal, mail_sent, message}` — failures `not_found`, `not_sent`, `locked`, `no_email` |
| `get_appraisal` | `{name}` | `{ok:1, appraisal:{… plus cycle_weights, readiness_problems, would_be_status, history, activity}}` — failure `not_found` |
| `save_definitions` | `{name, kras?, competencies?, contributions?}` | `{ok:1, name, status, problems}` — `locked` once past Ready |
| `advance` | `{appraisal, to, hr_rating?, notes?}` | `{ok:1, appraisal, status, stamped_on, from}` — failures `not_found`, `bad_transition`, `rating_required` |
| `reopen` | `{appraisal, reason, target}` | `{ok:1, appraisal, status, target, mail_sent, message}` — failures `not_found`, `missing_reason`, `bad_target`, `bad_status` |
| `remind` | `{who, appraisals:[…]}` or `{who, cycle, all_pending:1}`, `dry?` | `{ok:1, who, dry, sent, results:[…]}` — failures `bad_target`, `no_rows` |
| `preview` | `{employee, cycle}` | `{ok:1, subject, html, to, variant:'employee'\|'manager'\|'manager_only'}` — renders what `send` would mail, writes and sends nothing. Failures `not_found`, `bad_cycle` |
| `export` | `{cycle, shape}` | `{ok:1, cycle, shape, columns:[…], rows:[[…]], count}` |

Allowed `advance` transitions: `Submitted→Manager Review`,
`Manager Submitted→Calibrated` (needs `hr_rating` 1–5, `notes` become the
calibration notes), `Calibrated→Final Approved`, `Final Approved→Discussed`
(`notes` become the discussion notes), `Discussed→Closed`. No mail is sent by
`advance`.

### CSV

`csv.js` writes RFC 4180: a field containing a comma, a quote or a line break is
wrapped in quotes with inner quotes doubled, records end with CRLF, and the file
starts with a UTF-8 BOM so Excel reads accented names correctly. The same file
parses an uploaded CSV back — quoted fields, doubled quotes, CRLF or LF, an
optional BOM — into objects keyed by the lower-cased header row.

### How this was verified

The same harness as the appraisal suites: frappe's esbuild options reproduced
exactly, the real built `hr.bundle` driven in jsdom against a mock backend.

| Suite | Covers | Result |
|---|---|---|
| `run4` (HR) | both doors, dashboard numbers from a fixture roster, matrix → Monitor, Monitor filters, all nine drawer actions with their payloads, reopen and calibrate modals, template weight validation, inline template save, CSV import dry → blocked apply, prepare-then-send with mixed results, export CSV bytes, the print route | 77/77 |

Plus the three appraisal suites and the accessibility pass, re-run after the
`statusTone` move: 43/43, 20/20, 49/49, 9/9. Zero console errors or warnings
anywhere; zero build warnings in development and production; `vue-tsc --noEmit`
clean over every `.js` and `.vue` file in `public/js`.

Not verified here, because they need the deployed site: the guest redirect
(`curl -sI /hr` → 302), the logged-in page body, and the rendered layout.
