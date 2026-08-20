# REGISTRY.md — Workforce Module

---

## Doctypes (Created in ERPNext UI on dev)

### Main Doctypes
| Doctype | WF HR Manager | WF Interviewer |
|---|---|---|
| WF Job Opening | Read, Write, Create, Delete | — |
| WF Interview Template | Read, Write, Create, Delete | — |
| WF Applicant | Read, Write, Create, Delete | — |
| WF Interview | Read, Write, Create, Delete | Read, Write (feedback fields only) |
| WF Offer Letter | Read, Write, Create, Delete | — |
| WF Candidate Detail | Read, Write, Create, Delete | — |
| WF AI Settings | Read, Write | — |
| WF Google Settings | Read, Write | — |
| WF Onboarding Template | Read, Write, Create, Delete | — |
| WF Onboarding | Read, Write, Create, Delete | — |

### Child Table Doctypes
| Doctype | Parent | Purpose |
|---|---|---|
| WF Required Skill | WF Job Opening | skill_name (Data), is_mandatory (Check) |
| WF Screening Criteria | WF Job Opening | Scoring criteria rows |
| WF Interview Round | WF Interview Template | Round definitions (round_name, default_interviewer, duration, round_type) |
| WF Required Document | WF Onboarding Template | Documents required from candidates |
| WF Education Entry | WF Candidate Detail | Education history |
| WF Experience Entry | WF Candidate Detail | Work experience |
| WF Document Entry | WF Candidate Detail | Uploaded documents |
| WF Reference Entry | WF Candidate Detail | References |

### Pending Doctype (Not yet created)
| Doctype | Purpose | Status |
|---|---|---|
| WF Prospect | Talent Search — CSV imported candidates with match scoring | ❌ Needs creation |

---

## Roles
| Role | Access |
|---|---|
| WF HR Manager | Full HR operations access to all doctypes |
| WF Interviewer | Interview feedback submission only |

---

## Server Scripts (Created in ERPNext UI on dev)

### DocType Event Scripts (5) ✅
| Script | Event | DocType | Purpose |
|---|---|---|---|
| WF Applicant Before Save | Before Save | WF Applicant | Status validation, previous_status tracking |
| WF Applicant After Save | After Save | WF Applicant | Auto-create Candidate Detail on Offer Accepted, interview count sync |
| WF Interview After Save | After Save | WF Interview | Sync interview results back to applicant |
| WF Applicant Keyword Screening | Before Save | WF Applicant | Manual keyword scoring when HR changes status to "Under Screening" |
| WF Applicant Auto Score | After Insert | WF Applicant | Auto-scores on web form submission using keyword matching |

### API Scripts — Original (4) ✅
| Script | Method | Type | Purpose | Used By |
|---|---|---|---|---|
| wf_get_dashboard_data | GET | API | Returns all applicant data with job_title joined | CandidatesTab.vue |
| wf_get_open_positions | GET | API | Returns published open job openings | CandidatesTab.vue, TalentSearchTab.vue |
| wf_submit_application | POST | API | Guest API for external application submission | /apply Web Form |
| wf_get_interview_calendar_data | GET | API | Returns interviews with applicant_name, job_title | InterviewsTab.vue |

### API Scripts — Workforce Hub CRUD (11) ✅ Created Aug 20, 2026
| Script | Method | Type | Purpose | Used By |
|---|---|---|---|---|
| wf_get_job_openings | GET | API | Returns all jobs with skills, template info | JobsTab.vue |
| wf_create_job_opening | POST | API | Creates job opening with required skills | JobsTab.vue |
| wf_update_job_opening | POST | API | Updates job fields, status, skills | JobsTab.vue |
| wf_delete_job_opening | POST | API | Deletes a job opening | JobsTab.vue |
| wf_update_applicant_status | POST | API | Changes applicant status with validation | CandidatesTab.vue |
| wf_schedule_interviews | POST | API | Creates interview records per round, updates applicant | CandidatesTab.vue |
| wf_create_offer | POST | API | Creates offer letter, sets applicant to Offer Sent | CandidatesTab.vue |
| wf_submit_feedback | POST | API | Saves rating/recommendation/feedback, marks complete | InterviewsTab.vue |
| wf_reschedule_interview | POST | API | Updates interview date/time | InterviewsTab.vue |
| wf_cancel_interview | POST | API | Sets interview status to Cancelled | InterviewsTab.vue |
| wf_get_interview_templates | GET | API | Returns all templates with rounds and job count | JobsTab.vue |

### Pending APIs (Needed for Talent Search tab)
| Script | Method | Type | Purpose | Status |
|---|---|---|---|---|
| wf_import_prospects | POST | API | Parse CSV, create WF Prospect records, auto-score | ❌ Needs creation |
| wf_send_invite | POST | API | Send invite email to specific prospect | ❌ Needs creation |
| wf_bulk_invite | POST | API | Send invite emails to all 80%+ match prospects | ❌ Needs creation |

---

