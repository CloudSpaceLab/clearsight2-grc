# Program Control and Evidence contract inventory

The opt-in signed Program API exposes two **reference-only** views:

- `GET /api/v1/programs/{id}/controls?limit=25&cursor=...` — current control implementations linked to an approved, effective requirement in the same Program.
- `GET /api/v1/programs/{id}/evidence-contracts?limit=25&cursor=...` — active evidence contract references tied directly to an approved/effective requirement, or to an active control linked to such a requirement.

The canonical source remains the pinned v1 `program_requirements`, `requirement_control_links`, `control_implementations`, and `evidence_contracts` tables. These API reads do not replace `CurrentRequirementCoverage`, v1 evidence assessments or actor-visible Program state.

## Authorization and integrity

- Both endpoints reuse the signed actor with `OVERSIGHT_READ`, exact department-scope rules and tenant/legal-entity checks.
- The Program authorization lookup and its related records are read under **one read-only repeatable-read PostgreSQL transaction**. The caller cannot bypass Program visibility by requesting a child record's identifier.
- Query kinds are fixed server constants. User-controlled tenant IDs, legal entities, principals, departments, page sizes above 50, and malformed cursors are rejected.
- Keyset pagination uses source `updated_at` + UUID with a 50-record maximum; no unrestricted offsets or counts.
- Return only Program ID, revision, and inventory identifiers, names, codes (where applicable), lifecycle statuses, source versions and updated dates.
- **Never return** control owner, detailed implementation description, evidence claim, source population, artifacts, assessor identity, assessment conclusion, review record or raw evidence.
- Planned/implemented is a recorded implementation lifecycle value; **not** a tested control or assurance outcome. An active evidence contract is a collection expectation; **not** accepted/supported evidence. No compliance percentage can be derived from these lists.

## Tests and release gates

CI prepares both SQL statements against isolated PostgreSQL fixtures and the complete pinned v1 governance migration set. Tests assert approved-requirement linkage, exclusion of draft and retired records, cross-tenant and cross-department denial, page bounds and opaque error responses.

No independent v2 scoring or evidence engine is introduced. Next: bind the existing Program UI to these reference-only projections, and separately review actor-safe `CurrentRequirementCoverage` before making any coverage or evidence-support claim. Production activation still requires separate authenticated edge, v2 provisioned database, session revocation and privilege/operational review.
