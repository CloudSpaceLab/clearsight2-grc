# Approved Program requirements — read-only tranche

The new `GET /api/v1/programs/{id}/requirements?limit=25&cursor=...` serves only approved, currently effective references from the **existing v1 `program_requirements` table**. It is registered only when the signed Program read service is explicitly enabled and its complete governance schema is verified.

## Ownership and correctness

- Authenticates the caller using the same signed actor and `OVERSIGHT_READ` permission as the Program detail/list. No client-supplied tenant, principal, legal-entity or department filters are honored.
- Starts one **read-only repeatable-read transaction**. The exact actor-scoped Program query executes inside that transaction, followed by the existing Program's approved current requirements, using the same database snapshot.
- Returns only requirement ID, code, title, immutable version and effective date, together with Program ID/revision. The query excludes draft, superseded, retired, future and expired rows.
- Pages are bounded to 50 records using keyset `(effective_from, id)`, reauthorizing every page; malformed cursors fail closed. Program revision identifies the Program state read; it is not proof of an immutable requirements population across multiple pages.
- The endpoint **does not** disclose raw requirement statements, controls, evidence artifacts, reviewer identities, internal issues, score percentages or applicability conclusions.
- The same `CheckSchema` gate now checks the approved requirement read query before production activation; catalog-only defaults expose no organizational routes.

## Tests

- HTTP tests: unsigned/wrong-scope identities, invalid Program IDs, forged selectors, invalid results and failure classification.
- PostgreSQL tests: exact department scope, missing/granted visibility, other tenant/legal entity, expired identity, current vs draft/future/expired requirements, bounded cursor pagination.
- Pinned v1 full-schema CI: inserts synthetic approved/draft requirements into the exact migrated `program_requirements` schema, verifies row filtering and scope isolation.

## Remaining delivery gates

- React Requirements tab must use this endpoint without implying compliance status, plus loading/denied/error/empty states.
- Adopt v1's canonical `CurrentRequirementCoverage` and actor-visible Program projection before showing supported/gap/compliance widgets; avoid a second scoring engine.
- Controls and Evidence require their own authorized read projections, data lifecycle/retirement and role verification; a requirement reference is **not** proof of compliance.
- Full production provisioning, trusted SSO edge and dependency auditing are still required.
