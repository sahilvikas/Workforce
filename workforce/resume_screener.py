# workforce/workforce/resume_screener.py
#
# v1 AI resume screening — runs on a schedule (every few minutes), like the
# order verifier. Repo Python, so imports ARE allowed here (unlike Server Scripts).
#
# Design goals:
#   - UNBREAKABLE: each resume is screened in its own try/except. One bad PDF
#     marks only that applicant "Screening Failed" and never affects the others
#     or the application itself.
#   - SCALABLE: processes a capped batch per run (BATCH_SIZE). More applicants
#     just take more runs to drain — no redesign needed as volume grows.
#   - ADVISORY ONLY: writes ai_score / ai_grade / ai_summary / screening_notes.
#     It NEVER changes the candidate's status. HR always decides.
#
# v1 handles text-layer PDFs (pdfplumber). Scanned/image PDFs come back with no
# text -> marked "Screening Failed" for manual HR review. OCR fallback = v2.
#
# NOTE: this is repo Python, NOT a Server Script. frappe.make_post_request only
# exists in the safe_exec sandbox — here we use the requests library directly.

import json

import frappe
import pdfplumber
import requests

BATCH_SIZE = 20        # applicants processed per scheduler run
AZURE_TIMEOUT = 120    # seconds

# Azure creds are reused from AI Verifier Settings (same as the order verifier).
AZURE_RESOURCE = "https://zip-cushions-resource.cognitiveservices.azure.com"
AZURE_API_VERSION = "2024-12-01-preview"


def run_resume_screening():
    """Scheduler entry point. Registered in hooks.py (cron every few minutes)."""
    settings_enabled = frappe.db.get_single_value("AI Verifier Settings", "enabled")
    if not settings_enabled:
        return

    api_key = frappe.db.get_single_value("AI Verifier Settings", "openai_api_key")
    model = frappe.db.get_single_value("AI Verifier Settings", "openai_model") or "gpt-5-mini"
    if not api_key:
        return

    # Pick up applicants that have a resume but haven't been screened yet.
    applicants = frappe.get_all(
        "WF Applicant",
        filters={
            "resume": ["is", "set"],
            "ai_score": ["in", [None, 0]],
            "screening_status": ["not in", ["Screening Failed"]],
        },
        fields=["name"],
        order_by="creation asc",
        limit_page_length=BATCH_SIZE,
        ignore_permissions=True,
    )

    for row in applicants:
        # Per-resume isolation: a failure here never stops the batch.
        try:
            _screen_one(row["name"], api_key, model)
        except Exception:
            frappe.log_error(frappe.get_traceback(), "Resume screening failed: " + row["name"])
            try:
                frappe.db.set_value(
                    "WF Applicant",
                    row["name"],
                    {
                        "screening_status": "Screening Failed",
                        "screening_notes": "Automatic screening could not process this resume. Please review manually.",
                    },
                    update_modified=False,
                )
                frappe.db.commit()
            except Exception:
                pass


