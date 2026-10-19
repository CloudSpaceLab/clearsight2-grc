# Canonical coverage source snapshot

The internal `programread.SQLRepository.currentCoverage` path assembles source facts from **the v1 schema** and calls the byte-for-byte ported `continuity.CurrentRequirementCoverage`. It is **not** registered as an HTTP endpoint, and does not add a compliance score to the UI.

## Source of truth

- `program_requirements`: approved and historical lifecycle records for population inclusion
- `program_applicability`: approved decisions and effective periods
- `control_implementations`: implementation lifecycle and time boundaries
- `requirement_control_links`: created/retired mapping history
- `evidence_contracts`: active contracts, freshness and required coverage
- `evidence_assessments`: conclusions, evidence coverage, explicit validity, assessment chronology

The Program is authorized using the existing actor-scoped `getVisible` query **before** loading any source records. That query enforces tenant, legal entity, exact active department grants and actor expiry. All fact reads rebind tenant and Program ID and execute inside the *same read-only repeatable-read* PostgreSQL transaction. Evaluation time is the database transaction timestamp.

Every table has a hard cap of 5,000 rows plus a detection row. Any excess, SQL error, decoding error or commit failure fails closed **before** the canonical evaluator is invoked. No partial population is interpreted as compliance. The bound is an interim safety limit requiring an enterprise-scale, validated population streaming strategy before wider rollout.

## Tests

The synthetic PostgreSQL fixture proves a verified requirement/control/evidence chain can be evaluated, but missing applicability or stale evidence stays incomplete; wrong tenant, legal entity and department are denied. A bulk source over the hard cap fails rather than returning a falsely favorable numerator.

The separate full pinned v1 migration CI validates the source queries against the *actual* upstream schema and checks that unapproved applicability is not counted.

## Important: not yet an externally safe projection

The loader necessarily sees raw evidence assessment conclusions that may be restricted by separate review permissions. It must remain **internal-only** until actor-visible evidence and Matter permissions, source-health status, approved calculation policies, immutable snapshot revision and any historical reconstruction rules are audited.

Do not surface `Complete`, `EvidenceSupported`, reasons, contract IDs or any percentage on the UI by merely exposing this function. Production SSO ingress and session revocation remain pending deployment gates.
