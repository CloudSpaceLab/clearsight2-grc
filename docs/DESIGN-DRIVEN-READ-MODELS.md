# ClearSight 2 — HTML-driven backend read model contracts

Approved source: `docs/design/references/clearsight-2026-10/source`. Specifically, `clearsight-program-designs/program-workspace-preview.html`, `program-workspace-design-notes.md` and the unified design-system specification.

## Architecture decision

**The approved HTML defines the read-model shape; the existing v1 domain models and database remain authoritative.** Build small, permission-scoped read projections for the visible screen or selected tab rather than porting v1's entire all-domain aggregate into one API response, creating a second table, or building one endpoint per visual card. Share validated projection fields across list, detail and drills.

The current tranche uses a **single** `programMetadataColumns` SQL projection for both `GET /api/v1/programs` and `GET /api/v1/programs/{id}`. It selects existing `programs` fields only: ID, code, name, type, lifecycle status, owning function, jurisdiction, revision and updated timestamp. Tenant, legal-entity and department-grant predicates remain in SQL; confidential actor scope fields are never serialized. The same server-side contract validates detail/list rows, and the web checks the matching typed response.

No new Program identity table, materialized status, adapter duplication or client-side authorization is introduced.

## Program Workspace contract

| Approved HTML surface | Backend/source | Request and lifecycle | Important exclusion |
| --- | --- | --- | --- |
| Program header, status pill, identity | Existing v1 `programs` and `organization_scopes` | One shared Program projection for detail and bounded discovery; no extra setup request | `ACTIVE` is a lifecycle state, **not** on-track/compliant |
| Requirements | Existing `program_requirements` | Actor-scoped approved/effective keyset page, only when tab opened | No score inferred from requirement count |
| Linked controls | Existing implementation and requirement-link tables | Current linked control page under same actor Program guard | `IMPLEMENTED` is recorded, not effectiveness-tested |
| Evidence | Existing `evidence_contracts` and source links | Current contract reference page; no evidence contents | Active contract is not verified evidence |
| Four Overview measures | v1 canonical requirement assessment/verified evidence projections | **Pending** authorized snapshot, exact denominators and drill parity; keep four slots unavailable | Do not fabricate 52/34/27/7 or show compliance percentage |
| Requirement coverage distribution and area filter | Canonical `CurrentRequirementCoverage` and requirement/control-area classifications | **Pending** actor-visible evidence and source revision; one deterministic breakdown plus exact drill | No browser tally from independently paged rows |
| Recent assessments | Existing form/submission/review owner | **Pending** bounded actor-visible assessments; 7/30/90 days affect this period list | Period selection must not rewrite current posture |
| Needs attention / Issues | Existing Matter/access and Work owner | **Pending** verified principal-visible issue list/attention queue | Do not show tenant-wide restricted Matter counts |
| Program setup / framework adoption | Existing Program, adopted edition and linked form contracts | Program code/function/jurisdiction now available; adopted editions/forms still pending | Catalog availability does not imply adoption |
| Activity | Existing immutable Program events and audit records | **Pending** actor-filtered bounded timeline | Never expose restricted event payloads |
| Copilot | Existing governed AI/evidence gateway | **Pending** source-grounded, actor-authorized suggestions | No fictional recommendations or decisions |

## Other approved workspaces

- **Controls & Policies:** One Control catalog owner, governed current policy revisions, tested-vs-in-scope denominator, separate review queue. Do not conflate tests performed with passed.
- **Reports & Insights:** Existing metrics/report definitions with scope and source version. Current posture is a stock; period losses/activity are flows. No browser-recomputed Program or framework denominators.
- **Audit & Assurance:** Existing audit event and evidence review lifecycle, not a new issue or approval model.
- **Enterprise Setup / People & Access:** Reuse legal-entity/group scopes and signed actor grants; no client-provided tenant overrides.
- **Vendor / Assessment / Privacy / Risk:** Implement only selected, bounded read-model slices matched to their own approved HTML content structure and existing domain owner.

## Release and performance gates

1. Server-side SQL predicates include tenant, legal entity, exact organizational scope and active grants *before* pagination or aggregation.
2. Related sources for any posture/drill use the same immutable revision/snapshot. Show `unknown`, `stale`, `partial` or `denied` explicitly rather than converting missing data to zero.
3. Retain bounded keyset paging and indexes for list tabs. Prefer one batched summary read per visible composition to per-card queries; avoid N+1 and do not fetch full-domain raw aggregates to browsers.
4. Keep original HTML layout, hierarchy, tab content and responsive behavior. Reuse shared design-system components/styles rather than creating page-specific primitives.
5. Enforce source-to-report and role-based test parity before activating overview measures, compliance calculations, privileged Matter conclusions or AI actions.
6. Screenshot workflows provide visual **review evidence**, not automatic pixel-parity certification.

This document records the target API contracts. Only the Program header and safe reference collections above are operationally wired today.
