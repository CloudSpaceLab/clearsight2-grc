# Forms workspace acceptance checklist

Working checklist · 10 November 2026

## Goal and scope

Make the Forms workspace usable with authorized v1 data and workflows, following the approved assessment design. A form definition, an assessment request, a response, an evidence file and a review decision are distinct records. Do not use prototype sample values as real data or present an answer or submission as a compliance decision.

Design references: [assessment workspace preview](design/references/clearsight-2026-10/source/clearsight-designs-01-05/assessment-workspace-preview.html), [assessment design notes](design/references/clearsight-2026-10/source/clearsight-designs-01-05/assessment-workspace-design-notes.md), and [unified design specification](design/references/clearsight-2026-10/source/clearsight-unified-design-system-v1/clearsight-design-system/clearsight-design-system-spec.md). Keep the existing app shell and Home navigation; the unified reference proposes a different global navigation hierarchy.

An unchecked item is not yet accepted, even if some underlying code exists. Check an item only after the behavior and relevant failure cases have been tested; record the evidence or demo in the delivery notes.

**New Create form direction:** The user selected [create-form-simple](design/references/clearsight-2026-10/source/clearsight-designs-01-05/create-form-simple/index.html). Create form now opens a separate simple editor; the previous `FormAuthoring.tsx` and its CSS/model remain in the project. The simple layout uses the existing app shell, so its global navigation remains the current Home / Frameworks / Programs / Forms hierarchy rather than replacing it with the unified reference's proposed routes. A v1 draft was saved with a Yes/No question and a conditional follow-up; the signed-in auditor did not hold the approval route. Responsive and keyboard checks covered the preview and selected sizes, but full side-by-side comparison and an independently authorized approval demo remain open. Prototype-only sample records, simulated reviewer notes and browser-only approval are not treated as real data or decisions.

**Saved simple drafts:** The editor lists authorized v1 drafts and reopens supported simple forms, preserving question IDs, Yes/No follow-ups and governed metadata. In a live local demonstration, the Chief Risk Officer reopened the demo supplier-access form, saved a changed description, and reopened revision 2 with the question and follow-up intact. Forms with unsupported advanced structure are refused rather than silently simplified. Automated model tests cover round-tripping and refusal of unsupported logic; broader permission, error and stale-revision scenarios remain to be verified. The Create form breadcrumb now uses the parent workspace breadcrumb styling and placement; light, dark and narrow layouts were inspected.

**Simple editor approval demo:** On 11 November the Chief Risk Officer created `DEMO: Approval and permissions verification`, saved revision 1 and sent it for review (revision 2). The submitter saw disabled review actions and the assigned Internal Auditor. The Internal Auditor reopened the pending form and approved and activated revision 3 in the local v1 backend. The form was not distributed. Pending and rejected simple forms can now be selected in the saved-form picker, and decisions are gated by the operations returned by v1. The prototype has no reviewer-decision screen; these actions use the current app's buttons and dialog, and the v1 transition does not support reviewer notes.

**Rejection and conflict checks:** On 11 November, the Chief Risk Officer submitted `DEMO: Rejection and resubmission test`; the Internal Auditor rejected it at revision 3. The owner reopened it, saved a corrected draft at revision 4 and resubmitted it at revision 5. The submitter could not use reviewer actions, and the reviewer could not edit the rejected form. A separate `DEMO: Concurrent draft test` was opened in two tabs; saving the first editor's revision caused the second editor's stale save to be rejected, with unsaved text retained and recovery guidance shown. The reviewer layout was inspected at a narrow viewport in light and dark themes with no document overflow. Automated checks cover the denied and interrupted-connection messages; live network interruption and an independent direct backend denial were not exercised.

**Question deletion:** The simple editor now uses the prototype's trash-can shape and a destructive-action color instead of the blue ×. Keyboard deletion moves focus to the adjacent question, or to Add question after the final removal. Checked in a local unsaved demo; the complete prototype comparison remains open.

