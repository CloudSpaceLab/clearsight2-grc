# Forms workspace design revision

Prototype only. Derived from ../assessment-workspace-preview.html and its notes, guided by the unified specification and docs/FORMS-ACCEPTANCE-CHECKLIST.md. Archived originals and the app are unchanged.

Open index.html or the local demo at http://127.0.0.1:5177/.

## V1 workflow evidence
Inspected C:/Projects/clearsight-grc/web/src/formsTypes.ts, formsApi.ts, monitoringTypes.ts, monitoringApi.ts and components/FormsWorkspace.tsx. V1 separates library definitions and revisions (forms/templates, expected_version, lifecycle transitions), Program form collections, responses and authority. This design models those distinctions; its local respondent/reviewer rules are illustrative, not a substitute for actual v1 authority or a claim of complete v1 policy parity.

## Design scope
Form library/search/lifecycle filter and inspection; assigned assessments pinned to form revisions; sections, required text/date/choice fields and conditional No follow-up; saved drafts, version conflicts, submission receipt and separate review with rationale. Empty, single-section and unsectioned library examples. Sample service loading/denied/unavailable states. Existing shell/Home navigation retained.

## Limits
Authoring/lifecycle changes and new assignments are deferred pending scope confirmation. File control stores metadata only, linked to the explicitly selected visible question; no bytes, scanning, download or evidence acceptance. Excel parsing/provenance/application are unavailable and shown as such. No production sign-in, organization enforcement, actual review-route discovery, notifications or backend integration. No compliance score. Do not mark the production acceptance checklist complete based on prototype tests.

## Files and tests
index.html / reference.css (extracted original assessment template styles) / forms.css / forms.js / forms-model.js / forms-model.test.cjs.
Run node --test forms-model.test.cjs and node --check forms.js. Four model tests cover conditional omissions, stale/role guards, draft round-trip, submission locking, independent review, evidence rejection and definition edge cases.

## Live verification — 10 November 2026
Demonstrated library inspection, opening REQ-1042 pinned to revision 3, No-triggered follow-up, date/text entry, saving and reopening through refresh, submitted revision 1 and independent reviewer changes-requested with persisted rationale. Tested forward/back section navigation, keyboard tab switching, no-access concealment/retry and unavailable Excel controls. Layout checks at 390/768/1024/1440 found no document overflow. Light/dark visually inspected; full-page screenshot forms-workspace.png. Four model tests and syntax checks passed. Actual uploads/scanning/downloads, spreadsheet extraction, production scope and review-route checks were not exercised because they are not implemented in this prototype. Evidence metadata selection is provided but file chooser interaction was not part of this browser walkthrough. Production acceptance checklist remains unchecked.

## Library and assignment redesign
Reused the assessment reference's wave header, section/working/context anatomy, tabs, typography and panel hierarchy. Library has lifecycle search/register/selected-definition context; assignment discovery has Program/revision/deadline/status rows and combined search/status filters. Prototype controls are collapsed. Laptop hides optional explanation rails; selected definition stacks below the register on tablet; mobile rows become stacked records. All four workflow model tests and syntax checks passed. Live browser checked selected definition, assignment search/no-results/status reset, response navigation, ArrowLeft tab navigation, light/dark, and both discovery views at 390/768/1440 with no document overflow. Full-page proofs: form-library.png, assigned-assessments.png. No production code or archived original was changed.
