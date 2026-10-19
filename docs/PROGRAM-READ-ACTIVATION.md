# Program read activation

Program metadata reads are disabled by default. The public v2 API continues to serve `/healthz` and the source-reference catalog.

## Activation requirements

The following settings must all be present. An incomplete configuration aborts startup rather than activating a partial Program service.

| Variable | Requirement |
| --- | --- |
| `CLEARSIGHT_V2_PROGRAM_READ_ENABLED` | Explicit `true` |
| `CLEARSIGHT_V2_DATABASE_URL` | Separate v2 PostgreSQL instance with valid v1-compatible `programs` and `organization_scopes` schema, credentials and `sslmode=verify-full` |
| `CLEARSIGHT_V2_IDENTITY_SIGNING_SECRET` | Secret held only by trusted identity-signing edge and Go API; at least 32 bytes and generated with strong entropy |

The bootstrap opens a bounded `database/sql`/pgx pool, pings the database, prepares the **real tenant-scoped Program query** to reject incompatible columns, and only then registers `GET /api/v1/programs/{id}`. Reads use a five-second context deadline. A failed schema, TLS handshake, identity configuration or database connection refuses activation.

**Identity trust boundary:** A reverse proxy may forward the signed identity envelope only after stripping every client-supplied `X-ClearSight-Identity*` header and replacing them from an authenticated upstream identity. No client/browser may possess the signing key. Protect the API behind a TLS ingress; use independent upstream secret rotation, signed session revocation and audit procedures.

## Scope and limitations

- Only an individual Program metadata read is enabled. The returned fields are identifier, name, source revision and last updated timestamp, never a compliance conclusion.
- Tenant and legal entity are taken from the verified actor, **not** URL parameters. Department grants require exact active scope match in the database; unscoped Programs cannot be read through a department-only grant.
- The source references remain publicly readable as metadata. They have no tenant adoption effect and are not compliance scores.
- Schema readiness via a prepared query does **not** prove v1 migrations, database isolation, data consistency, entitlements, production network segregation or the full actor-visible Matter evaluator.
- The React Program Workspace remains an honest empty state until current signed-session retrieval and source-backed UI contracts are implemented and reviewed.

## Remaining release gates

1. Adopt/migrate the complete v1 schema (including scopes and Program relations) on a separately provisioned v2 database; no connection to the live v1 customer database.
2. Test real SSO session, private ingress/header stripping, HMAC rotation/revocation, legal-entity and department grants, database permissions, audit and continuity state.
3. Validate zero customer data leakage for cross-tenant exceptions, malformed tenant requests and latency/errors under load.
4. Only then wire Program record selection and authorized source-version reads into the approved frontend.

CI covers configuration fail-closed unit tests and scoped real PostgreSQL integration tests using isolated disposable schemas. Do not use its disabled-TLS test credentials in deployment.
