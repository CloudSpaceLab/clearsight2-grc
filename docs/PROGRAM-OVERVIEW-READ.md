# Program Overview: retained assessment coverage

Approved UI reference: `docs/design/references/clearsight-2026-10/source/clearsight-program-designs/program-workspace-preview.html` and `program-workspace-design-notes.md`.

## Read-model optimization

One small, scoped **`GET /api/v1/programs/{id}/overview`** provides the four stable Program metric slots without fetching the entire v1 Program aggregate, loading raw evidence assessments into the browser, or calling one endpoint per metric card.

The payload contains `program_id`, `program_revision`, a nullable `assessment_coverage`, and three explicitly **null** fields: `supported`, `open_gaps`, and `evidence_to_review`.

### Assessment coverage availability

Only the assessed and eligible population is eligible for release in this tranche, and only if all gates pass in **one read-only repeatable-read transaction**:

1. Exact signed actor, tenant, legal entity, department permission, and Program identity from the existing `getVisible` SQL.
2. V1 authoritative `programs.calculation_policy` corroborated with the immutable policy events, maker/checker identities and v1 checksum.
3. Active Program, approved **requirements-only** policy (one category weighted 10,000 basis points), no vendor category and no expected vendors.
4. V1 source-health dependency query: all required source records current, with zero-source semantics matching v1.
5. Latest retained `program_state_snapshots` record, matching current Program revision and approved policy revision, generated between the approval and the transaction timestamp.
6. Valid, internally consistent requirement category population: assessed + unknown = eligible, exclusions separate, and category/global counts match. Only `FINAL` and `PROVISIONAL` snapshots carry assessment coverage.
7. The client checks the exact Program ID, revision, permitted quality values and count integrity again before rendering.

The UI shows **assessed / eligible requirements**, unknown and excluded counts, quality and as-of date. This is assessment completeness, **not a compliance percentage or judgment**. No diagnostic `assessed_score_bps`, final `score_bps`, raw evidence conclusion, restricted Matter count, internal tenant or approver identity is returned.

Failure, absent policy, stale program version, unknown source health and unconfigured calculation leave `assessment_coverage: null`; malformed stored records fail closed. No zero substitutions.

### The other three approved measures

`supported`, `open_gaps` and `evidence_to_review` stay unavailable until exact actor-allowed evidence/issue populations and membership drills are verified. The Program Overview's requirement area distribution also remains unavailable rather than inferring a chart from incomplete or independently paginated records.

Current status is a **partial, truthful delivery** of the approved Program design. It is not a claim of four-measure parity or production identity provisioning.

## Acceptance

Synthetic PostgreSQL checks exercise approved, denied, stale-revision and unhealthy-source cases; HTTP tests reject bad signatures, forged scopes and unsupported period filters; browser tests reject fabricated counts and cross-Program responses. Pinned complete v1 migrations must support the optimized read query. Screenshot comparisons still require human visual judgment, particularly on populated states.

Next: establish source-backed supported/gap populations and their **exact permission-compatible drills**, then separately connect reviewed evidence queues, period activity and reports. Avoid creating new governance tables or browser-side scoring logic.
