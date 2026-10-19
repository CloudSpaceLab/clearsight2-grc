# Canonical requirement coverage engine

## Provenance

Source: `CloudSpaceLab/clearsight-grc`, pinned to commit `183336ed518cdc63ba05d9ab3f97b808d923c7ff`, matching the full-v1-schema rehearsal. The following **unmodified** v1 files are ported verbatim into `internal/continuity`:

- `requirement_coverage.go`
- `effective_evidence_contracts.go`
- `requirement_coverage_test.go`
- `effective_evidence_contracts_test.go`

The functions `requirementControlLinkEffectiveAt`, `effectiveAt` and `boundedAssessmentValidity` in `coverage_helpers.go` are excerpted exactly from the same commit's `state.go`. `model.go` contains only the immutable evaluator input fields and enum values needed by those existing functions; it introduces **no state storage, business rule variation or alternative calculator**.

The automated source lock checks upstream Git blob checksums in every foundation CI run. The schema-compatibility workflow additionally compares each copied file and all three helper function bodies to the checked-out pinned upstream commit.

## Semantics retained

- A requirement participates only when approved and currently effective.
- Approved applicability and exact-period control mapping govern implementation status; future or retired links do not count.
- An effective *implemented* control and at least one effective evidence contract are required.
- Every relevant contract must have a latest, currently valid assessment concluding `SUPPORTED`, meeting its minimum coverage, and respecting both its explicit validity and the configured freshness window.
- Unknown applicability, missing controls, incomplete evidence reviews, expired evidence and future/retired requirements cannot be marked complete.
- Results sort identifiers/reasons deterministically for audit reconciliation.

## Activation boundary

This is a **pure canonical evaluator**, not an API activation or a Program compliance score. The existing public Program UI continues to show reference inventories only. Do not calculate or expose coverage results from browser-paginated data or a partial set of Program facts.

Before any API/score:
1. Load all source facts in one bounded, read-only snapshot from the v1-compatible PostgreSQL schema after verifying signed identity, tenant/legal entity, Program and exact department permissions.
2. Preserve retired mapping timestamps, evidence assessment ordering, validity and minimum-coverage precision, and cap all record populations before calling this evaluator.
3. Confirm actor-visible projection permissions for evidence assessments and restricted Matters. Raw assessment details and any privileged Matter-derived component must not leak.
4. Only display compliance scoring where a valid approved maker-checker calculation policy, source-state freshness and audited denominator can be proven using v1's canonical policy validators.

See `docs/PROGRAM-ASSURANCE-INVENTORY.md` for the current read-only, no-score UI boundary.
