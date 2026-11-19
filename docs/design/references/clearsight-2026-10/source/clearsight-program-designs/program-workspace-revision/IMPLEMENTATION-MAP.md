# Program workspace: prototype-to-app implementation map

Inspected 10 November 2026. This is a code-based implementation map, not an implementation change or proof that a configured database/session is running. The prototype remains the design review artifact. Preserve its reviewed side-by-side Assessment and Documents/Activity layout, responsive stacking, four tabs, Home navigation and full-page PNG convention.

## Existing app entry points

- `web/src/App.tsx`: current query routing. Program directory: `?screen=programs`; selected Program: `?screen=programs&program=<uuid>`. Standalone Forms/Assessment: `?screen=assessment`. The standalone assessment route currently carries no assessment ID or Program context.
- `web/src/shared/DesignShell.tsx`: reuse Home navigation, shared shell, theme and skip link. Do not introduce the prototype's sample actor selector into production.
- `web/src/features/programs/ProgramWorkspace.tsx`: extend this existing workspace, rather than add a parallel Program page. Current tabs are Overview, Requirements, Assessments, Evidence, Issues, Activity.
- `web/src/shared/useWorkspaceTabs.ts`: reuse keyboard tab behavior. `Icons.tsx`, `web/src/features/programs/program.css`, `web/src/framework-parity.css`, `web/src/theme.css`: existing presentation owners. Static HTML guides composition; do not transplant its inline CSS or simulator model into React.
- `web/src/features/assessments/AssessmentWorkspace.tsx`: existing questions/import/review composition, currently an unconnected placeholder with disabled writes. Extract/reuse suitable sections; it is not a working response editor yet.

## Screen mapping

| Prototype | Existing app support | Implementation needed |
| --- | --- | --- |
| Header: name, code, lifecycle, organization context | `programRecord.ts` / `useProgramRecord`; metadata API | Reuse metadata and source revision. Current payload has owning function/jurisdiction, not the prototype's editable owner and next-review fields. Do not substitute owning function for a verified accountable person. |
| Four tabs | `ProgramWorkspace.tsx` + `useWorkspaceTabs` | Change to Overview / Issues / Assessment / Doc & Activity. Keep approved requirements, linked controls and collection contracts reachable through a focused Overview drill or section; do not delete their functionality. |
| Overview: requirement coverage | `programOverview.ts` / `useProgramOverview` | Reuse assessed/eligible/unknown/excluded, quality and as-of. Backend does not provide the prototype's control-area distribution. No fabricated bars or totals. |
| Overview: four local workflow counters | No matching four-count contract | Prototype counts assessment cycles, responses awaiting review, open issues and documents awaiting review. Existing API instead returns assessment coverage with three unavailable slots. Agree the production metric contract before displaying these counts; do not silently relabel coverage as a cycle count. |
| Overview: requirements/control drill | `approvedRequirements.ts`, `ProgramInventoryPanel.tsx`, `inventoryClient.ts`, `useProgramInventory.ts` | Recompose existing paginated lists behind the Overview drill. Requirements list supplies code/title/version/effective date, not per-requirement supported/gap verdicts. |
| Overview: recent assessments / period | Placeholder table; period disabled | Add authorized assessment collection read with date semantics and bounded pagination. Current overview endpoint accepts no query parameters. Period must not alter as-of posture. |
| Overview: Needs attention | `useProgramIssues` supplies visible open issues | Reuse real issue rows. Response/document queues need separate reads. A page length is not a global count. |
| Issues: list | `programIssues.ts` / `useProgramIssues`, existing Program Issues panel | Reuse identity, paging, revision guard and unavailable states; redesign rows to the reviewed prototype. Current payload lacks owner, due date, resolution, evidence and assessment link. |
| Issues: search, status and closed records | Not supported by current issue read contract | Extend server filtering/paging and client validation together. Current repository rejects search/status parameters and explicitly excludes CLOSED/CANCELLED. Filtering a single loaded page cannot represent all issues. |
| Issues: create/edit/resolve/verify | No registered v2 command endpoints | Add governed commands, detail reads, version checks, real permissions and independent closure verification. Prototype priority labels need an explicit mapping to backend numeric priority 1–5; do not guess it. |
| Assessment: cycle list and selected record | Standalone `AssessmentWorkspace` structure only | Add Program-linked assessment list/detail and selected-ID state. Retain desktop list/detail columns, stack on mobile. Provide a shared record selection model if opening the standalone Forms route. |
| Assessment: create/type selection | No registered v2 API | Read authorized form templates/types and versions; create a Program-linked instance. Prototype's three hardcoded types are demo fixtures, not a production catalogue. |
| Assessment: answers, draft, submit, history | No registered v2 API | Load questionnaire and field IDs, typed answers, required rules and immutable response revisions. Implement save/submit commands and server-side validation/concurrency; expose history reads. |
| Assessment: per-field review | No registered v2 API; relevant v1 contracts exist | Reuse/adapt governed v1 service behavior after integration review. Return server-provided rubric, authority and permitted actions. Bind decisions to exact response revision and field checksum. |
| Assessment: recurrence/configuration | No registered v2 schedule read/write API | Add effective and proposed configurations, versioned approval/rejection, next-cycle/trigger semantics and execution status. UI approval alone is not a running scheduler. |
| Doc & Activity: actual files | Existing evidence-contract inventory is metadata only | Keep collection contracts accessible, but add actual submission metadata/content/download/review services. Do not render an evidence contract as an uploaded document. Preserve desktop side-by-side panels. |
| Doc & Activity: history/export | No registered v2 Program timeline/export API | Add authorized bounded activity reads with filters, cursors, actor/timestamps, record/revision links and export. An export must cover its stated scope, not silently only a loaded page. |
| Program settings | Metadata read only | Add authorized detail/command contracts for editable fields and next-review semantics. Keep unavailable fields honest until those contracts exist. |
| Copilot, global scopes/search/notifications | Program assistance and shell controls lack production services | Do not carry over local suggestions or sample scope actions as live functionality. Leave clear unavailable reasons or implement separately against authorized services. |

