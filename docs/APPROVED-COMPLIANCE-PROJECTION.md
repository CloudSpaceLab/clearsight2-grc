# Approved Program compliance projection gate

ClearSight 2 now reuses the pinned v1 `requirementsOnlyProgramCalculation` source and original `programCompliancePolicyChecksum` function. Both remain internal.

The policy projection validates the following **before it will return a calculation**:

- Program is active and contains an effective approved policy.
- Policy has **exactly one `REQUIREMENTS` category**, with no expected vendor assessments; other policies are deliberately unsupported rather than partially computed.
- Source quality is known and all required sources are current.
- Revision number and revision string agree, maker and approver are nonempty and **different people**, the approval date is current, and the canonical policy checksum matches the immutable approved definition.
- The policy satisfies v1's original `ValidateProgramComplianceCalculationPolicy`. Canonical requirement/evidence records determine assessed versus unknown inputs.
- The v1 calculator only returns a final score if the approved minimum coverage and expected population rules are satisfied.

The projection and checksum are traced to upstream commit `183336ed518cdc63ba05d9ab3f97b808d923c7ff`; CI enforces the exact source blob for `program_compliance_projection.go` and compares the checksum helper body to the pinned v1 implementation.

## Activation remains blocked

This is **not** the maker-checker workflow or an HTTP endpoint. No browser or report receives a score.

The existing internal PostgreSQL loader does not yet hydrate the Program's signed approved policy, evidence source-health position, complete event/revision history or actor-visible restricted Matters. Until these are loaded under the trusted actor and audited together, the v1 projection must not be invoked on customer data for publication.

Required next:
1. Port the v1 Program policy position and source health *read contract*, including approved event reconstruction and checksum validation, without introducing a second approval implementation.
2. Verify current actor access to evidence assessment conclusions and any restricted Matter-derived information; suppress protected components for unauthorized principals.
3. Freeze aggregate facts and source health to one authenticated database/snapshot revision, enforce complete expected population and compare report drill-down to that source.
4. Verify source and policy failure states against admin, contributor, reviewer and authorizer role tests before enabling user-visible scores.
