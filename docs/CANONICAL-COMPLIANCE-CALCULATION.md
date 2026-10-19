# Canonical Program compliance calculation — internal tranche

## Pinned source

The following v1 files are copied **without modification** from `CloudSpaceLab/clearsight-grc` commit `183336ed518cdc63ba05d9ab3f97b808d923c7ff`:

- `internal/continuity/program_compliance_calculation.go`
- `internal/continuity/program_compliance_requirements.go`
- `internal/continuity/program_compliance_calculation_test.go`
- `internal/continuity/program_compliance_requirements_test.go`
- `internal/continuity/program_compliance_policy_test.go`

Source blob integrity is enforced by `scripts/verify_coverage_parity.py` in foundation CI and by byte-level comparison to the upstream checkout in the pinned full-schema CI. The existing shared v1 coverage evaluator is reused, with only the original enum constants required by the tests added to its v2 input contract.

## Calculation semantics

- `ProgramRequirementComplianceInputs` consumes **canonical evaluated requirement coverage**; it does not infer applicability, evidence completeness or vendor results from UI counts.
- `ValidateProgramComplianceCalculationPolicy` enforces a revision, minimum assessment coverage, a balanced basis-point category policy and valid expected-vendor obligations.
- `CalculateProgramCompliance` uses deterministic integer basis-point arithmetic and a governed expected population. Missing/unassessed inputs remain in the denominator unless there is explicit approved non-applicability.
- Provisional results have **no final `ScoreBps`**. Diagnostic `AssessedScoreBps` is never a publishable compliance percentage.
- Supported requirements alone do not establish a Program-wide score, and an independently calculated result is not proof that a policy was reviewed or approved.

## Not activated

No API route, frontend percentage, background calculation, report field or persisted score is enabled in this tranche.

The current actor-scoped source loader can read canonical requirement facts, but before publishing any result the following remain mandatory:

1. Pin a complete, immutable Program aggregate and its evidence/source revisions, audit dependencies and effective-time boundary.
2. Verify active maker-checker **policy lifecycle**, signatures/checksums, revision matching, explicit weights and population completeness from v1.
3. Enforce review/evidence source permissions and the v1 actor-visible Matter projection. Do not expose restricted evidence or privileged numerator/denominator through unreviewed aggregation.
4. Enforce source freshness and completeness. Unknown source health, stale evidence and missing expected category populations must suppress final scores.
5. Verify exact source-to-report reconstruction and cross-role acceptance against full v1 governance fixtures.

The canonical calculation should only be exposed through a reviewed, actor-safe service once these gates pass.
