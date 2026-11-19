# Create form template — design revision

Open http://127.0.0.1:5178/index.html while the narrowly scoped local static server is running. This is a separate authoring prototype; no app implementation or live API writes are included. Original assessment/unified reference files remain unchanged.

## Sources inspected
- Local v1 web/src/components/forms/creation/NewFormLauncher.tsx.
- FormBuilder.tsx; FormCanvas, FormInspector, FormOutline, FormBuilderToolbar, FormApprovalSheet; FormFieldPropertyEditor; formQuality.ts and monitoringTypes.ts.
- Local v1 form-authoring.css and its workspace/responsive/approval imports.
- Live https://clearsight.cloudspacetechs.com/#forms: creation chooser, blank builder and inspector inspected without saving or submitting.
- ../assessment-workspace-preview.html and design notes; unified interface specification; docs/FORMS-ACCEPTANCE-CHECKLIST.md.

## Walkthrough
Choose Blank form or the sample starter. Set code/name/purpose, section title/guidance and questions. Select question Settings to configure type, required response, section, manual assessment and sample bounds/choices. Add, duplicate, reorder and remove sections/questions. Removing a section retains its questions in the first remaining section, following the inspected v1 behavior. Question removal asks for confirmation; at least one question is retained.

Preview the respondent controls, inspect Review checks, save a draft and reopen it after refresh. A complete editable saved draft can be sent to the sample independent review route. The revision is locked while pending. Switch sample role in the disclosure, return to saved templates and reopen the pending template to request changes or approve for activation. The latter does not activate or distribute it. Production authority is not modeled by this sample role switch.

## Limits
This demonstrates the main end-to-end authoring lifecycle, not full v1 feature parity. Browser storage is resettable, not a production database/audit trail. AI/import, automatic scoring, conditional-rule authoring, record targets, sensitivity/cache policies, reusable sections and production activation/distribution are explicitly unavailable. Response presentation preferences are retained; the preview currently renders all sections together. File/photo/signature/vendor document controls explain capture is unavailable. Bounds are a simplified generic min/max contract and preview only enforces text maximum length. No compliance score is calculated. See FIELD-ACTION-MAP.md for purpose, usage and implementation status.

## Validation
node --test builder-model.test.cjs; node --check builder.js.
Four model tests cover validation, stale revisions, role separation, saved-state round trip, locked submission, independent review and approval-vs-activation. Browser demonstrated blank validation, authoring, save/reopen, preview, approval handoff and independent changes requested; starter and single-choice save; mobile pane navigation. Responsive widths 390/768/1024/1440 had no page horizontal overflow; light/dark visually inspected. Advanced v1 constraints, real identity/scope, backend delivery, AI/import and activation were not exercised. Production Forms acceptance checklist remains unchecked.
