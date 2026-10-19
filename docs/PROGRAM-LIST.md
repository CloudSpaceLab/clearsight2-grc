# Program discovery — actor-scoped, bounded list

`GET /api/v1/programs?limit=25&cursor=...` is registered only when secure Program-read activation succeeds. It shares the signed actor validation used for `GET /api/v1/programs/{id}`.

- Scope is derived solely from the authenticated actor, never a client tenant, principal, entity or department argument.
- PostgreSQL applies tenant/legal-entity filters and exact active organization-scope grants **before** ordering, paginating or returning records.
- Keyset position is a UTC timestamp/UUID of the previous last visible Program, not an authorization token. The same actor's access is re-evaluated every page; no total counts or unrestricted offsets.
- Response includes only Program ID, name, source revision and last-updated timestamp. No compliance posture, restricted Matter details, evidence or assessment data.
- Page sizes are bounded to 1–50, default 25; malformed pagination and all unknown filters fail closed.
- Response serialization validates every row's permitted tenant/entity/department, even if repository data were inconsistent.
- The opt-in startup schema check prepares *both* detail and list queries.

The [full pinned v1 migration rehearsal](../.github/workflows/v1-schema-compatibility.yml) remains authoritative for schema compatibility; the PostgreSQL fixture tests are also run in regular CI.

## Production preconditions

Complete v2-isolated DB provisioning and migration management, trusted edge identity header stripping and rotation, performance/EXPLAIN under load, stable snapshot revision handling, and source-backed Program status projection before enterprise rollout. Existing role-scoped access policy is not enlarged by the list endpoint.
