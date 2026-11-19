# ISO assessment workflow — implementation acceptance

Status: live demo verified for the journey below. Builds on the approved starter adoption, existing Evidence Requests and the approved Program Assessment/Documents/Issues/Activity layout. Backend implementation belongs in v1. No new questionnaire engine or compliance score is introduced.

## Required journey

- [x] Resolve the flagged Monitoring and improvement requirement using the existing independent requirement review.
- [x] Activate Digital Banking Information Security through the existing Program review.
- [x] Create an assessment from its approved ISO adoption, pinned questionnaire version and real active respondents in the selected units.
- [ ] Reject wrong-tenant, wrong-unit, self-review, stale Program and unapproved questionnaire requests.
- [x] Save and reopen a signed-in respondent draft with optimistic concurrency; retain native date, text and file fields.
- [x] Upload clearly labelled fictional banking records, submit, and preserve immutable answers and artifact provenance.
- [x] Independently review the submitted question groups and documents. Record supporting-information review separately from configured scoring and compliance conclusions.
- [x] Create a linked Program issue for a recorded gap and retain the response/review reference.
- [x] Show actual assessment, outstanding response/document review and issue counts; retain reviewed records in Activity.
- [x] Show the same assessment review outcome in Overview and Assessment, and the same file review outcome in the Documents register and record drawer.
- [x] Exercise light/dark, keyboard and responsive layouts while preserving the approved composition.
- [x] Complete the live journey in the in-app browser and reconcile saved records against the copied database.

## Design and domain boundaries

Reuse native Evidence Requests, field validation, artifact upload/download, recipient assignment, Program authority, issue commands and outbox events. Framework adoption supplies scope and version-pinned questionnaire identity. Intended units are resolved to eligible people; choosing a department never fabricates recipient membership.

Signed-in drafts extend the existing response-draft storage with an explicit principal identity rather than generating an invitation or impersonating a capture session. Independent submission reviews record group-level evidence quality on immutable submissions; they do not invent a rubric, alter respondent answers or declare ISO compliance. Existing configured field-assessment workflows remain separate.

Only real workflow counts are shown. Requirement compliance coverage remains unknown unless the existing configured assessment projection supports a conclusion. Preserve original template and approved form revisions. Use fictional demo evidence, never forged production approval or customer records.

## Live demo verification

### Question expiry and source validation · 18 November 2026

- [x] Save and reopen per-question validity and an exact source binding revision in the existing Forms editor.
- [x] Independently approve the questionnaire through the assigned Internal Auditor route.
- [x] Save a respondent draft and submit a matching fictional identifier, retaining the source receipt and distinct seven-day and thirty-day expiry timestamps.
- [x] Submit a separate identifier absent from the sample register and retain the missing-match result.
- [x] Reload the responses and verify saved source results and dates.
- [x] Advance a separate browser tab to 26 November, verify the seven-day answer is expired while the thirty-day answer is current, then close the simulated-clock tab and verify the original tab still uses real time.
- [x] Check the editor and response at 1440, 768 and 390 pixels in light and dark themes, with keyboard entry and no page-level horizontal overflow.
- [x] Run 19 frontend model checks, the frontend production build, the affected backend and source-adapter suites, and the isolated PostgreSQL assessment workflow.

The local demo uses an explicitly prepared, fictional CSV-backed Source Registry fixture. Its Source Registry activation is fixture setup because the existing catalog exposes draft creation and inspection without a lifecycle activation command. The questionnaire approval, assigned response, lookup, receipt storage and expiry handling use the real services. Two fictional assignments were created through the evidence API from approved questionnaire revision 4. No production deployment or third-party API connection was exercised. Home navigation and archived design references were preserved.

The source contract and scope checks are documented in v1 at `api/question-quality.md`. Full-page editor and response captures are stored under `output/screenshots/question-quality-2026-11-18/`.

On 17 November 2026, in DB-ISO-DEMO-20261117, the October ISO cycle showed **Changes requested** in Overview, on the Assessment card, and in the assessment detail. Filtering Documents by **Follow-up required** returned only `access.png`, and the drawer showed the same outcome while retaining its separate file storage status. Enter opened the record and Escape closed it. The drawer and filter were checked at 1440, 768 and 390 pixels in light and dark mode with no page-level horizontal overflow.

