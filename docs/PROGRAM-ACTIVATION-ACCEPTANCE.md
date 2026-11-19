# Program review and activation

Implemented in v2 against the existing v1 Program lifecycle contract. No backend code, API contract, database migration or framework wizard implementation was added in v2.

## Behavior

- Program records expose **Review Program** with stored scope, owner, approval authority, dates and approved requirements.
- A visible readiness panel explains missing responsibilities, approved requirements, expired Program periods and unavailable authority.
- Review is readable by users with Program access; activation is enabled only when the v1 `program.transition` operation permits `ACTIVE` and prerequisites are present.
- Activation uses `POST /api/v1/programs/{id}/transition` with the reviewed version, target `ACTIVE` and a required rationale. Actor identity comes from the authenticated backend session.
- Immediately before submission, the client rechecks the Program and current operations. A version change or lost authority blocks submission; failures require a fresh review rather than an automatic retry.
- A verified active result refreshes the Program header and review panel. Activation is separate from framework adoption and compliance conclusions.
- The existing New Program dialog now states that creation saves a draft; assigning an approval authority does not send an approval request. No new pending-approval queue is implied.

## Existing backend safeguards retained

v1 `internal/continuity/service.go` requires an owner, approval authority, positive expected version, actor, activation rationale, an unexpired period and at least one approved requirement. v1 `internal/httpapi/command_lifecycle.go` checks the stored approval authority using current authority resolution. The frontend uses the `RECORD` responsibility labels with `ACCOUNTABLE_OWNER` and `AUTHORIZER` from the existing operations response.

## Verification — 13 November 2026

- [x] Ten frontend regression checks pass: identity/version consistency, requirement prerequisite, missing assignments, expired periods, authority outages/denial, permitted target, changed version/authority during review, rationale, command identity handling, repeated activation and responsibility labels.
- [x] Frontend TypeScript and production build pass.
- [x] Existing v1 continuity and HTTP API tests pass, including the PostgreSQL-tagged build.
- [x] Existing copied database was located by the user's exact Program ID; no demo records were replaced or seeded.
- [x] Live CRO review displays the saved Program and its real zero-approved-requirement blocker. Entering a rationale does not bypass the disabled activation action.
- [x] Scope and responsibility labels were checked against the live v1 response.
- [x] Escape closes the review and returns focus to its trigger. The review cannot be dismissed through its close control or Escape while an activation request is in progress.
- [x] Actual browser widths 1280, 768 and 390 checked in light/dark. Page width stayed within viewport; dialog content did not overflow horizontally. Geometry and full-page captures are under `output/screenshots/program-activation/`.
- [x] Completed the user-paced live creation of sample requirement `FID-ACCESS-001` by Program Owner, submission for review and independent approval by CRO. The Program Owner's Approve action was disabled.
- [x] Submitted the CRO's activation through the app and verified the durable result and refreshed view: Program `FID-ISMS-001` is `ACTIVE`, version 5; requirement `FID-ACCESS-001` is `APPROVED`, version 2. Reload retains Active status.

Live demo completion: 13 November 2026. Review rationales explicitly identify the exercise as a local demo. This is a demonstrated activation of the user's Program in the copied development database, not production approval or evidence of ISO compliance. Screenshots `live-step-2` through `live-step-7` retain the creation, review and activation sequence.

The live target is `Digital Banking Information Security`, `FID-ISMS-001`, Program ID `01a1d5b5-565e-7371-bc4c-d1fa88386773`. Its existing database is `clearsight_framework_test_20261112` in the preserved local ClearSight PostgreSQL container. The runtime was restored in PostgreSQL mode with command authorization enforced; no database data was reset.