## Confirmed v2 API inventory

Registered in `cmd/server/program_bootstrap.go`, all reads:

| Endpoint | Frontend owner | Backend owner |
| --- | --- | --- |
| GET `/api/v1/programs` | `programDirectory.ts` | `internal/programread/list.go`, `list_postgres.go` |
| GET `/api/v1/programs/{id}` | `programRecord.ts` | `handler.go`, `sql_repository.go` |
| GET `/api/v1/programs/{id}/overview` | `programOverview.ts` | `overview_handler.go`, `overview_postgres.go` |
| GET `/api/v1/programs/{id}/requirements` | `approvedRequirements.ts` | `requirements_handler.go`, `requirements_postgres.go` |
| GET `/api/v1/programs/{id}/issues` | `programIssues.ts` | `issues_handler.go`, `issues_postgres.go`, `visible_matters.go` |
| GET `/api/v1/programs/{id}/controls` | inventory hooks/client | `inventory_handler.go`, `inventory_postgres.go` |
| GET `/api/v1/programs/{id}/evidence-contracts` | inventory hooks/client | `inventory_handler.go`, `inventory_postgres.go` |

`overview_handler.go` requires supported/open_gaps/evidence_to_review to remain null. Missing data must remain unavailable, not zero. Program source revision checks already reject changed responses; retain that behavior in new panels.

Program reads are opt-in through `CLEARSIGHT_V2_PROGRAM_READ_ENABLED`, `CLEARSIGHT_V2_DATABASE_URL` and `CLEARSIGHT_V2_IDENTITY_SIGNING_SECRET`. Bootstrap verifies PostgreSQL connectivity/schema and signed actor context. Merely enabling buttons or entering organization data in the browser does not establish authorization. No secrets were read for this mapping.

The current v2 backend contains `catalog`, `frameworkcatalog`, `identity`, `programread` and `continuity`. Existing continuity calculation/schema models do not imply that assessment, issue or document command services are exposed. Database/read infrastructure exists; this is not a frontend-only project, but the new workflows require both frontend and backend work.

## v1 reuse candidates, not v2 availability

Inspected the separate local checkout `C:/Projects/clearsight-grc`:

- `internal/formcontract/assessment.go`: field assessment modes, role and rubric configuration. Outcomes and points are template-defined; the demo's fixed three labels are not a universal contract.
- `internal/evidence/response_assessment.go`: response assessment fields, answer, may-review, version/current state, reviewer/authority, response revision and field checksum. Reuse these invariants instead of inventing browser authority.
- `internal/httpapi/form_distribution_routes.go`: response assessment read and governed material command at `/api/v1/forms/responses/{revision_id}/assessment`. This route belongs to v1; it is not registered in the inspected v2 server.

Choose an explicit v1 service adapter or deliberate service migration before connecting the Assessment UI. Do not copy v1 internal packages or claim parity solely because the URL shape is known. Further endpoint-by-endpoint review is required for draft creation/submission, scheduling, issue commands and file operations.

## Proposed component boundaries (not files created)

