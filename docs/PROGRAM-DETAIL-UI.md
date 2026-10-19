# Authorized Program detail — first UI binding

The approved Program Workspace can resolve an explicitly requested Program using `?screen=programs&program=<UUID>`. It performs a same-origin `GET /api/v1/programs/{id}` with the current browser session and `cache: no-store`; **it never supplies tenant IDs, principal IDs, role claims, signed identity envelopes or shared signing keys**.

The existing server-only authenticator and PostgreSQL read repository enforce the actual tenant, legal entity, scope and record authorization. The browser ID is a requested locator, not a permission grant.

The response is checked for matching ID, a nonempty name, revision and updated time. Only approved metadata populates the Program header. Compliance values, issues, evidence, assessments, owner, action buttons and organization scope remain unavailable until their own authorized, source-versioned read models exist.

Status handling is explicit: `401` sign-in required, `403` access denied, `404` unavailable/absent Program, other errors unavailable with retry. A stale fetch is aborted on Program changes; no sample data is inserted.

## Activation dependencies

The v2 API defaults to catalog-only. The route exists only with `CLEARSIGHT_V2_PROGRAM_READ_ENABLED=true`, a compatible isolated database, TLS-verified PostgreSQL and upstream trusted signed identities. The same-origin edge must strip identity signature headers from external requests and issue fresh signed actor context on authenticated requests.

**Not yet complete:** Program picker, authenticated user session UX, full v1 migration, evidence-backed compliance status, role-scoped operational panels and reports. No desktop/browser data binding is considered production-ready without those checks.
