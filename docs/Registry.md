# REGISTRY.md — Workforce Module

**Last updated: Aug 28, 2026** (previous snapshot: Aug 21, 2026)

---

## Doctypes (Created in ERPNext UI on dev)

### Main Doctypes
| Doctype | WF HR Manager | WF Interviewer | Notes |
|---|---|---|---|
| WF Job Opening | Read, Write, Create, Delete | — | Extended Aug 24 (requisition fields) |
| WF Interview Template | Read, Write, Create, Delete | — | |
| WF Applicant | Read, Write, Create, Delete | — | Status flow extended through Onboarded |
| WF Interview | Read, Write, Create, Delete | Read, Write (feedback fields only) | |
| WF Offer Letter | Read, Write, Create, Delete | — | Extended Aug 23 (offer-response token fields) |
| WF Candidate Detail | Read, Write, Create, Delete | — | Extended Aug 23 (onboarding form fields) |
| WF AI Settings | Read, Write | — | |
| WF Google Settings | Read, Write | — | ⚠️ Not a Single — see known issues |
| WF Onboarding Template | Read, Write, Create, Delete | — | |
| WF Onboarding | Read, Write, Create, Delete | — | |
| WF Job Requisition | (via server scripts, ignore_permissions) | — | ✅ Created Aug 24, 34 fields |

### Child Table Doctypes (verified against DB Aug 28)
| Doctype | Parent | Purpose |
|---|---|---|
| WF Required Skill | WF Job Opening | skill_name (Data), is_mandatory (Check) |
| WF Interview Round Config | WF Interview Template | Round definitions (round_name, default_interviewer, duration_minutes, round_type) |
| WF Candidate Education | WF Candidate Detail | Education history |
| WF Candidate Experience | WF Candidate Detail | Work experience |
| WF Candidate Document | WF Candidate Detail | Uploaded documents |
| WF Onboarding Task Template | WF Onboarding Template | Task rows for onboarding template |
| WF Onboarding Task | WF Onboarding | Task instances on an onboarding record |

**Corrections from Aug 28 DB audit** — the old registry listed doctypes that do NOT exist: WF Screening Criteria, WF Required Document, WF Education Entry, WF Experience Entry, WF Document Entry, WF Reference Entry. Real names are the WF Candidate * and WF Onboarding Task * tables above, and the round child table is **WF Interview Round Config** (not "WF Interview Round"). Total: 18 WF doctypes on dev.

⚠️ **Schema note (Aug 22 audit):** WF Interview Round Config's real fieldname is `duration_minutes`, NOT `duration` (confirmed in DB Aug 28). All 4 existing templates had duration_minutes = 0 because the save script wrote to a nonexistent `duration` field — see pending fixes.

⚠️ **Schema mismatch (open, re-confirmed Aug 28):** `WF Interview Round Config.default_interviewer` is still Link→**Employee** while `WF Interview.interviewer` is Link→**User**. DB values are actually User emails, so only the field type needs changing — no data migration.

### Field Changes (Aug 21, 2026 — Google Calendar Integration)
| Doctype | Field | Type | Purpose | On dev | On prod |
|---|---|---|---|---|---|
| WF Interview | google_event_id | Data (Hidden) | Google Calendar event ID for reschedule/cancel sync | ✅ | ❌ |
| WF Google Settings | client_id | Data | Google OAuth Client ID | ✅ | ❌ |
| WF Google Settings | client_secret | Password | Google OAuth Client Secret | ✅ | ❌ |
| WF Google Settings | refresh_token | Small Text | Google OAuth Refresh Token (long-lived) | ✅ | ❌ |

Note: `WF Interview.google_meet_link` (Data) already existed. `WF Google Settings.service_account_json` kept for future production Service Account option — currently unused.

### Field Changes (Aug 23, 2026 — Offer Response Flow)
| Doctype | Field | Purpose | On dev | On prod |
|---|---|---|---|---|
| WF Offer Letter | access_token | Tokenized offer-response URL | ✅ | ❌ |
| WF Offer Letter | expires_on | Token expiry (7 days) | ✅ | ❌ |
| WF Offer Letter | response_source | Candidate link vs HR override | ✅ | ❌ |
| WF Offer Letter | response_ip | IP of candidate response | ✅ | ❌ |
| WF Offer Letter | response_confirmed_name | Name typed by candidate to confirm | ✅ | ❌ |
| WF Offer Letter | response_notes | Notes on response | ✅ | ❌ |

### Field Changes (Aug 23, 2026 — Candidate Onboarding Form)
12 new fields on **WF Candidate Detail**: current_address, permanent_address, pan_number, aadhaar_number, emergency_contact_name, emergency_contact_phone, emergency_contact_relation, bank_account_name, bank_account_number, bank_ifsc, bank_name, submitted_on. On dev ✅ / on prod ❌.