Keep `ProgramWorkspace` as coordinator for selected Program/revision/tab. Extract `ProgramOverviewPanel`, `ProgramIssuesPanel`, `ProgramAssessmentsPanel` and `ProgramDocumentsActivityPanel` inside the existing Program feature. Assessment subviews can be shared with the standalone `AssessmentWorkspace` after their real contracts exist. Use focused record forms/dialogs with Escape, focus return and inline validation. Add read hooks and command clients only alongside agreed server contracts; keep API payload validation separate from visual composition.

Preserve current query routes and Home sidebar. A Program tab query and selected assessment/issue/document IDs can be added to the existing route model for reload/back-link support; these parameters are proposals, not currently supported routes. The prototype hash URLs are not app routes.

## Recommended implementation sequence

1. **Frontend structure:** four tabs, reviewed responsive layout, shared theme and keyboard semantics; relocate existing requirement/control/contract reads without losing access. Keep unsupported actions visibly unavailable.
2. **Existing-data integration:** metadata, coverage and visible open issues. Validate permission, empty, partial, changed and unavailable states. Preserve existing data meanings.
3. **Assessment vertical slice (frontend + backend):** agree v1 integration, then list/select, real templates, draft, submit, immutable history and independent field review. Preserve Program context across navigation.
4. **Issues vertical slice (frontend + backend):** complete list/detail contract, closed/filter support and governed create/resolve/verify commands. Refresh after commits and reconcile concurrent edits.
5. **Documents + activity (frontend + backend):** real file service, collection-contract linkage, evidence review, audit timeline and export.
6. **Scheduling/settings:** reviewed effective/proposed policy plus execution integration; complete summary counts only from authorized aggregate contracts. Copilot/global services are separate scope.

Each functional slice must include its own persistence/schema changes where needed, server authorization, idempotency/concurrency, audit events, client state handling and tests. The simulator's localStorage records and sample actors never become production seeds or sessions.

## Acceptance checks for implementation

- Preserve existing Program API handler/repository tests, including identity isolation, bounded cursors and revision mismatches.
- Add meaningful tests for changed filter contracts, incomplete response submission, immutable revisions, self-review denial, conflicting writes, separate closure verification, evidence access and proposed-versus-effective configuration.
- Test frontend loading/401/403/404/changed/partial/unavailable states and exact record links. Read authorization does not imply write authorization.
- Build/typecheck through `web/package.json`; add appropriate UI workflow coverage (no frontend test script is currently declared there).
- Live demo with clearly labelled non-production records; keyboard focus/return, light/dark and responsive composition. Save full-page PNGs for each tab. Never show reference figures as customer data.

No application files or prototype behavior were changed for this mapping. Existing uncommitted app work was left intact. No runtime or database connection was tested; findings above are verified from source definitions and route registration.

## Implementation progress — four-tab navigation
The main app now uses Overview / Issues / Assessment / Doc & Activity in ProgramWorkspace.tsx. Requirements and linked controls remain in an expandable Overview section; evidence contracts remain under Documents in Doc & Activity. Existing read clients, authorization and revision guards remain intact. Assessment writes, actual documents and activity feeds remain explicitly unavailable. This supersedes the earlier statement that app tabs are unchanged; other backend gaps in this map remain applicable.

Validation: `npm run build` passed, including TypeScript. Built-in browser verified the four labels, End-key navigation to Doc & Activity, and all tabs in light/dark at 390 CSS px with no horizontal document overflow. No connected Program database/session was available, so authorized populated requirement/inventory paths were preserved in code but were not live-tested. Full-page main-app screenshot: repository `.local/main-app-program-tabs.png`.

## Documents and Activity separation — 10 November 2026
Five top-level tabs: Overview, Issues, Assessment, Documents, Activity. Documents has name/assessment search, review-state filter, record/version/submission metadata and existing independent review workflow. Activity has actor/record/event search, event-kind filter, UTC timestamps, event references and filtered JSON export. Legacy #doc-activity bookmarks open Documents; document drills now target Documents, history shortcut targets Activity. Existing assessment lifecycle and source prototype remain unchanged. This is a browser-only prototype: resettable local history is not a production audit trail; document submission/review does not establish compliance. No retention or classification policy is fabricated. App implementation is unchanged.

## UI comparison audit — 10 November 2026

Backend work was stopped at the user's request. `web/.env.local` now selects the main v2 workspace (`VITE_PROGRAM_BACKEND=v2`), leaving the unfinished v1 adapter code and existing demo database records intact. No further backend commands or database writes were performed during this UI audit.

