# Program Issues and Needs attention — principal-visible current records

Source: approved `clearsight-program-designs/program-workspace-preview.html` (Overview attention block and Issues tab).

## Backend contract

`GET /api/v1/programs/{id}/issues?limit=25&cursor=...` reuses the v1 `matters` and `matter_links` storage and the **same** principal access predicate already used for the private Program Matter count. It introduces no Issue table, alternate permission definition, new Matter workflow, or client-side filtering of tenant-wide records.

The query first authorizes Program, tenant, legal entity and exact active department scope via the signed actor. It then reads current open Matters (`CLOSED`/`CANCELLED` excluded) under the same read-only repeatable-read transaction. The correlated `EXISTS` relationship prevents duplicate links from inflating a list or count.

The shared SQL visibility condition accepts tenant-internal/public Matters and restricted Matters only for explicitly granted principals with a structurally valid, nonempty string allow-list. Malformed scope metadata fails closed. Pagination is keyset-ordered by `updated_at` and Matter ID with a maximum of 50 records.

Only ID, reference, title, recorded Matter type/status/priority and last update are returned. Raw facts, allowed-principal lists, Matter scopes, confidential summaries, supporting evidence, actor identities, responses and commands remain private.

## Approved UI mapping

- **Overview / Needs attention:** first three current, principal-visible open Matters from the same bounded feed. Selecting `View issues` opens the Issues tab, not an invented issue-detail route.
- **Issues tab:** the same feed with bounded Previous/Next navigation and sign-in, denied, stale, loading and unavailable states.
- **Open gaps metric:** remains **unavailable**. Open Matters and canonical requirements with gaps are not equivalent populations, so the feed must not be used to manufacture the gaps count.
- **Reporting period:** deliberately not applied to current open-Matter posture. Historical issue activity requires a separate as-of event read.

The layout reuses the existing approved Program components/styles, not an independent dashboard or duplicate listing component. Browser requests are same-origin and carry no actor headers, tenant selectors or client grants.

## Acceptance and blockers

Synthetic PostgreSQL and complete pinned-v1 schema tests verify explicit principal access, tenant/entity/department boundaries, malformed restricted scopes, duplicate links, open lifecycle, paging and opaque denial. Browser tests reject closed, invalid or cross-Program results.

The trusted production SSO edge, historical Matter projection, actor-visible evidence assessments, source-to-report reconciliation and authorized issue workflow actions remain separate release gates. This tranche does not publish a compliance percentage.
