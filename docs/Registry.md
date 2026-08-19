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
| WF Interview Round | WF Interview Template | Round definitions (round_name, default_interviewer) |
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

### API Scripts (4) ✅
| Script | Method | Type | Purpose | Used By |
|---|---|---|---|---|
| wf_get_dashboard_data | GET | API | Returns all applicant data with job_title joined | CandidatesTab.vue |
| wf_get_open_positions | GET | API | Returns published job openings | CandidatesTab.vue, TalentSearchTab.vue |
| wf_submit_application | POST | API | Guest API for external application submission | /apply Web Form |
| wf_get_interview_calendar_data | GET | API | Returns interviews with applicant_name, job_title | InterviewsTab.vue |

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

## Email Notifications (Created in ERPNext UI on dev) ✅
| Name | DocType | Event | Recipient | Purpose |
|---|---|---|---|---|
| WF - Application Received | WF Applicant | New | doc.email | Thank you for applying |
| WF - Application Shortlisted | WF Applicant | Value Change (status) | doc.email | You've been shortlisted |
| WF - Application Rejected | WF Applicant | Value Change (status) | doc.email | Moved forward with others |
| WF - Interview Scheduled | WF Interview | New | doc.applicant_email | Interview scheduled details |
| WF - Offer Letter Sent | WF Offer Letter | New | doc.applicant_email | Congratulations offer |
| WF - New Applicant Alert | WF Applicant | New | System Manager role | Internal HR alert |

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
| `workforce/workforce/page/workforce_hub/workforce_hub.js` | Thin page loader, mounts Vue app |
| `workforce/workforce/page/workforce_hub/__init__.py` | Python init (empty) |
| `workforce/workforce/page/__init__.py` | Python init (empty) |

### Bundle Entry
| File | Purpose |
|---|---|
| `workforce/public/js/workforce_hub.bundle.js` | esbuild entry — imports WorkforceHub.vue, registers globally |

### Vue Components
| File | Purpose | API Integration |
|---|---|---|
| `workforce/public/js/components/WorkforceHub.vue` | Parent — header, 4 tabs, hash routing | — |
| `workforce/public/js/components/JobsTab.vue` | Job openings CRUD, KPIs, filters, detail panel, skills | `frappe.client.*` (generic CRUD) |
| `workforce/public/js/components/CandidatesTab.vue` | Pipeline/table, status change, schedule interview, create offer | `wf_get_dashboard_data` → fallback `frappe.client.get_list` |
| `workforce/public/js/components/InterviewsTab.vue` | Calendar/list, feedback form, reschedule, cancel | `wf_get_interview_calendar_data` → fallback `frappe.client.get_list` |
| `workforce/public/js/components/TalentSearchTab.vue` | CSV upload, parse, import, match scoring, invite | `wf_import_prospects`, `wf_send_invite`, `wf_bulk_invite` |

### Shared Components
| File | Purpose |
|---|---|
| `workforce/public/js/components/shared/Badge.vue` | Color-coded status badges (maps all 30+ statuses) |
| `workforce/public/js/components/shared/KpiCard.vue` | Stat cards with value + label |
| `workforce/public/js/components/shared/DetailPanel.vue` | Slide-out panel with header, body, actions slots |
| `workforce/public/js/components/shared/Dialog.vue` | Modal form dialog with submit/cancel, loading state |
| `workforce/public/js/components/shared/Toast.vue` | Success/error/info notification popup |

---

## API Integration Map

### JobsTab.vue
| Action | API Method | Backend |
|---|---|---|
| Load jobs | `frappe.client.get_list` WF Job Opening | ✅ Doctype |
| Load single job (with skills) | `frappe.client.get` WF Job Opening | ✅ Doctype |
| Create job | `frappe.client.insert` WF Job Opening | ✅ Doctype |
| Update job | `frappe.client.save` WF Job Opening | ✅ Doctype |
| Delete job | `frappe.client.delete` WF Job Opening | ✅ Doctype |
| Change status | `frappe.client.save` WF Job Opening | ✅ Doctype |

### CandidatesTab.vue
| Action | API Method | Backend |
|---|---|---|
| Load candidates | `wf_get_dashboard_data` | ✅ Server Script API |
| Load open jobs | `wf_get_open_positions` | ✅ Server Script API |
| Change status | `frappe.client.save` WF Applicant | ✅ Doctype |
| Load interviews | `frappe.client.get_list` WF Interview | ✅ Doctype |
| Load interview template | `frappe.client.get` WF Interview Template | ✅ Doctype |
| Schedule interview | `frappe.client.insert` WF Interview | ✅ Doctype + triggers After Save script |
| Create offer | `frappe.client.insert` WF Offer Letter | ✅ Doctype + triggers Email Notification |

### InterviewsTab.vue
| Action | API Method | Backend |
|---|---|---|
| Load interviews | `wf_get_interview_calendar_data` | ✅ Server Script API |
| Submit feedback | `frappe.client.save` WF Interview | ✅ Doctype + triggers After Save script |
| Reschedule | `frappe.client.save` WF Interview | ✅ Doctype |
| Cancel interview | `frappe.client.save` WF Interview | ✅ Doctype |

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
| Create WF Prospect doctype | High | ❌ Not started |
| Create wf_import_prospects API | High | ❌ Not started |
| Create wf_send_invite API | High | ❌ Not started |
| Create wf_bulk_invite API | High | ❌ Not started |
| Fix SMTP email delivery | Medium | ⚠️ Blocked on Sahil |
| Complete end-to-end lifecycle test via Workforce Hub | High | ❌ After deploy |
| Delete old Web Pages (/recruitment-dashboard, /interview-calendar) | Low | After Workforce Hub verified |
| Get SSH access for Vamshi (self-deploy) | Medium | ❌ Ask Sahil/Priyanshi |

---

## Deleted / Renamed Objects

| Object | Type | Action | Date | Reason |
|---|---|---|---|---|
| — | — | — | — | — |