**12 November updated create-form-simple inventory:** The new reference adds a section target, editable section titles, question import, question images, drag/keyboard ordering, grid questions, ratings, scales, time, dropdown, preview section navigation and answer validation. The app now includes the section target, editable sections, grouping and section-aware draft serialization/reopening. Import and image controls and the additional question types are shown as unavailable; real v1 support and safe persistence are not connected. Drag ordering, full preview navigation and validation, and prototype screen-by-screen parity are outstanding. Existing Forms navigation is retained, including the previously requested breadcrumb and backend draft picker, which differ from the reference. The local v1 service was unavailable because Docker was not found; only the signed-out editor could be inspected live, so authenticated creation, save/reopen and responsive/theme matrix were not demonstrated on this change. Model tests cover multiple-section serialization and reconstruction; backend integration remains unverified.

**Assessment definition layout:** The selected Forms questionnaire area now uses numbered section entries and compact question metadata guided by `assessment-workspace-preview.html`. Question descriptions, required status and any answer choices come from the authorized form definition; the reference's sample response states are not shown as real answers. In the live local app, the Moneytor form's sections were navigated by keyboard and inspected on desktop and a narrow light/dark viewport. This remains a read-only form definition; response entry requires an authorized Program assessment. Full prototype parity and the complete response workflow remain open.

**Assigned assessment work in progress:** Forms now queries visible Program requests for the selected form and signed-in recipient, and rechecks tenant, entity, recipient, request and form scope before opening the request's question snapshot. The response screen supports a limited set of question types and uses the v1 request submission command. Conditional and unsupported fields block submission. The current v1 draft route requires an invitation bearer session and stores drafts against that session; it does not implement persistence for the signed-in Program respondent. Save draft therefore remains unavailable in this new screen. The local demo checked the assignment empty state; opening, submitting, server-side draft save/reopen, role denial and visual parity have not been demonstrated end to end. Do not mark these checklist items complete.

## 1. Find and inspect forms

- [ ] The Forms page loads only forms the signed-in actor is allowed to see within the current tenant and legal entity; changing identity or scope cannot leave another user's data on screen.
- [ ] A user can find and select a form, see its name, status, version, purpose, sections and questions, and understand whether the list is complete or bounded.
- [ ] Form selection, section counts, question numbering and previous/next navigation work for multi-section, single-section, empty and unsectioned forms.
- [ ] Loading, no access, no results, unavailable service and retry states are distinct and recoverable.
- [ ] The user can open the relevant authorized Program assessment from the form or an assigned-work entry, with the correct Program, request and form revision retained.

**Initial verification:** On 10 November, an existing v1 form was selected and its section counts and forward navigation were demonstrated in the app. Backward navigation and the edge cases above still need explicit acceptance tests.

## 2. Assessment responses and drafts

- [ ] An authorized respondent can open their assigned assessment and see its Program, request, form revision, status and deadline where available.
- [ ] Questions render the actual field types, choices, required indicators, guidance and conditional visibility from the assigned revision.
- [ ] Users can enter, change and clear supported answers; blank, negative and not-applicable answers remain distinct. Required validation identifies the affected question without losing work.
- [ ] Save draft persists through refresh and reopening for the correct actor and assessment. Conflicting or stale revisions produce a clear recovery path without silently overwriting data.
- [ ] Completion and readiness use actual response data, with clear answered and unanswered counts; they do not imply compliance or evidence approval.
- [ ] Prior answers and source-backed suggestions identify their source and are applied only after explicit user confirmation. If a verified source is unavailable, the UI says so.

## 3. Evidence and documents

- [ ] An authorized user can attach permitted evidence to the correct response field, see its name and upload/scan state, and recover from rejected or failed uploads.
- [ ] Authorized users can inspect or download available evidence; inaccessible or unscanned files are not presented as accepted evidence.
- [ ] Evidence status, response submission and review outcome remain separate; changes and access respect the v1 authority model.

## 4. Excel import

- [ ] The workflow identifies supported file types, size limits and any unavailable capability before upload.
- [ ] An authorized user can select a spreadsheet and review the original sheet, cell, raw value, target question and mapping confidence before choosing which mappings to apply.
- [ ] Blank cells remain unanswered; mappings never silently overwrite an answer or automatically imply a passed control.
- [ ] The chosen source and mapping decisions are retained with appropriate provenance. Invalid files, ambiguous mappings and upload/import failures are recoverable.
- [ ] If v1 cannot support a required part of this workflow, identify the backend work and keep that action clearly unavailable until implemented and tested.

