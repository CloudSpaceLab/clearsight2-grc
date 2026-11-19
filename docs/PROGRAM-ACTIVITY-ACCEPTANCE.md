# Program Activity implementation progress

Verified on 19 November 2026.

Implemented the first Activity pass using the existing actor-scoped assessment event population.

- Added tenant-scoped actor display names in V1.
- Added search including actor name, event-type selection and UTC date-range filters.
- Added event details and links to the owning assessment.
- Added incremental display of loaded records and exports containing the selected filters, UTC convention and the population-limit flag.
- Invalid date ranges display an error and prevent export.

Still outstanding for the full Activity scope.

- A paginated server-side Program event feed covering Program configuration, schedule decisions and dispatch, document events, issue actions, verification and closure.
- Exact submission/document/schedule/issue links for the additional event classes.
- Automated Activity-specific UI coverage and live inbuilt-browser workflow and responsive checks.

The existing 300-assessment-event bound remains visible. Show more loaded events does not claim server pagination. The frontend build and affected V1 backend suites passed. The actual demo workspace returned named assessment actors. The broader Activity implementation and its live demo are pending.


## Inbuilt browser walkthrough

On 19 November the Chief Risk Officer filtered Activity by Evidence Respondent, Response resubmitted and 1–30 November 2026. The event drawer showed the recorded actor, event identifier and UTC timestamp. The downloaded JSON contained the same single event, actor and selected filters. Open assessment navigated to DEMO · Assessment correction and resubmission. Documents and Activity passed the six desktop/tablet/mobile and light/dark overflow checks. Captures are stored under output/screenshots/documents-activity-2026-11-19/.

This accepts the initial assessment-event Activity pass only. Broader Program, issue, schedule and document events, server pagination and their exact record links remain outstanding.

### Compact Activity filters — 2026-11-19

- Search, event type and UTC date bounds occupy one desktop row; controls retain a 44px minimum height and visible keyboard focus.
- Verified in the inbuilt browser at 1159px, 900px and 390px in light and dark appearance, without horizontal overflow. Tablet uses two columns and narrow mobile stacks fields.
- Combined actor search, Response resubmitted event type and November date bounds returned the expected single event; filters were cleared after demonstration.
- Frontend production build and git diff whitespace check passed. Existing role permissions and event scope are unchanged.
- Demo screenshot: `output/screenshots/documents-activity-2026-11-19/activity-compact-filters-dark.jpg`.

## Complete Activity implementation — 19 November 2026

This section supersedes the outstanding items recorded in the initial pass above.

- Added the V1 GET /api/v1/programs/{id}/activity contract. Reads include Program configuration/lifecycle and review checkpoints, questionnaire links, assessment creation/submission/review, submitted document bindings and file-specific decisions, schedule proposal/approval/stop/dispatch, and linked issue/action/verification/closure events.
- Every query applies tenant, legal entity and current record permissions before search and keyset pagination. Restricted issue policy is evaluated in SQL; respondents receive their assigned assessment/document population. Program configuration and schedule history remain owner/authorizer scoped. Draft-only uploads are visible only to the uploader.
- Added server-side actor/record search, record category, exact event type and UTC date bounds. Activity period and filters persist in the URL. Invalid ranges stop the query and export. New search cancels stale loads. Refresh starts a new snapshot; older pages retain a fixed upper timestamp and deterministic event-ID tie-breaking.
- Desktop keeps five controls in one row. Tablet/mobile use a keyboard-operable Filter history disclosure. Existing shell and Home navigation are preserved.
- Event details show stored actor, time, references and selected recorded details, including verification outcome and closure rationale. Raw event payloads, answer bodies and storage keys are not exposed.
- Links open the exact issue, selected schedule or response revision. Document events inspect the exact submitted file, with protected preview/download and review notes. Standalone document requests retain a Documents destination.
- Export traverses all matching pages. It produces a complete JSON only after every page succeeds; stale/failed/oversized exports do not silently download partial history. The export safety bound is 20,000 events; narrow the filters above that count.

### Verification and live demo

- All 100 frontend node checks passed; production build passed with the existing bundle-size advisory.
- Focused evidence/httpapi/monitoring backend suites passed. Real PostgreSQL Activity fixture passed with 408 events, equal timestamps, all five categories, exact event filters, restricted issue and cross-tenant/legal-entity checks; actor/query-bound cursors and anonymous rejection are tested.
- Inbuilt browser live pagination reached 25, 50, 75 and 83 records. The complete export contained the same 83 records and all five categories. Actor + resubmission + November date filters produced one event and a matching complete export.
- Demonstrated the closed issue and independent verification history, exact blocked schedule, Program settings history, original response revision 1 and corrected revision 2 document inspection. Corrected PDF preview/download passed. The historical original demo file has invalid PDF bytes; its preview showed an explicit error and preserved download access.
- Respondent saw assigned response/file history but zero Program configuration/schedule events. Auditor saw issue/verification history but zero unassigned assessment events. Returned the demo to Program Owner.
- Checked desktop 1440, tablet 768 and mobile 390 in both themes without horizontal page overflow; keyboard filter toggle, focus return and Escape were checked. Evidence is local under output/screenshots/activity-complete-2026-11-19/.

Operational limit: this is history reconstructed from retained recorded events and immutable submissions. It cannot invent events that were never recorded or already removed by an independent retention policy. This work adds no automatic decisions or permission grants.

Final commit checks: the full V1 postgres-tag Go suite passed after completing the required durable schema ownership entries. All 100 V2 node checks and the V2 production build passed. Generated screenshots, local executables, credentials and demo databases remain outside Git.
