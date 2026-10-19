# Program Workspace — authorized metadata read

## Current behavior

The approved Program Workspace layout remains the source of truth. The live metadata adapter is isolated in `web/src/features/programs/programApi.ts` and is intentionally **not** a client-side authorization policy.

An authorized deep link has the form:

```text
/?screen=programs&program_id=<existing-program-uuid>
```

Only a syntactically valid UUID triggers a request to `GET /api/v1/programs/{id}`. The browser uses same-origin credentials, without injecting tenant, principal, department, HMAC signatures or signing secrets. **A trusted private ingress must authenticate the session and supply a server-verified identity envelope**; without it, no private Program data is available.

The view renders actual Program **name, source revision and updated date** only on a validated successful response. It intentionally leaves scope labels, metrics, requirements, evidence, issues, assessment counts and authorizer actions unavailable. No catalog data or prototype value is substituted.

| API/transport result | UI |
| --- | --- |
| 200 with valid exact-ID record | Program name and source revision |
| 401 | Sign in |
| 403 | Access denied |
| 404 | Program not found (indistinguishable from outside-tenant) |
| Other HTTP or transport failure | Unavailable; explicit retry |
| Malformed success response | Unavailable; no data |
| Missing or invalid link | No request; empty or invalid-link state |

Abort the previous request when the Program ID or navigation changes; stale network results never replace the current record.

## Security boundaries

- Browsers **never** sign authority envelopes or supply tenant IDs as query parameters.
- The existing server Program route remains off unless database, HMAC verifier, secure transport and schema startup checks succeed.
- A fetched metadata record cannot imply approved compliance, a particular tenant authorization scope, or a legal outcome.
- Operational release requires production SSO/proxy configuration, header stripping, session revocation, real v1 migrations and actor-scoped E2E acceptance.
- The current UI has no Program list endpoint and makes no claim of Program discovery; selection by authenticated list is the next separate feature.

## Checks

```bash
cd web
npm ci
npm run typecheck
npm run test:program-api
npm run build
```

The test covers no-fetch on malformed UUID, authenticated request options, 401/403/404/5xx separation, malformed 200 bodies, cross-ID body mismatch and network failure.