## 5. Review and submission

- [ ] Before submission, the review screen shows actual answers, required omissions, evidence state and outstanding follow-up, with links back to the relevant questions.
- [ ] A permitted respondent can submit an eligible response, receive an accurate result/receipt, and see the persisted status after reopening. Double submissions, stale revisions and failures are handled clearly.
- [ ] A reviewer sees only assigned, authorized responses and the actual review route, current revision, decisions and permitted actions. Self-review and unauthorized actions are blocked according to v1 policy.
- [ ] Review decisions and rationale persist and can be reopened; submission, field review, evidence acceptance and compliance conclusions remain distinct.
- [ ] No available reviewer, denied authority, stale data and failed delivery are reported accurately with the next valid action where available.

## 6. Form authoring and lifecycle

The user confirmed form creation is in scope on 11 November. The [create-form prototype](design/references/clearsight-2026-10/source/clearsight-designs-01-05/create-form-revision/index.html) guides the authoring UI. The existing Forms assessment workspace remains available. The v1 backend exposes form-library creation, revision and transition routes, as well as Program-specific form and collection routes; route availability is not proof of complete functionality.

- [ ] Authorized users can create a form, add and edit sections and supported question types, validate it and save a draft. Full prototype parity, advanced settings and failure cases remain to be verified.
- [ ] Revisions and lifecycle transitions follow v1 ownership, review and version rules; existing assessments continue to use their assigned revision.
- [ ] An authorized user can start a Program assessment from an eligible form and verify the resulting assignment and audit record.
- [ ] Complete manual field assessment, response constraints, richer quality checks and review handoff details, or explicitly agree that these are outside the delivery. Forms with unsupported advanced configuration are currently view only.
- [ ] Compare the complete launcher, builder panes, preview, checks and approval dialogs against the approved prototype at desktop, tablet and mobile sizes. Resolve remaining differences before claiming exact parity.

**11 November implementation and demo:** Added Create form alongside the existing workspace; a local demo form `DEMO-FORM-20261111` was created by the GRC Administrator, reopened and revised by the Chief Risk Officer, submitted for approval and approved/activated by the Internal Auditor. It was not distributed. v1's `ACTIVE` transition activates on approval, unlike the prototype's sample approval-for-activation, and its transition endpoint does not accept a handoff note or rationale. The demo verified the administrator could not act on the owner route. Basic model checks and responsive inspection were run; independent failure-path, visual parity, starter-template, and complete accessibility checks remain open.

**11 November prototype correction:** The user requested that the existing Forms screen stay unchanged except for the creation entry. Removed the additional workspace banner and placed Create form in the existing header. Moved presentation and scoring into the inspector's Form settings and restored separate question context, response, assessment and options cards. The prototype's manual assessment and generic bounds still differ from the v1-connected implementation and are not accepted as complete. Prototype browser access to the local file was denied by the browser security policy; source and the previously inspected reference image informed this correction, but a full side-by-side visual comparison and mobile/keyboard regression are still required.

**Further correction:** Added the wave and starter preview with authorized v1 catalog data, selected outline styling, select controls in the preview, ordered duplication and section moves, and an app-styled question removal dialog. Automated model checks and a live browser check covered these portions; manual assessment, response limits, exact screen-by-screen alignment and the full responsive/keyboard matrix remain open.

**Outline correction:** Compared section, question and Form settings selection with the prototype. On a real two-section v1 form, verified desktop section expansion and selected-question highlight, and mobile section selection with mouse and Enter, including dark-mode highlight. Remaining whole-builder prototype differences and the full visual test matrix are still open.

**Breadcrumb correction:** The existing workspace now identifies its location as Forms / Assessment workspace; the Create form screen has a Forms / Create form breadcrumb that returns to the workspace and warns before discarding an unsaved draft. Verified return navigation by keyboard, the draft warning, and a mobile dark-mode view. This navigation addition preserves the existing Home navigation; the unified reference proposes a different global hierarchy.

