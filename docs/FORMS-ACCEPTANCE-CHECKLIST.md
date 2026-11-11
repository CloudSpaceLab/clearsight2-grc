# Forms workspace acceptance checklist

Working checklist · 10 November 2026

## Goal and scope

Make the Forms workspace usable with authorized v1 data and workflows, following the approved assessment design. A form definition, an assessment request, a response, an evidence file and a review decision are distinct records. Do not use prototype sample values as real data or present an answer or submission as a compliance decision.

Design references: [assessment workspace preview](design/references/clearsight-2026-10/source/clearsight-designs-01-05/assessment-workspace-preview.html), [assessment design notes](design/references/clearsight-2026-10/source/clearsight-designs-01-05/assessment-workspace-design-notes.md), and [unified design specification](design/references/clearsight-2026-10/source/clearsight-unified-design-system-v1/clearsight-design-system/clearsight-design-system-spec.md). Keep the existing app shell and Home navigation; the unified reference proposes a different global navigation hierarchy.

An unchecked item is not yet accepted, even if some underlying code exists. Check an item only after the behavior and relevant failure cases have been tested; record the evidence or demo in the delivery notes.

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