### Field Changes (Aug 24, 2026 — Requisition Workflow)
| Doctype | Field | Purpose | On dev | On prod |
|---|---|---|---|---|
| WF Job Opening | assigned_hr | Position owner (junior HR / coordinator) | ✅ | ❌ |
| WF Job Opening | priority | HR-set priority | ✅ | ❌ |
| WF Job Opening | source_requisition | Link back to WF Job Requisition | ✅ | ❌ |
| WF Job Opening | status_reason | Reason for Hold/Close | ✅ | ❌ |

WF Job Opening status Select options are **Open / On Hold / Closed** (not "Hold").

**WF Job Requisition** autoname: `format:WF-REQ-.YYYY.-.#####` — the dots matter. A curly-brace/hash-only pattern produces deterministic hashes of first-inserted values, so identical drafts silently collide and overwrite each other. Status Select options (verified Aug 28): Draft / Pending Approval / Needs Revision / Approved / Rejected / Published / Cancelled.

**⚠️ Known issue (re-confirmed issingle=0 on Aug 28):** WF Google Settings was created as a regular doctype, not a Single — records get random names (current: `be8jog6lii`). Scripts locate it via `frappe.db.get_value("WF Google Settings", {"enable": 1}, "name")`. Consider converting to Single before production.

### Pending Doctypes (Not yet created)
| Doctype | Purpose | Status |
|---|---|---|
| WF Prospect | Talent Search — CSV imported candidates with match scoring | ❌ Needs creation |
| WF BGV Check (+ child WF BGV Check Item) | Background verification phase between Offer Accepted and Onboarding | ⏸️ Deferred — consult HR on real workflow (vendor, checks, discrepancy handling) before designing |

---