## Client Scripts (Created in ERPNext UI on dev)
| Script | DocType | Purpose |
|---|---|---|
| WF Applicant schedule dialog | WF Applicant | Schedule Interview action button (shows when status === "Shortlisted") |
| WF Interview Client | WF Interview | Feedback form enhancements |

---

## Email Notifications (Created in ERPNext UI on dev)
| Name | DocType | Event | Recipient | Purpose | Status |
|---|---|---|---|---|---|
| WF - Application Received | WF Applicant | New | doc.email | Thank you for applying | ✅ Built, ⚠️ SMTP broken |
| WF - Application Shortlisted | WF Applicant | Value Change (status) | doc.email | You've been shortlisted | ✅ Built, ⚠️ SMTP broken |
| WF - Application Rejected | WF Applicant | Value Change (status) | doc.email | Moved forward with others | ✅ Built, ⚠️ SMTP broken |
| WF - Interview Scheduled | WF Interview | New | doc.applicant_email | Interview scheduled details | ✅ Built, ⚠️ SMTP broken |
| WF - Offer Letter Sent | WF Offer Letter | New | doc.applicant_email | Congratulations offer | ✅ Built, ⚠️ SMTP broken |
| WF - New Applicant Alert | WF Applicant | New | System Manager role | Internal HR alert | ✅ Built, ⚠️ SMTP broken |
| WF - Interview Assigned to Interviewer | WF Interview | New | doc.interviewer | Interview details + feedback link | ❌ Needs creation |

**⚠️ Blocker:** SMTP not working — ZIPCushions Support email encryption key mismatch. Sahil needs to fix.

---

## Web Form (Created in ERPNext UI on dev)
| Form | Route | DocType | Guest Access | Purpose |
|---|---|---|---|---|
| Job Application | /apply | WF Applicant | ✅ Yes | Public application form |

---

## Web Pages (Created in ERPNext UI on dev — TO BE RETIRED)
| Page | Route | Purpose | Status |
|---|---|---|---|
| Recruitment Dashboard | /recruitment-dashboard | Pipeline/table view, KPIs | ⚠️ Being replaced by Workforce Hub |
| Interview Calendar | /interview-calendar | Week/list view of interviews | ⚠️ Being replaced by Workforce Hub |

---

## Frontend — Vue (In GitHub Repo) ✅

### Page Registration
| File | Purpose |
|---|---|
| `workforce/workforce/page/workforce_hub/workforce_hub.json` | Registers `/app/workforce-hub` route |
| `workforce/workforce/page/workforce_hub/workforce_hub.js` | Thin page loader — hides Frappe head, mounts Vue via createApp |
| `workforce/workforce/page/workforce_hub/__init__.py` | Python init (empty) |
| `workforce/workforce/page/__init__.py` | Python init (empty) |

### Bundle Entry
| File | Purpose |
|---|---|
| `workforce/public/js/workforce_hub.bundle.js` | Imports Vue createApp + WorkforceHub, registers mountHub globally |

