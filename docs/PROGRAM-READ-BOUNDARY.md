# Program read boundary

This tranche ports the **v1 actor model and signed identity authenticator**, without development-header impersonation or demo credentials.

The reusable `programread.Handler` is intentionally **not registered** with the running catalog server until a real, actor-scoped persistence repository and trusted identity-signing edge are configured. No new tenant data route or mock Program is exposed.

## Contract

- Authenticator verifies timestamp, HMAC method/path and expiry using a nontrivial upstream shared secret. Headers alone cannot establish identity.
- Valid PERSON actor must carry `OVERSIGHT_READ` globally or for the exact department. Wildcard legal entities are rejected until explicitly narrowed.
- The repository must query with tenant, principal, legal entity and department scope, never fetch tenant-wide data then client-filter it.
- Handler independently rejects repository records whose ID, tenant, legal entity or department grant differs from verified actor context.
- Unconfigured identity/repository or repository corruption fails closed. `404` for absent Program, `401` missing/invalid identity, `403` insufficient authority, `503` unavailable services or invalid returned scope.
- Only Program metadata is returned. Restricted Matters, composite scores, evidence and activity require the v1 actor-visible projection and tested authorization.
- No mutable route may be enabled before current authority route, maker/checker and audit regressions.

## Reused originals

- `CloudSpaceLab/clearsight-grc/internal/identity/model.go`
- `CloudSpaceLab/clearsight-grc/internal/identity/authenticator.go` (signed portion only; omits `DevelopmentAuthenticator`)
- `CloudSpaceLab/clearsight-grc/internal/identity/department_access_test.go`
- `CloudSpaceLab/clearsight-grc/internal/identity/authenticator_test.go` (signed portion)

## Next adapter

Implement a PostgreSQL scoped `Repository.GetVisible` using the v1 Program aggregate and `ProgramsForPrincipal`. Use a verified actor from the production edge; apply source-revision consistency and cross-role visibility tests. Only then register `GET /api/v1/programs/{id}` and wire its loading/error states to the approved Program Workspace.