The current prototype source has FIVE tabs: Overview, Issues, Assessment, Documents, Activity. This supersedes older four-tab descriptions in this documentation. The main Program workspace now matches that navigation. Documents and Activity are independent registers with matching headings, actions and inset search/status/event filters. Assessment retains the reviewed list/detail composition and inner keyboard tabs. Issues uses record-card presentation for available records; New issue is in the section header. Directory filters, typography, header controls and mobile containment were aligned. Existing Home navigation is preserved; runtime controls without services remain unavailable rather than running the prototype's local simulation.

Verification: direct built-in browser comparison against the current prototype; 50 main-app checks (five tabs × light/dark × 390/768/1024/1280/1440 CSS px) all had zero horizontal document overflow after fixing a subpixel shell overflow. Directory checked at 390/768/1440 with no workspace tabs before selection. Home/End and Assessment detail keyboard navigation passed. Directory search/clear and return navigation were exercised. TypeScript, Vite production build, Program structure guard and 16 existing API client tests passed.

Full-page evidence is stored in repository `.local/program-ui-audit/`: desktop/mobile light/dark PNGs for each tab, directory-full.png and responsive-results.json.

Parity limits: this is not a 100% pixel or operational parity claim. Prototype sample records, account selector, counts, baseline coverage charts, submitted answers and local forms are not customer data and are not copied into the app. The main app currently shows unavailable data and disabled unsupported commands; their occupied height and enabled appearance differ from populated reference states. Record forms/dialogs and populated lists still require comparison after the backend integration resumes. Existing source-backed requirement/control/evidence-contract reads remain accessible. Archived originals and the reviewed prototype were not edited by this audit.

## Resumed v1 integration — 10 November 2026

The reviewed `ProgramWorkspace` remains the single main Program UI. The abandoned alternate `V1ProgramWorkspace` was removed. `V1Session` supplies a backend-created local demo cookie; the shared shell displays the authenticated account. `programTransport.ts` adapts v1 metadata, directory, approved requirement and linked-issue reads to the existing v2 client contracts. Its tenant comes from `/api/v1/context`; it does not manufacture signed headers or actor claims. Native v2 behavior remains the default when the v1 flag is absent. `web/.env.local` currently sets `VITE_PROGRAM_BACKEND=v1`; `web/.env.example` documents that opt-in. Existing local API, worker and PostgreSQL containers are running; no migrations or v1 source changes were made.

`ConnectedProgramWorkflows` and `V1Responses` connect the existing five-tab workspace to approved form collections, assigned-respondent submissions, stored reviewer read-back, linked issue creation, server-authorized issue transitions, supporting-file upload and submission. Issue actions use `/matters/{id}/operations`, returned allowed targets and optimistic versions. Unsupported conditional/typed form fields cannot be submitted through this limited editor. Writes are not automatically retried. `V1FieldReview` exposes native distribution-backed revisions and configured rubric decisions when the backend returns them; that path was not exercised because this Program has no governed response revisions.

### Verified live records

All added records are explicitly DEMO integration fixtures in the existing local development database. They are not prototype localStorage records or customer defaults.

- November assessment request `01a1c49c-fd35-73a0-8854-fd539cd47738`: SUBMITTED, receipt `01a1c49d-d156-7bb2-a553-63c45d85b90f`. Program Owner created it, Evidence Respondent submitted, Internal Auditor retrieved the exact stored answers.
- Second collection created through the preserved main UI: request suffix `e78d069f`, October sample period. Four missing required answers blocked the form; completed answers were submitted, receipt `01a1c4b8-8ac6-7d8f-a585-6b8b8ab0ecfb`. Auditor read-back confirmed all three Yes responses and DEMO text.
- Issue `MAT-80F0245EA3D23837`: created with exact Program link, moved from DRAFT v2 to TRIAGE v3 through a backend-authorized transition, retained after reload. A stale v2 command returned 409; status/version remained unchanged.
- Document request `01a1c49f-c8b9-71b4-8992-cc1093a8a89a`: SUBMITTED, receipt `01a1c4af-be87-7ffa-9ca4-7ef89140163b`. The 279-byte non-sensitive file was stored with SHA-256 `6b5007806488a098b5c6bc7129cea57b47dbe73f800bdffc2b712e4b06fb92a9`. Backend scan state was STORED_UNSCANNED, not a clean/approved document. No scan checks were disabled.
- PostgreSQL SELECT read-back confirmed the assessment submission, document submission and issue state. Program Owner retrieval of reviewer-only answers returned 404; the assigned auditor succeeded.

### Remaining limitations — do not claim full workflow completion