### Vue Components
| File | Purpose | API Integration |
|---|---|---|
| `workforce/public/js/components/WorkforceHub.vue` | Parent — header, 4 tabs, hash routing (#jobs, #candidates, #interviews, #talent), hides Frappe page head | — |
| `workforce/public/js/components/JobsTab.vue` | Job openings CRUD + Interview Templates sub-view with rounds | `wf_get_job_openings`, `wf_create_job_opening`, `wf_update_job_opening`, `wf_delete_job_opening`, `wf_get_interview_templates` |
| `workforce/public/js/components/CandidatesTab.vue` | Pipeline/table, status change, schedule interview, create offer, interview history | `wf_get_dashboard_data`, `wf_get_open_positions`, `wf_update_applicant_status`, `wf_schedule_interviews`, `wf_create_offer` |
| `workforce/public/js/components/InterviewsTab.vue` | Calendar/list, enhanced feedback form (stars, recommendations, skill ratings, strengths/improvements), pending banner, previous round context, role-based filtering, HR-only reschedule/cancel | `wf_get_interview_calendar_data`, `wf_submit_feedback`, `wf_reschedule_interview`, `wf_cancel_interview` |
| `workforce/public/js/components/TalentSearchTab.vue` | CSV upload, parse, import, match scoring, invite, bulk invite | `wf_import_prospects`, `wf_send_invite`, `wf_bulk_invite` (pending) |

### Shared Components
| File | Purpose |
|---|---|
| `workforce/public/js/components/shared/Badge.vue` | Color-coded status badges (maps all 30+ statuses) |
| `workforce/public/js/components/shared/KpiCard.vue` | Stat cards with value + label |
| `workforce/public/js/components/shared/DetailPanel.vue` | Slide-out panel (top: 60px below navbar), header, body, actions slots |
| `workforce/public/js/components/shared/Dialog.vue` | Modal form dialog (top: 60px below navbar), submit/cancel, loading state |
| `workforce/public/js/components/shared/Toast.vue` | Success/error/info notification popup, auto-dismiss 3s |

---

## API Integration Map

### JobsTab.vue
| Action | API Method | Backend |
|---|---|---|
| Load all jobs with skills | `wf_get_job_openings` | ✅ Server Script API |
| Create job | `wf_create_job_opening` | ✅ Server Script API |
| Update job / change status | `wf_update_job_opening` | ✅ Server Script API |
| Delete job | `wf_delete_job_opening` | ✅ Server Script API |
| Load templates | `wf_get_interview_templates` | ✅ Server Script API |
| Create/update template | `frappe.client.insert` / `frappe.client.save` | ⚠️ Direct (no wf_* API yet) |
| Delete template | `frappe.client.delete` | ⚠️ Direct (no wf_* API yet) |

### CandidatesTab.vue
| Action | API Method | Backend |
|---|---|---|
| Load candidates | `wf_get_dashboard_data` | ✅ Server Script API |
| Load open jobs | `wf_get_open_positions` | ✅ Server Script API |
| Change status | `wf_update_applicant_status` | ✅ Server Script API |
| Schedule interviews | `wf_schedule_interviews` | ✅ Server Script API |
| Create offer | `wf_create_offer` | ✅ Server Script API |
| Load interview history | `frappe.client.get_list` WF Interview | ⚠️ Direct (read-only, acceptable) |
| Load interview template | `frappe.client.get` WF Interview Template | ⚠️ Direct (read-only, acceptable) |

### InterviewsTab.vue
| Action | API Method | Backend |
|---|---|---|
| Load interviews | `wf_get_interview_calendar_data` | ✅ Server Script API |
| Submit feedback | `wf_submit_feedback` | ✅ Server Script API |
| Reschedule | `wf_reschedule_interview` | ✅ Server Script API |
| Cancel interview | `wf_cancel_interview` | ✅ Server Script API |
| Load previous rounds | `frappe.client.get_list` WF Interview | ⚠️ Direct (read-only, acceptable) |
| Check user role | `frappe.client.get_list` Has Role | ⚠️ Direct (read-only, acceptable) |

### TalentSearchTab.vue
| Action | API Method | Backend |
|---|---|---|
| Load jobs | `wf_get_open_positions` | ✅ Server Script API |
| Load prospects | `frappe.client.get_list` WF Prospect | ❌ WF Prospect doctype not created |
| Import prospects | `wf_import_prospects` | ❌ API not created |
| Send invite | `wf_send_invite` | ❌ API not created |
| Bulk invite | `wf_bulk_invite` | ❌ API not created |

---

## Auto-Scoring Algorithm
- Fires on **After Insert** (web form submission) — fully automatic
- Also fires on **Before Save** when status → "Under Screening" (manual HR trigger)
- Matches `skills` + `cover_letter` against WF Required Skill rows from Job Opening
- Score = (matched / total) × 100
- Mandatory skills missed → score capped at 50
- Score ≥ 70 → auto-Shortlisted
- Score 40-69 → Under Screening (HR review)
- Score < 40 → auto-Rejected at Screening
- Sets: ai_score, screened_by ("Auto Scorer"), screening_notes

---

## Deployment

### Current Workflow
1. Write Vue code in `workforce/public/js/components/`
2. Push to `github.com/sahilvikas/Workforce.git` (main branch)
3. Sahil runs: `git pull origin main` + `bench build --app workforce` + `bench migrate` + `bench restart`
4. Live at `dev.cozycornerpatios.com/app/workforce-hub`

### Production (pending)
- Move to `erp.cozycornerpatios.com`
- Sahil handles migration

---

## Pending Items

| Item | Priority | Status |
|---|---|---|
| Fix `wf_get_open_positions` API (KeyError in console) | 🔴 High | ❌ Check/recreate on dev |
| Fix `wf_create_job_opening` link validation (ignore_links flag) | 🔴 High | ❌ Update API on dev |
| Fix `wf_update_job_opening` link validation (ignore_links flag) | 🔴 High | ❌ Update API on dev |
| Sahil: `bench build --app workforce` (latest Vue not compiled) | 🔴 High | ⚠️ Waiting on Sahil |
| Create WF Prospect doctype | High | ❌ Not started |
| Create wf_import_prospects API | High | ❌ Not started |
| Create wf_send_invite API | High | ❌ Not started |
| Create wf_bulk_invite API | High | ❌ Not started |
| Create Email Notification: WF - Interview Assigned to Interviewer | Medium | ❌ Not created |
| Fix SMTP email delivery | Medium | ⚠️ Blocked on Sahil |
| Create wf_* APIs for template CRUD (save/delete) | Low | ❌ Optional |
| Complete end-to-end lifecycle test via Workforce Hub | High | ❌ After deploy |
| Delete old Web Pages (/recruitment-dashboard, /interview-calendar) | Low | After Workforce Hub verified |
| Get SSH access for Vamshi (self-deploy) | Medium | ❌ Ask Sahil/Priyanshi |

---

## Deleted / Renamed Objects

| Object | Type | Action | Date | Reason |
|---|---|---|---|---|
| — | — | — | — | — |