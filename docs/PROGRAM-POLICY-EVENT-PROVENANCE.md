# Approved Program policy event provenance

An approved policy cannot be trusted merely because a JSONB value is present in `programs.calculation_policy`. V1 writes that value as a materialized projection of the append-only `continuity_events` Program stream.

This internal, read-only gate reconciles:

1. The exact authorized Program row, tenant, legal entity, lifecycle and revision.
2. Its current `calculation_policy` projection with the **latest Program compliance-policy event** (`PROPOSED`, `APPROVED` or `REJECTED`).
3. Any active approved policy with the **latest `PROGRAM_CALCULATION_POLICY_APPROVED` event**. The approval event's policy revision, maker-checker identifiers, checksum, and recorded person actor must agree with the active projection.
4. The original v1 policy `ValidateProgramComplianceCalculationPolicy` and `programCompliancePolicyChecksum` functions, through the existing pinned calculator and a narrow exported checksum adapter.

All reads run within the same read-only repeatable-read transaction used for signed actor authorization, requirement facts and source-health checks. Missing events, altered materialized policy, invalid revision, missing approval, future approval, mismatched approver identity, self-approval, invalid definition or forged checksum **fail closed**.

A previously approved policy can legitimately remain active while a newer proposed revision is pending or rejected, so the active policy is reconciled independently from the latest policy-position event.

No Program policy is inferred from browser input, default policy templates, control inventory counts or unsigned HTTP parameters. The private snapshot retains the verified policy position and Program lifecycle for later use.

## Validation scope

The gate checks the materialized policy against the latest policy event and active approval event, including the signed transaction's tenant, legal entity and Program. It is **not a full historical event-stream replay**, nor does it verify every historical event or protected source/evidence permissions.

The remaining release gates are the full v1 event-history and revision reconstruction, actor-visible Matter/evidence-assessment permissions, approved category population and source-health checks, trusted production session infrastructure and source-to-report reconstruction. No HTTP scoring endpoint, stored score or Program percentage is enabled by this tranche.
