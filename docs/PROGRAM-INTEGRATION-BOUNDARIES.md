# ClearSight 2 — Program authorization and data integration

Status: implementation boundary, not a completed security feature. This is the prerequisite for changing the Program Workspace from empty layout to customer data.

## Reuse exact v1 domain contracts

| Existing v1 source | Required behavior in v2 | Required regression |
| --- | --- | --- |
| [identity/model.go](https://github.com/CloudSpaceLab/clearsight-grc/blob/main/internal/identity/model.go) | Verified, nonexpired actor with tenant ID, principal ID, legal entity ID, department grants, role and permission codes. No header-trusted tenant or person IDs. | Forged/missing/expired actor, missing scope and incorrect department path rejected. |
| [commandauth/guard.go](https://github.com/CloudSpaceLab/clearsight-grc/blob/main/internal/commandauth/guard.go) | Production mutation uses enforced authority route. Tenant/legal entity match; deny service actor unless explicitly permitted; no implicit approval on missing authority. | Denied wrong-tenant, wrong-entity, unauthorized actor, unresolved/ambiguous route and guard-unavailable mutation. |
| [authority/model.go](https://github.com/CloudSpaceLab/clearsight-grc/blob/main/internal/authority/model.go) | Separate proposer/reviewer/authorizer authority and effective/delegated principals; resolve from current policy. | A prior candidate or stale authority route must not authorize the current decision. |
| [continuity/program_state_visibility.go](https://github.com/CloudSpaceLab/clearsight-grc/blob/main/internal/continuity/program_state_visibility.go) | Build actor-visible Program projection. Exclude restricted Matters, their trigger payloads and protected snapshot provenance. Do not show a composite score that includes records hidden from the actor. | Two actors in same tenant receive only respective visible Matter counts, with stable authorized projection identity. |
| [continuity/program_compliance_calculation.go](https://github.com/CloudSpaceLab/clearsight-grc/blob/main/internal/continuity/program_compliance_calculation.go) | Keep approved category weights, immutable source inputs, unknown/NA denominator rules, coverage threshold and `PROVISIONAL/FINAL/NOT_ASSESSED` states. | Unknown or missing answers cannot become compliant; no percentage from an unapproved policy or incomplete expected population. |
| [frameworkcatalog/source_verification.go](https://github.com/CloudSpaceLab/clearsight-grc/blob/main/internal/frameworkcatalog/source_verification.go) | Validate source manifests, SHA256, release and size bounds before edition publishing. Check licensing/reviewer separately. | Corrupt source, duplicate JSON keys, oversized artifacts and invalid metadata rejected; checksum not treated as publisher approval. |

## Implementation order

1. Audit v1 `identity`, `authority`, `commandauth`, `continuity` dependencies against the v2 Go module. Port the **minimum tested dependency graph**; do not copy the entire v1 server, parallel policy engine or legacy UI.
2. Establish session validation and current actor resolver before adding tenant data routes. Invalid identity returns `401`; verified actor without an applicable route/scope gets `403`; unavailable authority/data source fails closed.
3. First read: `GET /api/v1/programs` returns only Programs visible to the verified tenant/principal. Resolve legal entity and department boundaries in the repository/query, not by client filtering. Each item includes immutable source revision, updated time, bounded state and explicit unknown/null.
4. Detail: `GET /api/v1/programs/{id}` calls the actor-safe Program projection and returns a single authorized snapshot. Requirements, assessments, actions and evidence must share its tenant/legal-entity/scope and source cursor. Do not infer context from a catalog reference.
5. Views: the currently implemented Program Workspace should consume the authorized read model and substitute real data for its four metric slots, coverage distribution, assessment rows and right-hand action cards. `—` remains valid for unknown/unavailable; never fall back to prototype numbers.
6. Mutations: add create/update/assessment/review only with expected source revision, current authorization, role separation, audit event and transaction boundary. Ensure a denied action has no database or event side effects.
7. Reports: render the same actor-visible source revision; forbid report download/export if the viewer lacks scope, even when they can see summary metrics.

## API/read model guardrails

- `tenant_id`, `principal_id`, `legal_entity_id`, `scope` and `permission` come from verified server context. Front-end selectors request a permitted subset, never grant access.
- Assessment coverage counts, supported, gaps, awaiting review and not assessed use mutually exclusive, source-backed populations. Evidence review counts have their own population.
- Current posture must not change when the user selects a historical activity period. A period selector limits activity events only.
- An aggregate compliance number is absent until policy, denominator, permissions and freshness are verified. Never derive it from the four metric cards.
- Program detail and reports must not leak case IDs, trigger payloads or matter-derived score components hidden from the actor.

## Current v2 status

- Program layout and keyboard-operable section tabs exist under the approved design CSS.
- All Program metrics, requirements, assessments, actions and Copilot suggestions intentionally show no data until authenticated scope and source reads are implemented.
- Catalog is metadata-only and cannot be scored or adopted.
- No Program mutation, tenant switcher, authorizer workflow or compliance result is enabled.

Do not label Program cutover functionally complete until administrator/contributor/reviewer/authorizer integration tests and source-to-report permissions pass.