The deployed v1 legacy internal-collection path has no server draft-save endpoint. Its capture submissions do not become distribution-backed response revisions, so those legacy files are excluded from the governed document content/review index. Upload/submission is verified; download and independent document-review completion for those files are NOT verified or connected. The UI only offers content downloads for actual authorized `/forms/documents` occurrences; it does not bypass the index or quarantine checks. Completing this area needs the native canonical response/distribution integration (or a reviewed v1 service extension), not a fabricated browser approval.

Collection policy reads and versioned policy proposal/approval are connected to the native v1 lifecycle (details below). Activity currently shows stored request snapshots, explicitly labelled as incomplete rather than a full audit-event feed. Unsupported v1 inventory/aggregate meanings fail unavailable instead of being silently mapped to v2 compliance measures. Existing approved source references remain accessible. Draft autosave for legacy internal requests and standalone document approval remain backend-integration gaps.

### Validation and demo evidence

TypeScript and Vite production build passed. All 23 automated Program/read-adapter tests passed, including identity denial, exact Program links, stale revisions and no invented compliance measures. The seven new adapter tests are included in CI. Live stale-write and reviewer-access checks passed. Thirty real-data tab/theme/width checks (five tabs, light/dark, 390/768/1440px) had no document overflow. Full-page screenshots are in `.local/backend-proof/`, including `assessment-readback-full.png`, plus each tab. The server remains available at http://127.0.0.1:5173/?screen=programs ; choose a published local v1 demo account to inspect its actual permitted records.

## Continuation — collection policy and prototype filters — 10 November 2026

The Configuration detail now lists form-based Monitoring Check revisions and exposes v1 `collection_policy` updates only to the check's assigned owner. The form sends the current `expected_version` to `POST /api/v1/monitoring-checks/{id}/collection-policy`; the returned draft remains ineffective. Submit and approve controls are shown only when `/api/v1/programs/{id}/operations` returns the exact transition operation with `can_act` and the corresponding `allowed_targets`. Approval uses a separate account; v1 enforces maker-checker separation. The UI describes validity months, renewal window and reminder count as response-renewal policy, not a monthly/quarterly calendar schedule.

The Assessment register has search and status filters; Documents has search and review-state filters using only states returned by the v1 index. Download controls require `AVAILABLE` or an explicit v1 demo-unscanned allowance; the protected content route still performs exact authorization, digest, size and availability checks. Indexed documents with response revisions can open v1's governed response-field assessment. This is not a standalone artifact review, and the UI labels that distinction.

### Live policy lifecycle demo

Using the existing local PostgreSQL demo database, the Program Owner revised the explicitly demo-named form check `Monthly cloud encryption Form competing approval demo 2` for Program `CBN-CLOUD-ENC-01` with validity 12 months, renewal window 30 days and 3 reminders. Backend readback confirmed owner save -> DRAFT v4 -> PENDING_APPROVAL v5; a separate Internal Auditor approved it to ACTIVE/current v6. The active record was read back with that policy. This verified versioned persistence, separate reviewer authority and maker-checker flow against the running API. No v1 source code, migrations, scan settings or production records were changed.

### Prototype parity and remaining limits

The app and prototype both use Overview, Issues, Assessment, Documents and Activity, preserve Home navigation, and retain the reviewed desktop Assessment list/detail composition and responsive stacking. The app now exposes matching Assessment search/status and Documents search/review-state controls where the backend provides corresponding data. Existing prototype HTML/CSS/JS/PNG files remain unchanged.

This does not establish 100% pixel or operational parity. The prototype's monthly/quarterly/yearly/event cadence, local draft persistence, separate document decision/note and full audit activity are not supported by the current Program v1 contracts. The implemented policy configures response validity/renewal/reminders and must not be presented as arbitrary calendar recurrence. Legacy internal responses remain in memory until submission because the server draft API accepts a separate bearer capability; the authenticated cookie Program UI cannot safely manufacture or reuse that token. Legacy uploaded files are not indexed for download/review. Canonical distribution-backed records can use protected downloads and field review, but no eligible Program sample revision was present for a live field-review test.

The main app route returned HTTP 200 at `http://127.0.0.1:5173/?screen=programs`; the preserved prototype route returned HTTP 200 at `http://127.0.0.1:4178/docs/design/references/clearsight-2026-10/source/clearsight-program-designs/program-workspace-revision/`. TypeScript, production build, all 23 Program nodechecks, all 11 prototype model tests and prototype JavaScript syntax validation passed. Local browser use was disabled by current Work settings, so this continuation produced no fresh browser screenshots or live visual, accessibility and responsive pass.