On 16 November 2026, the built-in browser exercised DB-ISMS-01 using Program Owner, Evidence Respondent and Chief Risk Officer demo accounts. The Program was activated with five approved requirements. Assessment 01a1e50a-490d-759f-9ebf-0f240f194c61 used ISO starter questionnaire v3. PostgreSQL confirmed draft v3, 15 submitted answers, five file bindings and one independent review with one group requiring follow-up. All five fictional files downloaded through the local demo artifact policy. The privileged access file retained its follow-up state.

The Program-linked issue MAT-83FA3B00ED45B793 is in Triage. Its description references the response and review; the association to the review is textual. Overview showed one cycle, zero responses awaiting initial independent review, one open issue and one file requiring review or follow-up. Activity showed creation, submission and review.

Browser checks covered the five Program tabs at 1440, 768 and 390 pixels in light and dark mode, without page-level horizontal overflow. Keyboard checks included opening Assessment and closing the mobile document drawer with Escape. This is a workflow and layout check, not a pixel parity claim. Requirement coverage remains unavailable without a governed requirement-assessment projection.

The migration was tested and applied to the isolated acceptance database before the copied demo database. The PostgreSQL integration test passed, along with the v1 Evidence, Monitoring and HTTP API suites, v2 type checking and the Vite build. The test exercised wrong-unit respondent, stale Program version, unapproved questionnaire version, draft conflicts, self-review and revoked reviewer. A dedicated wrong-tenant assessment creation test remains outstanding.

### Assessment correction and resubmission · 19 November 2026

- [x] Use the revised Program workspace reference for the Assessment filters, cycle list, selected cycle, three detail tabs, question cards, review dialog and history disclosures.
- [x] Verify separately signed-in Program Owner, Evidence Respondent and Chief Risk Officer roles. The Program Owner can create and track assessments and inspect recorded decisions. The assigned respondent can edit, save and resubmit. The pinned independent reviewer can request changes and review the exact submitted version. The unrelated Internal Auditor was denied access to the response.
- [x] Request a correction on two questions in revision 1 and set a deadline. Display the reviewer’s reasons alongside the affected questions for the assigned respondent.
- [x] Replace the signed access-review PDF, retain the other four files, save the correction draft, reopen it and resubmit. Verify the new revision awaits independent review.
- [x] Review revision 2 and open revisions 1 and 2 separately. Verify that each retains its own answers, decisions and original evidence. Download both privileged-access PDFs as the reviewer using their exact response links.
- [x] Check document review status and current document selection against the exact response and question. Activity records the resubmission separately from the first submission.
- [x] Compare the app and archived prototype at 1440 × 900, 900 × 900 and 390 × 844 in light and dark themes. Check list/detail stacking, keyboard tab navigation and focus restoration on mobile dialogs. The Assessments page and tested mobile dialogs had no horizontal overflow.
- [x] Run the v2 production build and node checks, the v1 Evidence, HTTP API and Monitoring suites, and the isolated PostgreSQL workflow. The integration test covers stale correction references, immutable attachments, retained file validity, saved draft filenames, stale review attempts and unauthorized response reads.

The walkthrough uses a dedicated fictional assessment on the approved ISO/IEC 27001:2022 starter form version 3. Its [live response history](http://127.0.0.1:5196/?screen=programs&program=01a1e8df-3259-7411-8435-0efdb47cfc95&tab=assessment&request=01a1f124-51d3-7ef9-a145-09d7cf08d38f) is available through the local demo accounts. Captures are in `output/screenshots/assessment-correction-2026-11-19/`.

The live Assessment tab uses authenticated Program navigation and the saved questionnaire, including its fifteen questions. The prototype uses sample actor selection and a short illustrative questionnaire. The live review records Reviewed or Changes needed with a reason and a correction deadline. Assessment evidence is attached to the corresponding file question. The Configuration tab opens the authorized recurring-schedules drawer and shows the separate collection-renewal policy. The drawer uses supported calendar and custom intervals. Event-triggered schedules are unavailable. Schedule approval and dispatch were outside this correction walkthrough.