def _screen_one(applicant_id, api_key, model):
    app = frappe.get_doc("WF Applicant", applicant_id)
    resume_url = app.resume or ""
    if not resume_url:
        raise ValueError("No resume attached")

    # ---- read the private file's bytes ----
    file_name = frappe.db.get_value("File", {"file_url": resume_url}, "name")
    if not file_name:
        raise ValueError("Resume File record not found")
    file_doc = frappe.get_doc("File", file_name)
    content = file_doc.get_content()  # bytes
    if isinstance(content, str):
        content = content.encode("latin-1", "ignore")

    # ---- extract text (v1: text-layer PDFs only) ----
    text = _extract_pdf_text(content)
    if not text or len(text.strip()) < 30:
        # Almost certainly a scanned/image PDF -> needs OCR (v2). Fail gracefully.
        frappe.db.set_value(
            "WF Applicant",
            applicant_id,
            {
                "screening_status": "Screening Failed",
                "screening_notes": "Resume appears to be a scanned image (no readable text). Please review manually.",
            },
            update_modified=False,
        )
        frappe.db.commit()
        return
    if len(text) > 20000:
        text = text[:20000]

    # ---- job context ----
    job_title = ""
    job_desc = ""
    skills_list = []
    if app.job_opening and frappe.db.exists("WF Job Opening", app.job_opening):
        j = frappe.db.get_value(
            "WF Job Opening", app.job_opening, ["job_title", "description"], as_dict=True
        )
        job_title = j.get("job_title") or ""
        job_desc = j.get("description") or ""
        for s in frappe.get_all(
            "WF Required Skill",
            filters={"parent": app.job_opening},
            fields=["skill_name", "is_mandatory"],
            ignore_permissions=True,
        ):
            tag = s.get("skill_name") or ""
            if s.get("is_mandatory"):
                tag = tag + " (mandatory)"
            skills_list.append(tag)
    skills_text = ", ".join(skills_list) if skills_list else "None specified"

    # ---- score via Azure ----
    parsed = _score_with_azure(api_key, model, job_title, skills_text, job_desc, text)

    score = 0
    if parsed.get("score") is not None:
        score = int(float(parsed.get("score")))
    grade = parsed.get("grade") or ""
    summary = parsed.get("summary") or ""
    matched = parsed.get("matched_skills") or []
    missing = parsed.get("missing_skills") or []
    notes = "Matched: " + ", ".join(matched) + " | Missing: " + ", ".join(missing)

    # ---- write ADVISORY fields only (no status change) ----
    frappe.db.set_value(
        "WF Applicant",
        applicant_id,
        {
            "ai_score": score if score > 0 else 1,  # non-zero so it counts as screened
            "ai_grade": grade,
            "ai_summary": summary[:500],
            "screening_notes": notes[:500],
            "screened_on": frappe.utils.nowdate(),
        },
        update_modified=False,
    )
    frappe.db.commit()


def _extract_pdf_text(pdf_bytes):
    from io import BytesIO

    parts = []
    with pdfplumber.open(BytesIO(pdf_bytes)) as pdf:
        for page in pdf.pages:
            t = page.extract_text() or ""
            if t:
                parts.append(t)
    return "\n".join(parts).strip()


def _score_with_azure(api_key, model, job_title, skills_text, job_desc, resume_text):
    azure_url = (
        AZURE_RESOURCE
        + "/openai/deployments/"
        + str(model)
        + "/chat/completions?api-version="
        + AZURE_API_VERSION
    )

    system_msg = (
        "You are an expert technical recruiter. Score how well a candidate's "
        "resume matches a job. Be objective and concise. Respond ONLY with a "
        "valid JSON object, no markdown."
    )
    json_shape = (
        '{"score": <0-100 integer>, "grade": "<A/B/C/D>", '
        '"matched_skills": ["..."], "missing_skills": ["..."], '
        '"summary": "<2-3 sentence assessment>"}'
    )
    user_text = (
        "JOB TITLE: " + job_title
        + "\n\nREQUIRED SKILLS: " + skills_text
        + "\n\nJOB DESCRIPTION:\n" + (job_desc or "Not provided")
        + "\n\nRESUME:\n" + resume_text
        + "\n\nReturn ONLY this JSON object: " + json_shape
        + "\n\nScoring bands: 80-100=A, 60-79=B, 40-59=C, below 40=D. "
          "Cap the score at 50 if any mandatory skill is missing."
    )

    body = {
        "messages": [
            {"role": "system", "content": system_msg},
            {"role": "user", "content": user_text},
        ]
    }
    headers = {"api-key": str(api_key), "Content-Type": "application/json"}

    # repo Python -> use requests (frappe.make_post_request is sandbox-only)
    r = requests.post(azure_url, headers=headers, json=body, timeout=AZURE_TIMEOUT)
    if r.status_code >= 400:
        # surface Azure's own message in the Error Log, not just a status code
        raise RuntimeError("Azure returned " + str(r.status_code) + ": " + str(r.text)[:400])
    resp = r.json()

    content = ""
    choices = resp.get("choices") or []
    if choices:
        content = (choices[0].get("message") or {}).get("content") or ""
    if not content:
        raise RuntimeError("Azure returned no content: " + json.dumps(resp)[:400])

    rt = content.strip()
    if rt.startswith("```"):
        rt = rt.replace("```json", "").replace("```", "").strip()
    return json.loads(rt)