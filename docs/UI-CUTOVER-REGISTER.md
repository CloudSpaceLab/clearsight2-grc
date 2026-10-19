# ClearSight 2 — approved-design cutover register

Updated: 2026-10-19. Applies only to v2; no claim of v1 UI parity or production deployment.

## Source of truth
- Approved source: [October 2026 archived designs](design/references/clearsight-2026-10/source/README.md), preserved byte-for-byte and guarded by `scripts/verify_design_references.py`.
- Framework reference: `clearsight-framework-designs/framework-library.html`; the React implementation imports the **original extracted reference CSS** (plus explicit accessibility/service-state overrides), guarded by `scripts/verify_framework_parity.py`.
- The screenshot workflow `.github/workflows/design-visual-review.yml` captures **reference and actual app** at 390/768/1024/1280/1440px. The generated PNGs are *review evidence*, not automatic proof of pixel equality.

## Screen-by-screen register

| Approved screen | Canonical design package | Runtime state | Operational gate |
| --- | --- | --- | --- |
| Unified shell / design system | `clearsight-unified-design-system-v1` | Partial: Framework first screen uses the approved shell/CSS | Global navigation, other screen slots, mobile and dark review |
| Control Tower / Home | `clearsight-designs-01-05` | Empty state only | Authenticated tenant/role/scope, honest source-backed measures |
| Framework Library | `clearsight-framework-designs` | **Live metadata + approved two-column composition**, pending visual review | Verified editions, adopted/updated views, API-backed governance |
| Framework Adoption | `clearsight-framework-designs` / `clearsight-designs-01-05` | Not implemented | Actor-bound edition/requirement review, maker-checker |
| Program Workspace | `clearsight-program-designs` | Approved layout, tabs and no-data state implemented; real Program reads/actions pending | Scope, program/requirement state, approved calculation |
| Assessment Workspace | `clearsight-designs-01-05` | Approved three-pane shell, keyboard tabs and honest empty states; visual review pending | Forms/response revision, assessor ownership, evidence |
| Vendor Management | `clearsight-vendor-management-designs` | Not implemented | Third-party identity, forms, scoped access |
| Operational Risk | `clearsight-operational-risk-designs` | Not implemented | Risk/loss/RCSA/KRI canonical owner and period model |
| Privacy / Data | `clearsight-privacy-data-designs` | Not implemented | ROPA/DPIA records, approved scopes |
| Controls / Policies | `clearsight-controls-policies-designs` | Not implemented | Approved control revisions and evidence links |
| Audit / Assurance | `clearsight-audit-assurance-designs` | Not implemented | Audit trail and findings authority |
| Reports / Insights | `clearsight-reports-insights-designs` | Not implemented | Source snapshot and permission parity |
| Work / Approvals | `clearsight-work-approvals-designs` | Not implemented | Maker/checker separation, audited decisions |
| Enterprise Setup | `clearsight-enterprise-setup-designs` | Not implemented | Tenant/group/org hierarchy and grants |
| People / Access | `clearsight-people-access-designs` | Not implemented | Admin, roles and least-privilege authorizer |
| Integrations | `clearsight-integrations-designs` | Not implemented | Connector credentials and delegated access |
| Search / Command Center | `clearsight-search-command-center-designs` | Not implemented | Tenant-scoped search indexing |
| Notifications / Activity | `clearsight-notifications-activity-designs` | Not implemented | Tenant-scoped events and audit stream |
| Automation Governance | `clearsight-automation-governance-designs` | Not implemented | Proposal budgets, human approval |
| Contextual Copilot | `clearsight-contextual-copilot-designs` | Not implemented | Grounded retrieval, privacy and actions permissions |

## Required acceptance for *each* page
1. Match **source composition** first: shell, header, navigation, tabs, panels, drawers, controls, density, hierarchy, and breakpoint behavior. Generic functional approximations are not an accepted substitute.
2. Replace illustrative prototype content with API-backed, authorized records. If unavailable, use honest empty/loading/error states, never sample customer measures or fake approvals.
3. Verify mobile (390, 768), medium (1024, 1280), desktop (1440); keyboard focus and reduced motion; document visual deltas against the paired screenshot artifacts.
4. Verify CRUD/mutations only after actor, tenant, group, maker-checker, auditing, stale-read and provenance contracts are tests, including denied cross-tenant access.
5. Establish source-to-report lineage before any compliance percentage, report, recommendation or approval result appears.

## Next executable sequence
1. **Visual signoff**: compare paired Framework Library and Program Workspace screenshots (both at 390/768/1024/1280/1440). The Framework screenshots show matching panel hierarchy, but typography, content-dependent wrapping and interactive states still require review. The Program screenshot is currently an unconnected, explicitly empty presentation, **not** a preview of fictional bank posture.
2. **Identity boundary before operational screens**: inspect/port selectively from v1 `internal/authority`, `internal/access`, `internal/commandauth`. Add tenant/group/actor enforcement tests. Do not create mutable Program APIs without this.
3. **Governed catalog**: reuse only validated v1 framework catalog edition/provenance primitives; keep all 21 initial references metadata-only until verified clause rights and two-person approval.
4. **Program + Assessment vertical slice**: implement the approved Program/Assessment HTML pair using same canonical runtime shell and a single immutable requirement/evidence/assessment model; bring in #433 scoring only after exact denominator/source tests.
5. **Cross-role acceptance**: administrator → contributor → reviewer → authorizer, plus source-to-report permissions; then expand remaining specialized screens.

**Status**: Framework Library and Program Workspace design compositions exist. Program has no authenticated data contract and does not offer mutations. Visual parity is not yet adjudicated. Authenticated operational feature parity is not achieved. This record does not authorize merging v2 into a production cutover.
