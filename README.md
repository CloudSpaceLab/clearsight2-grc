# ClearSight 2 GRC

Design-first ClearSight GRC v2. This is an **independent codebase**, not a rename of the v1 UI.

## Source of truth

- Approved visual and interaction designs: [October 2026 references in v1](https://github.com/CloudSpaceLab/clearsight-grc/tree/main/docs/design/references/clearsight-2026-10/source).
- Original design archive: `complete designs.zip` (SHA-256 `65dcc0e3f26e9d41e38efd1ae1d571f5db0f0582a2d561f8c942b25817a5f6e5`).
- V1 repository is a **candidate backend implementation source only**. Reuse of modules requires explicit dependency, authorization, tenancy and license review.

## Non-negotiable foundations

1. Reproduce the approved information hierarchy, components, responsive behavior and interaction semantics in a single v2 web application. Prototype sample statistics are not production data.
2. One authoritative multi-tenant API. Fail closed on unverified tenant, group, identity and command permissions.
3. Source-based, revision-pinned compliance catalog across Nigeria, Kenya, South Africa, Ghana and EU, with explicit jurisdictions and verticals.
4. Framework metadata seed **does not** imply clause-level completion, permission to redistribute copyrighted standards, legal applicability, or compliance status.
5. No production dashboard metric, pass/fail determination, AI proposal or workflow button without a source-backed contract.
6. CI enforces catalog validation, type checking, accessibility, tests and design-state acceptance as delivered.

See the implementation branch/PR for the first increment. The original v1 remains unchanged.
