# ClearSight 2 — design-first implementation plan

Date: 2026-10-19. First tranche; not an assertion of v1 feature parity.

## Authoritative inputs
- Source archive: `complete designs.zip`, SHA-256 `65dcc0e3f26e9d41e38efd1ae1d571f5db0f0582a2d561f8c942b25817a5f6e5`.
- Original 18 design packages, 96 original UTF-8 source files, [verified source directory](https://github.com/CloudSpaceLab/clearsight-grc/tree/main/docs/design/references/clearsight-2026-10/source), canonical `clearsight-unified-design-system-v1/clearsight-design-system/clearsight-design-system-spec.md`.
- Backend candidate: [v1 source](https://github.com/CloudSpaceLab/clearsight-grc/tree/main/internal). Do not port v1 user interface.
- V1 source manifest and import checksums are authoritative for source-byte provenance. Illustration/demo statistics in HTML are never production facts.

## Decisions
- New React/Vite application with the unified-design palette and structural composition from source, a single shell and no second component library yet. Accessibility, responsive and dark-mode behavior are implementation criteria.
- Go remains the API/server platform, matching v1 ecosystem for selective reuse. Public metadata-only read can operate before auth integration; tenant data and any mutation are forbidden until v1 equivalent actor-bound authority is ported and tested.
- Database target PostgreSQL. No durable program/customer record is created in this tranche, so the preview does not offer simulated editing, adoption, reports or approvals.
- Framework metadata is seeded, versioned, immutable by edition ID and source-linked, with explicit source verification and licensing gates. `metadata_only` is **not** a requirement library or compliance calculation.
- Later framework adoption must pin edition revision and maintain exact source/clause IDs, applicability decisions, maker-checker reviews, response/evidence/provenance, and honest scored denominator.

## V1 backend reuse assessment

| V1 owner | Reuse priority | Must check before transplant |
| --- | --- | --- |
| `internal/authority`, `internal/access`, `internal/commandauth` | First | Tenant actor verification, least privilege, group scope, maker/checker separation, integration dependency graph |
| `internal/frameworkcatalog` | First | Source verification, edition & clause licensing, version pin, review state, PostgreSQL adapter |
| `internal/continuity` | High | Canonical Programs/Requirements, applicability, outcomes, no duplicate state evaluator |
| `internal/formcontract`, `internal/evidence` | High | Immutable response revisions, collection/assessor distinction, vendor authorization |
| `internal/metricview`, `internal/reporting` | After core | Scoped source revision, denominator, freshness, report-to-record parity |
| `internal/autonomy`, `internal/aigateway` | Later | Proposal versus approval, budget, source grounding; no autonomous compliance conclusions |

Module-level copying is gated by source license, graph review, package imports, SQL migrations, test parity and authz regression. Do not wholesale copy the v1 Go application or carry over its prototype UI.

## Delivery gates

| Gate | Increments | Exit criteria |
| --- | --- | --- |
| A — source & shell | Approved references, tokens, shell, responsive view, catalog API | Source traceability; no false metrics; local dev works |
| B — identity & organization | Verified auth, tenant/group/role selection, audited command authorization | Cross-tenant denial; denied, stale and unknown states |
| C — catalog | 5 jurisdictions/sector source mapping, licensed clause imports, edition updates, source review | Reviewer approval, immutable revision, rights and source checks |
| D — operational spine | Programs, Requirements/Controls, Form linkage, assessments, evidence, Matters and approvals | End-to-end maker/checker; state and history |
| E — specialized | Vendor, RCSA/KRI/loss, ROPA/DPIA, audit, reports, integrations, notifications | Source-to-report parity, all screens from design reference |
| F — hardening | E2E admin/contributor/reviewer/authorizer, accessibility, screenshot comparison, load, migration | Exact role/scoped outcome; 390/768/1024/1280/1440 px, both themes |

The original designs span: Control Tower, Framework Library, Framework Adoption, Programs, Assessment, Vendors, Operational Risk, Privacy, Reporting, Work/Approvals, Controls/Policies, Enterprise Setup, Integrations, Search, Notifications, Audit, People/Access, Automation, and contextual Copilot.

## Local commands

```bash
go test ./...
go run ./cmd/server
# another shell:
cd web && npm install && npm run dev
```

Visit the Vite dev URL. It proxies `/api` to port 8080; framework entries are served by the Go process. `GET /healthz` is a liveness check, not a claim of production readiness.

## Acceptance restrictions for first tranche
- Catalog verified-source flags signal that a primary source was located, **not** that all text, clauses and amendments were reviewed.
- No seeded customer data, sample scores, invented controls or legal conclusions.
- No cross-tenant operations, tenant switcher functionality, form approval, adoption or report export until contracts are implemented and authenticated.
- Only the Overview empty state and Framework Library are functional UI surfaces in this tranche; disabled navigation is intentional.