**12 November simple builder:** The v1 backend and existing database were started. A supplier-access demo draft was saved and reopened with two sections and a conditional follow-up; all eight supported question types were added and saved, with realistic practice answers entered for supported preview controls. Section creation, confirmed deletion of an empty section, and keyboard question reordering were exercised. Tablet and mobile composition and light/dark appearances were inspected; this is not a complete prototype parity or accessibility audit. Import, embedded question images, grid, rating, scale, time and dropdown types remain unavailable, and the practice preview cannot upload evidence. Touch dragging, populated-section deletion, lifecycle transitions, complete failure paths and every responsive state remain to be tested.

**12 November follow-up:** The simple builder can copy selected questions (including supported follow-ups) from an authorized simple draft. The dialog shows the source revision and states that the copy has no persistent source link. A separate demo draft was saved and reopened. Practice preview now has section navigation, local-only file selection, and answer checks; a live check exercised empty required answers, a conditional date and multiple-choice selection. Preview file selection does not upload or scan the file. Mobile and tablet preview were inspected in dark mode and showed no page-level horizontal overflow. The six additional prototype types, question images, provenance tracking, touch dragging, a complete validation matrix, and a complete visual/accessibility comparison remain open.

**12 November answer types:** Implemented multiple-choice and checkbox grids, rating, linear scale, time, dropdown, and bounded PNG/JPEG/WebP question images in the v2 builder and v1 form contract. Added response controls and server-side answer checks. A local six-question draft with an image was saved and reopened; the preview was tested with realistic answers and required-field checks. Mobile and tablet preview had no page overflow. Focused v1 contract and evidence tests passed, as did the v2 form-model checks. A complete assigned-assessment submission using these types has not yet been demonstrated. The normal full Docker build fails on unrelated framework-catalog fixture checksum tests; the local API image was built with the passing focused tests instead. The local worker was rebuilt with the same form contract and restarted; background processing has not been exercised end to end.

**Preview tracking:** The respondent preview follows the selected form title, section or question and highlights it. Desktop checks covered section clicks and keyboard focus; mobile checks covered opening the dialog at the selected question with no page-level horizontal overflow. Practice answers remain separate from the form definition.

## 7. Design, accessibility and responsive behavior

- [ ] Compare every delivered state with the approved reference: header, tabs, sections, question cards, context/evidence panel, import, review, dialogs and empty/error states.
- [ ] Desktop retains a readable sections / questions / context composition; tablet stacks context appropriately; mobile offers a usable section navigator and full-width question controls without page-level horizontal overflow.
- [ ] Light and dark themes have readable contrast and visible selected, disabled, error and focus states.
- [ ] Keyboard users can operate tabs, section navigation, forms and dialogs; focus is visible, contained in dialogs and returned appropriately on close.
- [ ] Labels, status messages and validation errors are accessible to assistive technology; touch targets and reduced-motion behavior are checked.

## 8. Verification and live demo

- [ ] Automated checks cover the relevant successful and failed workflows, scope/role restrictions, version conflicts, validation and important regression cases. Build and type checks pass.
- [ ] Browser checks cover populated and empty states, desktop/mobile, light/dark and keyboard operation using the actual app and v1 backend.
- [ ] A live demo uses existing familiar records or clearly identified realistic test data: select a form, open an assigned Program assessment, answer and save a draft, reopen it, attach evidence, submit, and show the authorized review and resulting status.
- [ ] Demonstrate spreadsheet import only when the actual backend and UI support it; otherwise show and document the precise limitation.
- [ ] Record what was tested, which roles and records were used, any remaining gaps and links to evidence. Do not mark the whole workflow complete until every agreed in-scope item passes.

## Suggested delivery order

1. Finish authoring prototype parity, verify v1 role and lifecycle failure paths, and agree how to handle the approval/activation difference.
2. Finish safe form discovery and connect an assigned Program assessment.
3. Implement and test answers, draft persistence and submission.
4. Connect evidence and authorized review.
5. Deliver Excel import when its provenance and backend contract are verified.
6. Complete visual/accessibility checks and a full end-to-end live demo.
