# Send Form and Sent Forms prototype

Open http://127.0.0.1:5179/index.html. This separate browser-only design follows the approved assessment workspace's shell, tabs and context panels. The v1 DistributionComposer.tsx and formsDistributionApi.ts inform the pinned template revision, scoped subject, deadline/link expiry, verification policy, estimated time and To/CC semantics. Program-scoped sample employees are the initial audience. The existing Forms acceptance checklist and unified specification remain design references.

Choose an active revision, enter a request title and purpose, add a To recipient and optional CC, then review and send a sample request. Sent forms offers search and response-status filtering. The detail panel distinguishes recipient delivery, response and review. A seeded submitted response demonstrates the handoff context. A seeded overdue request demonstrates deadline status. New requests persist locally after refresh.

Email, link issuance, external audience delivery, reminders, live role enforcement and real response review are outside this preview. No request is actually delivered. The existing app is unchanged.

Run `node --test model.test.cjs` and `node --check distribution.js`.
