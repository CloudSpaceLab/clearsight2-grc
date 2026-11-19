# Program Issues — 19 November 2026

Reference: `docs/design/references/clearsight-2026-10/source/clearsight-program-designs/program-workspace-revision/index.html#issues`, `revision.css`, `revision.js` issue creation/edit/verification flows. Existing Home navigation, shell and theme tokens retained. Archived reference files unchanged.

## Delivered

- [x] Prototype register composition with separate reference, issue title, ownership, numeric priority, due date, status and Open action. Overdue styling excludes closed/cancelled issues and sentinel dates.
- [x] Search by reference/title/description; actual backend lifecycle status filter; ownership, priority, overdue and Clear filters. Visible result counts and honest bounded-list warning.
- [x] Focused record drawer with Details, Actions, Verification and History tabs, keyboard tab movement, readable facts and linked assessment-review drill.
- [x] Issue creation uses the existing v1 command and may link a follow-up assessment review. New records begin as Draft. Owner changes use current backend candidates rather than free-text assignees.
- [x] Details editing preserves scope and due-date semantics, requires a reason and rechecks current version and responsibility before saving.
- [x] Corrective-action creation with authorized responsible colleagues, action status changes and recorded reasons. Readable resolution updates/evidence references use the existing issue-comment history command; new files use Program Documents.
- [x] Independent outcome-check definition includes linked action, baseline, expected outcome, passing criteria, reviewer, observation period and block-closure failure handling.
- [x] Verification records Pass/Fail/Inconclusive, what was checked, evidence references and rationale. Current action-owner independence, implementation and observation-window checks are enforced in the UI model and independently by v1.
- [x] Current closure blockers are visible. Closure is offered only as an authorized lifecycle transition and cannot be selected while the backend closure assessment is incomplete. Closed details retain closure reason and timestamp; reopening remains authority-controlled.
- [x] History displays recorded actor, version, timestamp, event reference and comment content, with bounded earlier-event loading. Known action/reviewer names use backend responsibility labels.
- [x] Exact issue URL survives refresh and opens through a direct record read even when outside the list page. Closing returns focus to the issue row when available.

## Verification

- Frontend build/typecheck passed; bundle-size advisory remains.
- 22 checks passed across issue workflow, existing Program issue reads, Overview adoption and activation. Scope, retired links, foreign entities, stale versions, revoked authority, invalid targets, closure readiness, independent review and observation boundaries are covered.
- Existing v1 continuity and HTTP API tests for Closure, Verification, MatterOperations, MatterCommand and MatterComment passed. No backend implementation was added to v2.
- Browser: created isolated demo `DEMO: Issues workflow — supplier revocation retest`, opened its drawer and recorded Draft → Triage. Filters, unmatched-search empty state, action-entry candidates, keyboard detail tabs, source-review drill and closed action/verification/history views inspected.
- Separate authorized API sessions completed the isolated workflow using Program Owner, Evidence Respondent, Internal Auditor and Chief Risk Officer. An action-owner self-verification attempt was rejected with **403**. Internal Auditor recorded the independent passing result; CRO closed the record. Final status **CLOSED**, version **12**, one implemented action, one outcome check, one passing result and 12 recorded events. These are explicitly demo records and test references, not customer compliance evidence.
- Demonstration issue: `01a1f0f0-a8f1-7ee6-862d-377077c2185c`, Program `01a1e8df-3259-7411-8435-0efdb47cfc95`. The prior supplier-access issue remains separate.
- Light/dark source and app renders checked at 1440, 1280, 1024, 768 and 390 CSS pixels. No document-level horizontal overflow. Evidence: `output/screenshots/issues-implementation-2026-11-19/`, including register pairs and `geometry.json`.

## Explicit differences and limits

- Real lifecycle: Draft, Triage, Assessment, Decision needed, Actions in progress, Response preparation, Verification, Closed, Cancelled. The prototype's simplified Open/In progress/Resolved states are not persisted as invented backend states.
- Priorities remain the backend's 1–5 values; no unsupported Low/Medium/High/Critical mapping is implied.
- List service returns up to 100 authorized issues across Programs before Program filtering. The screen warns when bounded; it cannot claim a complete enterprise total or paginate a nonexistent server cursor.
- List ownership uses the signed-in name, Unassigned, or Assigned owner. The record drawer resolves backend responsibility labels; it does not fabricate colleague names.
- Evidence references are stored record identifiers/text, not uploads or automatic evidence validation. Program Documents remains the file workflow. Outcome failure behaviour defaults to the supported block-closure policy; escalation-policy editing is outside this tab.
- History endpoint supplies event metadata and comment bodies, not every transition's full payload. Readable resolution notes are available through saved updates, while current closure and verification rationales appear in their detail sections.
- Multi-role execution was checked through separate API sessions; UI creation/triage and read/drill/keyboard workflows were checked in the browser. Full screen-reader testing, every failure-response policy and production-load/pagination acceptance are not claimed.
- Prototype is a local simulator. This is an adaptation to existing governed v1 contracts, not a claim of 100% pixel or production acceptance.

## Re-run

```powershell
node --experimental-strip-types --test web/scripts/issue-workflow.nodecheck.mjs web/scripts/overview-adoption.nodecheck.mjs web/scripts/program-issues.nodecheck.mjs web/scripts/program-activation.nodecheck.mjs
npm --prefix web run build
# From C:\Projects\clearsight-grc:
go test ./internal/continuity ./internal/httpapi -run 'Test.*(Closure|Verification|MatterOperations|MatterCommand|MatterComment)' -count=1
```
