# Program read — PostgreSQL integration gate

Status: test infrastructure, **not** a production activation.

## Verified implementation boundary

The Program read repository uses the exact v1 PostgreSQL columns from `programs` and `organization_scopes`, plus a signed actor model ported from v1. The dedicated CI job runs the real parameterized query through the v1-compatible `pgx` database/sql driver against PostgreSQL 18.

- Each test uses an isolated disposable schema with a single dedicated connection and `search_path`.
- The integration schema contains only the columns needed to execute the read contract. It is **not** a migration for a deployable GRC database.
- No production data or tenant credentials are seeded. All identifiers are synthetic UUIDs.
- Tests cover exact department permissions, global organization access bounded by tenant and legal entity, cross-scope denial, missing Program, retired/expired/future organization scopes, session expiry, service identity denial and signed HTTP traffic.
- A negative read returns an opaque `404` for absent/out-of-scope Programs. An invalid signature is `401`; a valid actor without oversight permission is `403`.
- The running `cmd/server` continues to expose **only** public catalog metadata and liveness.

## Run locally

With a disposable PostgreSQL instance:

```bash
export CLEARSIGHT_TEST_POSTGRES_DSN='postgres://clearsight_test:<local-password>@127.0.0.1:5432/clearsight_test?sslmode=disable'
go test -mod=readonly -tags=postgres -count=1 ./internal/programread
```

The integration test skips when the variable is absent. The GitHub Actions `program-postgres` job always sets it and must pass.

Never use `sslmode=disable` for remote/production database traffic. Require TLS verification, a role with minimum privileges, a bounded pool, credential rotation and a production-grade session identity trust chain.

## Remaining production gates

1. Decide full v1 migration adoption versus an audited v2 evolution path. Do not introduce an independent small `programs` schema that diverges from v1's aggregate, event/outbox and control/requirement relations.
2. Run complete migrations on a separate v2 PostgreSQL instance and validate tenant/legal-entity/org-scope referential integrity with the **real** production schema, not only this disposable subset.
3. Verify provisioned users, roles/departments, revocation and current organization scope grants using a trusted identity provider and audit logs.
4. Configure the database adapter and signed identity upstream, reject unsafe development identities, and only then register authenticated `GET /api/v1/programs/{id}`.
5. Wire authorized data snapshots to the approved React Program workspace. Never compute compliance status from counts or expose hidden Matter-derived score components.
6. Add source revision consistency, cross-role report parity, index/EXPLAIN plans, pagination, statement timeouts and denial-path load tests before enterprise release.

The schema fixture is an execution proof for the current read boundary, not a claim that ClearSight 2 has been migrated or reached operational parity.
