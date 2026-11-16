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
- [x] Exercise light/dark, keyboard and responsive layouts while preserving the approved composition.
- [x] Complete the live journey in the in-app browser and reconcile saved records against the copied database.

## Design and domain boundaries

Reuse native Evidence Requests, field validation, artifact upload/download, recipient assignment, Program authority, issue commands and outbox events. Framework adoption supplies scope and version-pinned questionnaire identity. Intended units are resolved to eligible people; choosing a department never fabricates recipient membership.

Signed-in drafts extend the existing response-draft storage with an explicit principal identity rather than generating an invitation or impersonating a capture session. Independent submission reviews record group-level evidence quality on immutable submissions; they do not invent a rubric, alter respondent answers or declare ISO compliance. Existing configured field-assessment workflows remain separate.

Only real workflow counts are shown. Requirement compliance coverage remains unknown unless the existing configured assessment projection supports a conclusion. Preserve original template and approved form revisions. Use fictional demo evidence, never forged production approval or customer records.

## Live demo verification

On 16 November 2026, the built-in browser exercised DB-ISMS-01 using Program Owner, Evidence Respondent and Chief Risk Officer demo accounts. The Program was activated with five approved requirements. Assessment 01a1e50a-490d-759f-9ebf-0f240f194c61 used ISO starter questionnaire v3. PostgreSQL confirmed draft v3, 15 submitted answers, five file bindings and one independent review with one group requiring follow-up. All five fictional files downloaded through the local demo artifact policy. The privileged access file retained its follow-up state.

The Program-linked issue MAT-83FA3B00ED45B793 is in Triage. Its description references the response and review; the association to the review is textual. Overview showed one cycle, zero responses awaiting initial independent review, one open issue and one file requiring review or follow-up. Activity showed creation, submission and review.

Browser checks covered the five Program tabs at 1440, 768 and 390 pixels in light and dark mode, without page-level horizontal overflow. Keyboard checks included opening Assessment and closing the mobile document drawer with Escape. This is a workflow and layout check, not a pixel parity claim. Requirement coverage remains unavailable without a governed requirement-assessment projection.

The migration was tested and applied to the isolated acceptance database before the copied demo database. The PostgreSQL integration test passed, along with the v1 Evidence, Monitoring and HTTP API suites, v2 type checking and the Vite build. The test exercised wrong-unit respondent, stale Program version, unapproved questionnaire version, draft conflicts, self-review and revoked reviewer. A dedicated wrong-tenant assessment creation test remains outstanding.