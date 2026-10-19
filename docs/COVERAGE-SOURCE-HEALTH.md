# Authorized source-health snapshot

The private Program coverage loader now evaluates source dependencies with the existing v1 `CurrentProgramSourceState` contract, in **the same read-only, repeatable-read PostgreSQL transaction** as the signed-actor Program lookup and canonical requirement facts.

## Authoritative storage

- `program_requirements.source_id` for approved and effective obligations
- `evidence_contract_sources` linked to active `evidence_contracts`
- Contract targets in the existing `program_requirements` and `control_implementations` tables, respecting status and effective windows
- `evidence_sources.status` and `evidence_sources.health` as the authoritative source-health records

The query follows pinned v1 `CurrentProgramSourceState` semantics: deduplicate dependencies using `UNION`, count all required sources, and count a source as current only when **both** status is `ACTIVE` and health is `CURRENT`. A source-free Program has `Known=true`, `Required=0` and `Current=false`; unknown/missing sources and stale/paused records cannot be counted current.

v1 evaluates status using repeated wall-clock calls. This adapter intentionally substitutes PostgreSQL `transaction_timestamp()` so the source-health and coverage facts share the same immutable transaction clock. It uses exact bound UUID tenant and Program IDs rather than the v1 tenant-slug fallback. Both differences are security/consistency constraints, not alternate source-health logic.

The private `currentCoverageSnapshot` returns two separately typed results: canonical requirement coverage and source health. It does not invoke the compliance policy projection or serialize either result to HTTP. The original `currentCoverage` method remains private and delegates to the new snapshot.

Any read failure, malformed count or source population exceeding the current 5,000-fact cap fails closed before returning a partial snapshot. `CheckCoverageSourceSchema` prepares the source-health query alongside all canonical fact queries for compatibility testing, without widening the public Program startup routes.

## Acceptance

Synthetic PostgreSQL tests verify direct obligations, active contract dependencies, deduplication, future/draft exclusions, `CURRENT`/stale/paused transitions, and denial across tenants, legal entities and departments. Full-schema CI prepares the same query against the pinned complete v1 migration chain.

## Release blockers

No compliance score or source-health summary is exposed to a user. A production-safe calculation still requires the active, event-reconstructed maker/checker-approved policy, evidence conclusion access authorization, v1 actor-visible Matter projection, complete category population, immutable source revision and source-to-report parity. The trusted SSO ingress, provisioning and session revocation gates also remain outstanding.
