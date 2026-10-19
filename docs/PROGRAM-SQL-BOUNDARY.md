# Actor-scoped Program SQL read adapter

The adapter in `internal/programread/sql_repository.go` is an **inactive, read-only** implementation of the already merged `programread.Repository` contract. It expects the schema from v1 [000008 Program foundation](https://github.com/CloudSpaceLab/clearsight-grc/blob/main/migrations/000008_programs_matters.up.sql), [000102 organization scopes](https://github.com/CloudSpaceLab/clearsight-grc/blob/main/migrations/000102_organization_scope_foundation.up.sql) and [000108 Program scope](https://github.com/CloudSpaceLab/clearsight-grc/blob/main/migrations/000108_program_organization_scope.up.sql).

## Boundary

- Reuses the signed, expiring server actor from the v1 identity model; no request-header tenant override.
- Uses parameterized `tenant_id`, `legal_entity_id`, Program ID, global permission flag and exact normalized department grant paths in **one SQL predicate**, before a row is read.
- A globally authorized reader can inspect programs in their own tenant and legal entity. A departmental reader can inspect only Programs bound to active scopes whose *exact* department path is granted. No child/parent inheritance or unscoped Program fallback.
- The same actor-visible record validator checks returned tenant/entity/scope, source version and record identity.
- Absent rows return `ErrNotFound`, and unexpected database/scope results fail closed without emitting tenant records.
- Read model deliberately excludes posture, Matter triggers, evidence, scores and approvals until v1 actor-safe state projection is ported.

## Activation gates

1. Reconcile v1 schema/migrations and data backfill on a dedicated v2 PostgreSQL instance. Do **not** point the preview at the live v1 database.
2. Supply a production-supported `database/sql` PostgreSQL driver with TLS and bounded connection pool; inject `NewSQLRepository` only after startup health and migrations are verified.
3. Configure a trusted upstream signed actor authenticator; never expose its shared signing secret to the browser.
4. Run actual PostgreSQL integration tests for global, exact-department, wrong-tenant, wrong-entity, invalid/retired scope, absent Program and revoked actor scenarios.
5. Only after those gates register `GET /api/v1/programs/{id}` and render authorized Program metadata in the new UI.
6. Program state and reports require v1 actor-visible Matter projection, source cursor and scored-denominator parity before inclusion.

The current unit tests verify SQL parameter use, scope construction, denied/unknown cases and output validation. They **do not** replace database integration and authorization acceptance testing.
