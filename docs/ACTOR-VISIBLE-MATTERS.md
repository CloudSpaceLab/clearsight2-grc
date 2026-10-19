# Actor-visible Program Matter boundary

The private ClearSight 2 Program coverage snapshot now includes a **principal-visible** open Matter count and newest visible Matter activity, using the existing v1 visibility predicate. No Matter title, scope payload, principal allow-list, restricted evidence, or count is exposed over HTTP.

## Canonical source

- `internal/continuity/access.go` and `access_test.go` were ported byte-for-byte from v1 commit `183336ed518cdc63ba05d9ab3f97b808d923c7ff`. CI checks their upstream Git blob hashes and exact files against pinned v1.
- `internal/programread/visible_matters.go` adapts the current-state predicate from v1's `VisibleProgramMatterVisibility` PostgreSQL repository, using exact tenant, Program and authenticated principal parameters.
- The current Program's **existing** signed-actor authorization, tenant/legal-entity and exact department scope runs first. The Matter visibility count is read in the same read-only repeatable-read transaction as canonical requirement/evidence source facts, verified policy and source health.
- Scope with no explicit access is treated as internal **only after tenant and Program authorization**. Explicit `PUBLIC` and `INTERNAL` are visible. `RESTRICTED` requires a valid, nonempty string allow-list containing the current authenticated principal. Unknown/malformed access is denied.
- Only open Matters contribute (`CLOSED` and `CANCELLED` excluded). DISTINCT protects against duplicate links; latest activity excludes invisible Matters.

## Verified acceptance

Synthetic PostgreSQL tests cover internal, public, principal-granted, principal-denied, malformed restricted and closed Matters, multiple links and cross-tenant/entity/department denial. The complete pinned v1 migration rehearsal also tests internal versus restricted Matters from real `matters` and `matter_links` tables.

## Remaining production blockers

This is a *current-state-only* Matter visibility fact. Historical time-travel visibility, the full actor-visible Program state projection and source-to-report parity still require separate acceptance.

**Evidence assessment conclusion visibility is not yet proven.** The internal canonical evaluator currently consumes governed assessment facts, but its result must remain private. Do not publish `EvidenceSupported`, `Complete`, reasons, any aggregate score, or a privileged numerator/denominator to a user before verifying evidence permissions and all actor-visible state dependencies.

No new route, compliance score, UI widget, report or approval action is introduced here.