## Roles
| Role | Access | Created |
|---|---|---|
| WF HR Manager | Full HR operations access to all doctypes | Aug 22, 2026 (didn't exist before — created manually) |
| WF Interviewer | Interview feedback submission only | Original |
| WF Hiring Manager | Raise/edit requisitions for own team; live positions read-only | Aug 24, 2026 |
| WF Leadership | Approve/reject/request-changes on requisitions (Approvals tab); Jobs dashboard read-only | Aug 24, 2026 |
| WF Recruitment Coordinator | Only positions where assigned_hr = self ("My Positions") | Aug 24, 2026 |

### Role Assignments (dev)
- **WF Leadership:** Priyesh (mandatory sole final approver on every hire, 1-week SLA, no delegation)
- **WF HR Manager:** Asha (asha@cozycornerpatios.com, primary user), Vamshi
- **WF Hiring Manager (placeholders):** Sahil, Harshit, Marcel, Mohit — real manager→team mapping list pending
- **WF Recruitment Coordinator (placeholders):** Damini, Aditi (real: Sandeep = full-time hires, Thoshal = internships)

### Custom DocPerms (Aug 24, 2026)
Standard DocType permissions can't be modified outside developer mode (CannotCreateStandardDoctypeError) — use **Custom DocPerm** records instead. Added: HR Manager read on Company + Department (standard HR Manager role had no Company read in this ERP); WF HR Manager read/write/create on all 7 WF doctypes + Designation. Product decision: HR Manager gets full HR module control; junior HRs get scoped-down roles later.

---

## Server Scripts (Created in ERPNext UI on dev)

**Naming convention reality (Aug 28 audit):** most Server Script record *names* use spaces ("wf save interview template") while `api_method` uses underscores (`wf_save_interview_template`) — that's the normal, live pattern. The exceptions are the three interview scripts (schedule / reschedule / cancel), where underscore-NAMED records (`wf_schedule_interviews`, `wf_reschedule_interview`, `wf_cancel_interview`) are the canonical implementations and the spaces-named records are disabled older stubs. Also `wf_google_*` and `wf_get_dashboard_data` are underscore-named. When an API misbehaves, always check for two records sharing one api_method.

### DocType Event Scripts (actual names, verified Aug 28)
| Script | Event | DocType | Purpose | Status |
|---|---|---|---|---|
| WF Applicant before save set status | Before Save | WF Applicant | Status validation + derivation. Extended Aug 23: derives status from screening_status + final_decision + interview_count, checks WF Offer Letter to advance through Offer Sent / Offer Accepted / Offer Declined, excludes Cancelled interviews from count | ✅ |
| WF Applicant Keyword Screening | Before Save | WF Applicant | Keyword scoring. **Guarded Aug 23**: only runs once at creation (skips when ai_score already set) so HR's manual screening decision is never clobbered; invalid `screened_by = "Auto Scorer"` User-link write removed | ✅ |
| WF Interview after save update applicant | After Save | WF Interview | Sync interview results back to applicant (round completion bumps current_round) | ✅ |
| WF Interview before save validate | Before Save | WF Interview | Interview validation (treats WF HR Manager and System Manager as equivalent server-side) | ✅ |
| WF Offer Letter after save send offer | After Save | WF Offer Letter | On status change (doc.get_doc_before_save guard): candidate confirmation email + HR notification; on Offer Accepted, emails candidate the tokenized /candidate-onboarding URL | ✅ Aug 23 |
| WF Applicant Auto Score | After Insert | WF Applicant | Duplicate scorer, wrote invalid screening_status values (Pass/Review/Fail) | 🚫 Disabled Aug 24 |
| WF Applicant after save notifications | After Save | WF Applicant | Reads nonexistent `previous_status` field | 🚫 Disabled |

❓ **Note:** there is NO enabled "WF Applicant After Save" script (the old registry credited it with auto-creating WF Candidate Detail on Offer Accepted). The auto-create most likely lives inside `wf_submit_offer_response` / the Offer Letter after-save script — confirm and pin down.

### API Scripts — Original (4) ✅
| Script | Method | Purpose | Used By |
|---|---|---|---|
| wf_get_dashboard_data | GET | All applicant data with job_title joined. ⚠️ Returns a **bare array**, not `{applicants, stats}` — frontend computes stats client-side (broke the Aug 24 build until patched) | CandidatesTab.vue |
| wf_get_open_positions | GET | Published open job openings | CandidatesTab.vue, TalentSearchTab.vue |
| wf_submit_application | POST | Guest API for external application submission | /apply Web Form |
| wf_get_interview_calendar_data | GET | Interviews with applicant_name, job_title | InterviewsTab.vue |

### API Scripts — Workforce Hub CRUD ✅
| Script | Method | Purpose | Used By |
|---|---|---|---|
| wf_get_job_openings | GET | All jobs with skills, template info. ❓ Verify it returns the 4 new requisition fields + callable by coordinator role | JobsTab.vue |
| wf_create_job_opening | POST | Creates job opening with required skills | JobsTab.vue |
| wf_update_job_opening | POST | Updates job fields, status, skills | JobsTab.vue |
| wf_delete_job_opening | POST | Deletes a job opening | JobsTab.vue |
| wf_update_applicant_status | POST | Changes applicant status with validation. **Fixed Aug 22:** also syncs screening_status + final_decision to match HR's pick so the Before Save derivation doesn't revert it (Shortlisted → screening=Shortlisted; Rejected at Screening → screening=Rejected; Selected → screening=Shortlisted + decision=Selected; Not Selected → decision=Not Selected; Applied/Under Screening → both reset to Pending) | CandidatesTab.vue |
| wf_schedule_interviews | POST | Creates interview records per round + Google Calendar event with Meet link + email notifications | CandidatesTab.vue |
| wf_create_offer | POST | **Rewritten Aug 23:** writes correct schema fields (offered_salary / joining_date / offer_content — old annual_ctc / start_date / terms writes were silently dropped), sets offer.status = "Sent", blocks duplicate active offers per applicant, generates access token (timestamp+applicant_name — frappe.utils.random_string is blocked in safe_exec), sets 7-day expiry, sends branded HTML email with Accept/Decline links | CandidatesTab.vue |
| wf_submit_feedback | POST | Saves rating/recommendation/feedback, marks complete; round completion bumps applicant.current_round and derivation advances Interview Scheduled → In Progress → All Rounds Complete | InterviewsTab.vue |
| wf_reschedule_interview | POST | Updates date/time + syncs Google Calendar (Meet link preserved) + email. **Fixed Aug 22:** wrote status "Rescheduled" which isn't in the Select (options are Scheduled / In Progress / Completed / Cancelled — double-L) → now writes "Scheduled" | InterviewsTab.vue |
| wf_cancel_interview | POST | Sets Cancelled + cancels Google Calendar event + email | InterviewsTab.vue |
| wf_get_interview_templates | GET | Templates with rounds and job count. ⚠️ Reads nonexistent `r.duration` → always falls back to 45; fix pending (read `r.duration_minutes`, keep output key `duration` so frontends unchanged) | JobsTab.vue |
| wf_save_interview_template | POST | Create/update template with rounds. ⚠️ Writes nonexistent `duration` field (schema is `duration_minutes`) — this has been silently dropping durations all along; also hardcodes round_type = "HR Screening". Fixes pending | JobsTab.vue |
| wf_delete_interview_template | POST | Delete template | JobsTab.vue |

### API Scripts — Google Calendar Integration (3) ✅ Created Aug 21, 2026
| Script | Method | Purpose | Status |
|---|---|---|---|
| wf_google_create_event | POST | Standalone: creates Calendar event with Meet link | ⚠️ Standalone/testing — logic runs inline in wf_schedule_interviews |
| wf_google_update_event | POST | Standalone: updates Calendar event | ⚠️ Standalone/testing — inline in wf_reschedule_interview |
| wf_google_delete_event | POST | Standalone: cancels Calendar event | ⚠️ Standalone/testing — inline in wf_cancel_interview |

**Decision needed (ask Sahil):** keep the 3 standalone wf_google_* scripts as testing utilities, or delete them.

### API Scripts — Offer Response Flow (3) ✅ Created Aug 23, 2026
| Script | Method | Guest | Purpose |
|---|---|---|---|
| wf_get_offer_by_token | GET | ✅ | Load offer details for the /offer-response page |
| wf_submit_offer_response | POST | ✅ | Candidate Accept/Decline with name confirmation; cascades to Offer Accepted + auto-creates WF Candidate Detail |
| wf_hr_mark_offer_response | POST | ❌ (WF HR Manager / System Manager) | HR override for phone/verbal confirmations |

**Design decision:** primary path = tokenized public page from the offer email; fallback = HR override button in CandidatesTab. Email-polling auto-parse of candidate replies was rejected (parsing ambiguity, spoofing risk, legal defensibility) — at most a future suggestion layer, never auto-flipping status.

### API Scripts — Candidate Onboarding (2) ✅ Created Aug 23, 2026
| Script | Method | Guest | Purpose |
|---|---|---|---|
| wf_get_candidate_detail_by_token | GET | ✅ | Load candidate detail for the /candidate-onboarding form |
| wf_submit_candidate_detail | POST | ✅ | Submit personal info + govt IDs + emergency contact + bank details; flips Candidate Detail → Submitted, applicant → Onboarding Initiated |

### API Scripts — Complete Onboarding (1) ✅ Created Aug 24, 2026
| Script | Method | Purpose |
|---|---|---|
| wf_complete_onboarding | POST (WF HR Manager / System Manager) | Validates applicant at Onboarding Initiated with Submitted Candidate Detail → creates ERPNext **Employee** record (from Candidate Detail + Offer Letter, ignore_mandatory for extra hrms fields) → applicant → Onboarded, Candidate Detail → Verified → welcome email with company-email credentials |

Onboarding product decision: "onboarding" = HR issues company email + temp password + Employee record. No IT/Admin task-checklist workflow for now.

### API Scripts — Requisition Workflow (8) ✅ Created Aug 24–25, 2026
| Script | Method | Purpose |
|---|---|---|
| wf_create_requisition | POST | Manager creates requisition (Draft or submit for approval) |
| wf_leadership_decide | POST | Priyesh: Approve / Request Changes / Rejected |
| wf_hiring_manager_edit_requisition | POST | Edit Draft or Needs Revision; bumps revision_count on resubmit |
| wf_hr_publish_requisition | POST | Creates WF Job Opening from approved requisition + assigns owner (assigned_hr) |
| wf_get_requisitions | GET | Role-filtered list + KPIs |
| wf_get_requisition_detail | GET | Full detail + timeline + permissions |
| wf_manager_action | POST | Cancel + delete-draft |
| wf_hr_position_action | POST | Hold / close / reactivate / reassign a live position |
| wf_get_hr_owners | GET | Recruiter + HR-manager lists for publish/reassign dropdowns (frappe.client.get_list on Has Role 403s — child table gated by check_parent_permission) |

**Requisition rules (locked Aug 24):** only Managers raise requisitions for their own team; Priyesh is mandatory sole approver on every hire (1-week SLA); Request Changes → manager edits/resubmits; Reject → requisition dies; HR prioritizes and assigns 1 owner per position (reassignable) or keeps as caretaker; Team Manager picks interviewers, HR picks templates; On Hold blocks new applications only (existing pipeline continues); manager can edit description/skills/openings freely but **CTC changes need re-approval**; no auto-post to job boards — HR shares URL manually.

### API Scripts — Found in Aug 28 DB Audit, ❓ purpose/status to confirm
| Script (api_method) | Guest | Notes |
|---|---|---|
| wf_get_candidate_detail | ❌ | Not in old registry — likely HR-side read of a Candidate Detail. Confirm which frontend calls it |
| wf_get_position_detail | ❌ | Not in old registry — likely JobsTab position detail panel. Confirm |
| wf_update_candidate_status | ❌ | Not in old registry — possibly early/duplicate of wf_update_applicant_status. Confirm keep vs disable |
| wf_initiate_onboarding | ❌ | From the original spec (creates Employee) — likely superseded by wf_complete_onboarding (Aug 24). Confirm keep vs disable |

### Pending APIs (Talent Search tab)
| Script | Method | Purpose | Status |
|---|---|---|---|
| wf_import_prospects | POST | Parse CSV, create WF Prospect records, auto-score | ❌ Not started |
| wf_send_invite | POST | Invite email to specific prospect | ❌ Not started |
| wf_bulk_invite | POST | Invite all 80%+ match prospects | ❌ Not started |

---

## Applicant Pipeline & Manual Gates

**Status flow:** Applied → Under Screening → Shortlisted / Rejected at Screening → Interview Scheduled → Interview In Progress → All Rounds Complete → Selected / Not Selected → Offer Sent → Offer Accepted / Offer Declined → Onboarding Initiated → Onboarded. (BGV statuses — BGV Initiated / Cleared / Failed — planned between Offer Accepted and Onboarding, deferred.)

**Product philosophy — automation-first:** HR never leaves the Workforce Hub UI; everything flows automatically except 4 genuine human-decision gates:
1. HR shortlists or rejects an Under Screening candidate (screening is a **manual HR gate** — no auto/implicit shortlisting downstream)
2. HR picks Selected / Not Selected after All Rounds Complete
3. HR fills salary/date and clicks Create Offer
4. HR fills company email + temp password and clicks Complete Onboarding

Full flow verified end-to-end on dev through Offer Accepted → Candidate Detail auto-created → onboarding form → Employee created (Test1c, Aug 23–24).

---

## Auto-Scoring Algorithm
- Fires **once only, at creation** (Before Save, guarded — skips when ai_score already set). The After Insert duplicate ("WF Applicant Auto Score") is disabled.
- Matches `skills` + `cover_letter` against WF Required Skill rows from Job Opening
- Score = (matched / total) × 100; mandatory skills missed → capped at 50
- Score ≥ 70 → auto-Shortlisted; 40–69 → Under Screening (HR review); < 40 → auto-Rejected at Screening
- Sets: ai_score, screening_notes. (`screened_by = "Auto Scorer"` removed — invalid User link; 12 old records cleaned Aug 23, was blocking feedback submission with LinkValidationError)
- Open product question: keep auto-scoring as one-time triage vs delete entirely, given the manual-screening gate

---

## Client Scripts (Created in ERPNext UI on dev)
| Script | DocType | Purpose |
|---|---|---|
| WF Applicant schedule dialog | WF Applicant | Schedule Interview action button (status === "Shortlisted") |
| WF Interview Client | WF Interview | Feedback form enhancements |

---

## Email Notifications (Created in ERPNext UI on dev)

❓ **Aug 28 DB audit: a query for Notification records named `WF %` returned ZERO rows.** Either the 7 notifications below were deleted at some point (plausible, since script-driven sendmail superseded most of them), or they're named without the WF prefix. Verify with the broad query in 01c — if they're gone, this whole table moves to Deleted Objects and the "review duplicate emails before prod" pending item can be dropped.
| Name | DocType | Event | Recipient | Status |
|---|---|---|---|---|
| WF - Application Received | WF Applicant | New | doc.email | ✅ Built, SMTP prod only |
| WF - Application Shortlisted | WF Applicant | Value Change (status) | doc.email | ✅ Built, SMTP prod only |
| WF - Application Rejected | WF Applicant | Value Change (status) | doc.email | ✅ Built, SMTP prod only |
| WF - Interview Scheduled | WF Interview | New | doc.applicant_email | ⚠️ Superseded — wf_schedule_interviews sends richer email (with Meet link). Review duplicates on prod; disable if doubled |
| WF - Offer Letter Sent | WF Offer Letter | New | doc.applicant_email | ⚠️ Likely superseded — wf_create_offer now sends the branded offer email with Accept/Decline links. Review for duplicates before prod |
| WF - New Applicant Alert | WF Applicant | New | System Manager role | ✅ Built, SMTP prod only |
| WF - Interview Assigned to Interviewer | WF Interview | New | doc.interviewer | ⚠️ Superseded — interviewer gets scheduling email from wf_schedule_interviews |

Script-driven emails (frappe.sendmail, guarded by default outgoing Email Account existence — silently skipped on dev, works on prod): interview schedule/reschedule/cancel, offer with Accept/Decline links, offer response confirmation + HR notification, onboarding-form link on acceptance, welcome email with credentials on Complete Onboarding.

---

## Web Forms & Public Pages
| Item | Route | Guest | Purpose | Status |
|---|---|---|---|---|
| Job Application (Web Form) | /apply | ✅ | Public application → WF Applicant | ✅ |
| Offer Response (Web Page) | /offer-response | ✅ (token) | Candidate Accept/Decline, name confirmation; calls wf_get_offer_by_token + wf_submit_offer_response | ✅ New Aug 23 |
| Candidate Onboarding (Web Page) | /candidate-onboarding | ✅ (token) | Personal info + govt IDs + emergency contact + bank details form | ✅ New Aug 23 |
| Recruitment Dashboard (old) | /recruitment-dashboard | — | Replaced by Workforce Hub | ⚠️ To retire |
| Interview Calendar (old) | /interview-calendar | — | Replaced by Workforce Hub | ⚠️ To retire |

Candidate portal (login-based) is explicitly **out of scope** — candidates only interact via tokenized one-time email links.

---

## Frontend — Vue (In GitHub Repo) ✅

### Page Registration & Bundle
| File | Purpose |
|---|---|
| `workforce/workforce/page/workforce_hub/workforce_hub.json` | Registers `/app/workforce-hub` route |
| `workforce/workforce/page/workforce_hub/workforce_hub.js` | Thin page loader — hides Frappe head, mounts Vue |
| `workforce/public/js/workforce_hub.bundle.js` | Vue createApp + WorkforceHub, registers mountHub globally |

### Vue Components
| File | Purpose |
|---|---|
| `WorkforceHub.vue` | Parent — header, **6 tabs** with hash routing (#jobs, #candidates, #interviews, #talent, #requisitions, #approvals). **Role-based tab visibility** (Aug 25): Approvals only for WF Leadership + System Manager; hash routing validates against visible tabs so users can't deep-link into tabs they lack |
| `JobsTab.vue` | **Rebuilt Aug 25** with sub-nav: Hiring Dashboard (new default) / Job Openings / Interview Templates. Dashboard: Awaiting HR Review (Publish + Assign dialog), Pending Leadership (read-only), Live Positions (hold/close/reactivate/reassign menu). Role-scoped: HR Manager + System Manager = full; Leadership = read-only; Coordinator = "My Positions" only; Hiring Manager = live positions read-only (until manager→team mapping arrives). Sub-nav is HR-only |
| `CandidatesTab.vue` | Pipeline/table + Kanban (Onboarded column added). Interviewer field = **User dropdown** (was free text, Aug 22). Status dropdown restricted via `allowedNextStatuses` guardrails (only valid next statuses per current state). Complete Onboarding section (Company/Department dropdowns + Company Email + Temp Password, shows at Onboarding Initiated), Onboarded confirmation block, Onboarding Form Link display + copy button (Offer Accepted / Onboarding Initiated). Handles wf_get_dashboard_data returning a bare array |
| `InterviewsTab.vue` | Calendar/list, feedback form, HR-only reschedule/cancel. **isHR fix (Aug 22):** reads `frappe.user_roles` client-side with System Manager fallback — the old Has Role get_list 403'd for every user, breaking the tab for everyone |
| `RequisitionsTab.vue` | ✅ New Aug 25 — Manager view + HR view, role-aware KPIs/columns, create/edit/cancel dialogs, detail panel with timeline, Save as Draft + Submit for Approval, business-justification char counter, filter + search |
| `ApprovalsTab.vue` | ✅ New Aug 25 — Leadership queue (pending/history), Approve / Request Changes / Reject dialogs, overdue >7d flag, revision history block |
| `TalentSearchTab.vue` | CSV upload, import, match scoring, invite, bulk invite — backend pending |

### Shared Components
| File | Purpose |
|---|---|
| `shared/Badge.vue` | Color-coded status badges (30+ statuses) |
| `shared/KpiCard.vue` | Stat cards |
| `shared/DetailPanel.vue` | **Rewritten Aug 25** — was accidentally a verbatim copy of Dialog.vue (rendered a centered modal, silently dropped `#actions` slot content, broke JobsTab Edit/Delete). Now a proper right-side slide-in panel with `#actions` slot + slide transition |
| `shared/Dialog.vue` | Modal form dialog. Added `#footer-extra` slot Aug 25 (footer splits into left for extra buttons like "Save as Draft", right for Cancel/Submit) |
| `shared/Toast.vue` | Success/error/info popup, auto-dismiss 3s |

---

## API Integration Map

### JobsTab.vue
| Action | API | Backend |
|---|---|---|
| Load jobs / requisition dashboard | `wf_get_job_openings`, `wf_get_requisitions` | ✅ |
| Create / update / delete job | `wf_create_job_opening` / `wf_update_job_opening` / `wf_delete_job_opening` | ✅ |
| Publish + assign / position actions | `wf_hr_publish_requisition`, `wf_hr_position_action`, `wf_get_hr_owners` | ✅ |
| Templates load / save / delete | `wf_get_interview_templates`, `wf_save_interview_template`, `wf_delete_interview_template` | ✅ (duration bug pending) |

### CandidatesTab.vue
| Action | API | Backend |
|---|---|---|
| Load candidates / open jobs | `wf_get_dashboard_data`, `wf_get_open_positions` | ✅ |
| Change status | `wf_update_applicant_status` | ✅ |
| Schedule interviews (+ Meet + email) | `wf_schedule_interviews` | ✅ |
| Create offer (+ token + email) | `wf_create_offer` | ✅ |
| HR offer override | `wf_hr_mark_offer_response` | ✅ |
| Complete onboarding (→ Employee) | `wf_complete_onboarding` | ✅ |
| Interview history / template (read-only) | `frappe.client.get_list` / `get` | ⚠️ Direct, acceptable |

### InterviewsTab.vue
| Action | API | Backend |
|---|---|---|
| Load interviews | `wf_get_interview_calendar_data` | ✅ |
| Submit feedback | `wf_submit_feedback` | ✅ |
| Reschedule / cancel (+ Calendar sync) | `wf_reschedule_interview` / `wf_cancel_interview` | ✅ |
| Previous rounds (read-only) | `frappe.client.get_list` WF Interview | ⚠️ Direct, acceptable |
| Role check | `frappe.user_roles` (client-side) | ✅ (Has Role get_list removed — 403) |

### RequisitionsTab.vue / ApprovalsTab.vue
| Action | API | Backend |
|---|---|---|
| List + KPIs / detail + timeline | `wf_get_requisitions` / `wf_get_requisition_detail` | ✅ |
| Create / edit / cancel (manager) | `wf_create_requisition` / `wf_hiring_manager_edit_requisition` / `wf_manager_action` | ✅ |
| Approve / Request Changes / Reject | `wf_leadership_decide` | ✅ |

### Public pages
| Page | APIs |
|---|---|
| /offer-response | `wf_get_offer_by_token`, `wf_submit_offer_response` (Guest) |
| /candidate-onboarding | `wf_get_candidate_detail_by_token`, `wf_submit_candidate_detail` (Guest) |

### TalentSearchTab.vue
All backend pending (WF Prospect + 3 APIs) ❌

---

## Google Calendar Integration — Architecture Notes
- **Auth:** OAuth 2.0 refresh-token flow. Credentials in WF Google Settings (client_id, client_secret, refresh_token, calendar_owner_email, timezone). ⚠️ **Priyesh requirement:** invites must go out under **hr@cozycornerpatios.com** (Asha's company mailbox), NOT owner@ — the first setup was authorized as owner@ and **must be redone**. Swap credentials = zero code changes.
- **HTTP:** `frappe.make_post_request` / `frappe.make_put_request` (available in RestrictedPython) — no repo Python.
- **Flow:** wf_schedule_interviews → refresh access token → POST event with `conferenceData` (auto Meet link) → stores `google_meet_link` + `google_event_id` → emails candidate + interviewer (guarded by Email Account existence).
- **Reschedule:** PUT to same event via google_event_id — Meet link preserved, `sendUpdates=all`. Verified end-to-end Aug 22.
- **Cancel:** PUT status=cancelled. Verified end-to-end Aug 23.
- **Timezone guard:** invalid values (e.g. "Delhi/India") normalized to "Asia/Kolkata" — invalid IANA timezone → Google 400.
- **Testing gotcha:** System Console rolls back DB writes but external side-effects (calendar events) still happen. Test via browser `frappe.call` or the UI.

---

## safe_exec / RestrictedPython Gotchas (running list — read before writing any Server Script)
- `frappe.utils.random_string` blocked → use timestamp + string concat
- Augmented assignment `+=` on strings rejected → `x = x + ...`
- Top-level `return` not allowed → assign to a var, set `frappe.response["message"]` at the end
- Tuple unpacking `a, b = t` throws `_unpack_sequence_ not defined` → separate lookups
- Underscore attributes blocked (`frappe._dict` → `"_dict" is an invalid attribute name`) → frappe.new_doc / plain dict
- `frappe.clear_cache` and `frappe.cache()` blocked → working Server Script cache flush is a no-op `doc.save()` on the script itself (save hooks flush the server_script cache)
- `frappe.get_installed_apps()` blocked in System Console → `frappe.db.sql` on tabInstalled Application (returns hashed IDs on this dev, not readable names)
- `frappe.utils.password.update_password` blocked → set `new_password` on the User doc directly with `ignore_password_policy`
- `frappe.as_json` blocked → use `json.dumps(obj, indent=2, default=str)` (the `json` namespace is whitelisted)
- System Console: `script.execute_method()` does NOT auto-commit — call `frappe.db.commit()` explicitly (real HTTP API calls auto-commit); DB writes made directly in console are rolled back after execution
- Duplicate Server Scripts with the same api_method (e.g. spaces vs underscore names) silently intercept calls — check for both when an API misbehaves

---

## Deployment

### Current Workflow
1. Write Vue code in `workforce/public/js/components/`
2. Push **directly to `main`** on `github.com/sahilvikas/Workforce.git` (no PRs/feature branches; historical `feat/workforce-hub` branch unused)
3. Sahil runs: `git pull origin main` + `bench build --app workforce` + `bench migrate` + `bench restart`
4. Live at `dev.cozycornerpatios.com/app/workforce-hub`
5. **Sunday policy:** Sahil unavailable — server-script-only changes on Sundays, frontend waits for weekday

### Environment facts
- Dev and PROD share the SAME bench — `apps/workforce` is one folder serving both sites (branch switching affects PROD)
- **hrms is installed on dev** — Employee doctype exists; mandatory fields: first_name, gender, date_of_birth, date_of_joining, status, company. Companies on dev: DDecor, Fabrics And More, Cozy Corner Patios LLC
- Dev has no default outgoing Email Account — all script emails guarded by existence check; SMTP confirmed working on prod (Sahil)

### Production migration (pending)
- Move to `erp.cozycornerpatios.com` — Sahil handles; intern/devs never touch PROD; all doctypes/scripts move manually (no fixtures)
- Delete all test templates, candidates, interviews + test Google Calendar events before/at migration (so no data-migration scripts needed for the duration_minutes fix etc.)
- Google credentials: authorize as **hr@cozycornerpatios.com** (or CCP Workspace Service Account) and fill WF Google Settings on prod — no code changes

---

## Pending Items

| Item | Priority | Status |
|---|---|---|
| Redo Google OAuth under hr@cozycornerpatios.com (Priyesh: invites must come from hr@, not owner@) | 🔴 High | ❌ |
| Fix wf_save_interview_template: write `duration_minutes` (not `duration`), stop hardcoding round_type = "HR Screening" | 🔴 High | ❌ Batched |
| Fix wf_get_interview_templates: read `r.duration_minutes` (keep output key `duration`) | 🔴 High | ❌ Batched |
| Change WF Interview Round Config `default_interviewer` Link→Employee → Link→User (re-confirmed still Employee, Aug 28; data already User emails, no migration) | High | ❌ |
| Create Offer form: Designation is Link→Designation but frontend is a plain text input → LinkValidationError on unknown strings. Fix: Designation dropdown or server-side auto-create | High | ❌ |
| Scope CandidatesTab for WF Recruitment Coordinator (currently sees all applicants) | High | ❌ Next patch |
| Verify wf_get_job_openings returns the 4 new requisition fields + callable by coordinator | High | ❌ |
| Get real manager→team mapping list (unlocks scoped WF Hiring Manager views + real role assignments) | High | ❌ User to supply |
| Fix `wf_get_open_positions` KeyError (from Aug 21 list) | 🔴 High | ❓ Verify still occurring |
| Fix wf_create/update_job_opening link validation (ignore_links) (from Aug 21 list) | 🔴 High | ❓ Verify still needed |
| WF Prospect doctype + wf_import_prospects / wf_send_invite / wf_bulk_invite (Talent Search) | High | ❌ Not started |
| Offer token auto-expire + reminder scheduled jobs (skipped for Aug 24 HR demo) | Medium | ❌ |
| BGV phase (WF BGV Check doctypes, statuses, vendor choice AuthBridge/IDfy/SpringVerify) | Medium | ⏸️ Deferred until HR workflow consult |
| Review duplicate emails on prod: Interview Scheduled + Offer Letter Sent notifications vs script sendmail | Medium | ❌ Before prod |
| Convert WF Google Settings to true Single doctype | Medium | ❌ Before prod |
| Decide with Sahil: keep or delete standalone wf_google_* scripts | Medium | ❌ |
| Create standard interview templates (HR, later) + scoped-down junior-HR roles | Medium | ⏸️ HR decides |
| SSH access for Vamshi (self-deploy) | Medium | ❌ Ask Sahil/Priyanshi |
| Clean up test WF Interview/Applicant/Template records + test Calendar events | Medium | At prod migration |
| Confirm purpose of wf_get_candidate_detail / wf_get_position_detail / wf_update_candidate_status; decide keep vs disable wf_initiate_onboarding (superseded by wf_complete_onboarding?) | Medium | ❓ From Aug 28 audit |
| Locate WF Candidate Detail auto-create logic (no "WF Applicant After Save" script exists — likely in wf_submit_offer_response) | Medium | ❓ From Aug 28 audit |
| Verify Email Notifications — WF-named Notification records returned zero rows Aug 28 | Medium | ❓ Run 01c |
| wf_* APIs for template CRUD hardening | Low | Optional |
| Delete old Web Pages (/recruitment-dashboard, /interview-calendar) | Low | After Hub verified |

### Resolved since Aug 21 snapshot ✅
- **Aug 28 DB audit:** round child table confirmed as WF Interview Round Config; WF Google Settings confirmed not Single; WF Job Opening's 4 requisition fields confirmed present; all 3 spaces-named interview-script stubs confirmed disabled with underscore versions live; /offer-response + /candidate-onboarding confirmed published; requisition status options captured
- Sahil bench build (Google Meet UI push) — done; subsequent deploys verified
- E2E Google Meet: reschedule verified Aug 22, cancel verified Aug 23, schedule in daily use
- Applicant status derivation chain (Interview Scheduled → In Progress → All Rounds Complete) verified Aug 23
- HR manual status persists across derivation cascade (screening_status/final_decision sync + one-time scorer guard)
- Full pipeline verified through Onboarded (Employee record created) Aug 24
- Asha's dev login created (WF HR Manager + HR Manager + HR User)
- hrms install question answered (installed on dev)

---

## Deleted / Disabled Objects

| Object | Type | Action | Date | Reason |
|---|---|---|---|---|
| wf schedule interviews (spaces name) | Server Script (API) | Disabled on dev, confirmed Aug 24 | Aug 21, 2026 | Duplicate api_method — was intercepting calls. Delete manually on dev + verify never existed on prod |
| wf reschedule interview (spaces name) | Server Script (API) | Disabled (db.set_value + commit + cache flush via no-op doc.save) | Aug 22, 2026 | Older stub (flat form_dict `interview_name`, no Calendar/email logic) enabled alongside the real underscore version — intercepting calls |
| wf cancel interview (spaces name) | Server Script (API) | Disabled (same method) | Aug 22, 2026 | Same as above |
| WF Applicant Auto Score | Server Script (After Insert) | Disabled | Aug 24, 2026 | Duplicate scorer; wrote invalid screening_status values (Pass/Review/Fail) |
| WF Applicant after save notifications | Server Script | Already disabled | — | Reads nonexistent `previous_status` field |
| screened_by = "Auto Scorer" on 12 WF Applicant records | Data | Cleared to None (db.set_value + commit) | Aug 23, 2026 | Invalid User link — blocked feedback submission (LinkValidationError on applicant cascade save) |