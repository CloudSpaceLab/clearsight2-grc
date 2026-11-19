# Approved milestone commit plan

Prepared 16 November 2026 and subsequently approved by the user for local commits on the existing branches. The messages below define the milestone breakdown. Commit hashes are reported in the completion handoff. No push or PR is authorized.

## Branches and scope

- v1 backend: retain `0y3/Me/frameworks-forms-backend` in `C:/Projects/clearsight-grc`.
- v2 frontend: retain the intended target `0y3/Me/clearsight-ui-v1-integration`. The current implementation worktree is detached at `86bdf57`, which is also the current tip of that branch in `C:/Projects/clearsight2-grc`. Before committing, align the work safely with that branch without overwriting changes in its checked-out working copy. Do not force-update a branch checked out in another worktree.
- No push or PR is included in the commit approval. Database rows created during the local demo are not Git contents.

## v1 milestone 1 — Starter data and database links

```text
feat(frameworks): seed versioned starter requirements and Forms question groups

Complete the eight existing starter templates in place with 35 requirements,
35 questionnaire groups and 105 native Forms questions per legal entity.
Include the ISO privileged access date and signed-record evidence example.

Add tenant/entity-scoped requirement-to-form-version/group links, canonical
Program adoption snapshots and native adopted requirement question links.
Install missing draft questionnaires through an idempotent backfill and a
new-entity trigger, preserving staff edits and existing adoptions.

Add audited bank-specific requirement extensions and correct authoritative
source metadata without rewriting immutable Forms revisions.

New source questionnaires remain drafts pending independent review.
Starter material is not verified complete framework coverage.
```

Files: migrations `000144_framework_starter_workflow`, `000145_framework_starter_maintenance`, `000146_framework_starter_provenance`, each up/down.

## v1 milestone 2 — Governed adoption and maintenance APIs

```text
feat(frameworks): persist Program-specific starter adoptions through v1

Extend the existing Program adoption workflow with starter drafts, scoped
requirement decisions, tailored wording and exact questionnaire group pins.
Validate current native Forms approval, Program ownership and respondent
units using verified identity and existing authority routes.

Require independent adoption approval and atomically write the adoption,
native Program requirements, question links, audit event and outbox.
Use the supported MUST requirement modality to fix the observed PostgreSQL
constraint failure; keep applicability-review copies in draft.

Expose scoped starter maintenance and respondent-unit search APIs, update
the runtime API contract, and prevent raw database errors from reaching UI.
Preserve the published-edition adoption and reconstruction workflows.

Test canonical snapshots, forged/cross-tenant inputs, maker-checker review,
source isolation, backfill reruns, bank extensions and version pinning.
```

Files: new `internal/continuity/framework_starter.go` and its unit/PostgreSQL tests; continuity memory/postgres/replay/adoption integration; new `internal/frameworkcatalog/starter_workflow_postgres.go`; new HTTP starter handlers/tests; existing adoption HTTP handler, route registry and `api/runtime.openapi.json`.

## v1 milestone 3 — Operations and local artifacts

```text
docs(frameworks): document starter deployment and governed maintenance

Document checksum-tracked migrations, safe scoped backfill, API authority,
independent Forms review, adoption materialization and version pin behavior.
Record PostgreSQL validation and distinguish demo decisions from production
content approval and complete framework coverage.

Ignore the local development process directory so binaries, logs and demo
session secrets cannot be accidentally committed.
```

Files: `docs/framework-starter-workflow.md`, `.gitignore`.

## v2 milestone 1 — Interactive design reference

```text
feat(design): add the framework adoption wizard reference

Add the separate interactive three-step adoption prototype, ISO lifecycle
example, portable preview build, model tests and acceptance notes.
Preserve archived Framework Library and Adoption references.

Keep sample decisions and browser-only prototype storage distinct from
native application workflows and real backend approvals.
```

Files: the new `docs/design/references/clearsight-2026-10/source/clearsight-framework-designs/framework-adoption-wizard/` folder. Include only relevant prototype evidence; do not alter parent archived sources.

## v2 milestone 2 — Earlier Program activation work

```text
feat(programs): add governed Program review and activation

Expose stored scope, owner, approval authority and approved requirements in
a review dialog backed by the existing v1 transition contract.
Explain activation blockers and recheck the current Program version and
authority immediately before submission.

Require a rationale, protect an in-flight review from dismissal and refresh
the workspace after a verified transition. Explain that creating a Program
saves a draft rather than submitting an approval request.

Add activation model checks and retain the local activation demo evidence.
```

This is earlier uncommitted work already present before the starter implementation; keep it as a distinct milestone. Files: `ProgramActivation.tsx`, `programActivationModel.ts`, its nodecheck, `CreateProgramDialog.tsx`, `RecordDialog.tsx`, the activation-only import/render hunks in `ProgramWorkspace.tsx`, the activation CSS hunk, `docs/PROGRAM-ACTIVATION-ACCEPTANCE.md`, selected Program activation screenshots.

## v2 milestone 3 — Native Forms integration

```text
feat(forms): author starter questionnaires and open pinned question groups

Open native starter questionnaires in the existing simple authoring flow
while preserving section guidance, presentation and evidence restrictions.
Support independent review and opening an active form as a new draft.
Continue rejecting unsupported advanced settings instead of dropping them.

Resolve Framework and Program links to an exact questionnaire revision and
group after authentication, and clear stale form parameters on navigation.
Preserve existing Forms navigation and normalize legacy source punctuation
for display without changing saved revision content.

Extend Forms model regression coverage for native starter round trips.
```

Files: `AssessmentWorkspace.tsx`, `SimpleFormAuthoring.tsx`, `simpleFormModel.ts`, `simple-form.nodecheck.mjs`, `App.tsx` form-query navigation hunk. Keep the wizard dirty-state guard with milestone 4 if the App diff includes both concerns.

## v2 milestone 4 — Main-app adoption wizard

```text
feat(frameworks): connect the three-step starter adoption wizard to v1

Review requirements in the selected Program scope, inspect exact linked
questions, keep or tailor wording, and flag applicability with a reason.
Persist drafts and submit independent adoption decisions through v1.

Review actual Forms validation and approval status, read the saved Program
owner, and select real respondent departments without dispatching requests.
Add authorized bank requirement and questionnaire group-link maintenance.

Preserve originals and pinned versions when returning to default wording;
require an explicit action to use newer source question links.
Show saved adoption wording and group links inside the Program workspace.

Match the reference card/list composition, add requirement filters,
responsive selection, keyboard navigation, focus containment and dirty guards.
Retain accessible names in the mobile shell and put Vite cache in the ignored
local directory for worktree development.
```

Files: new `FrameworkStarterWizard.tsx`, `frameworkStarterWizard.css`, `starterAdoptionModel.ts`, `framework-starter.nodecheck.mjs`, `ProgramFrameworkSummary.tsx`; `V1FrameworkLibrary.tsx`; summary-only ProgramWorkspace/program.css hunks; `DesignShell.tsx`; wizard dirty-state App integration; `web/vite.config.ts` cache directory.

## v2 milestone 5 — Acceptance and retained evidence

```text
docs(frameworks): record starter adoption acceptance and live demo results

Inventory all eight starter packs and document upgrade/backfill, staff
maintenance, scoped wording, independent review and configured version pins.
Record ISO adoption for Digital Banking, a second Program's unchanged draft,
newer Forms version isolation, GDPR adoption and bank source maintenance.

Retain curated full-page desktop, tablet and mobile evidence, test results,
prototype references, deliberate adaptations and content-review limits.
Distinguish local demo approval from production content approval.
```

Files: `docs/FRAMEWORK-STARTER-WORKFLOW-ACCEPTANCE.md`, this commit proposal, selected final screenshots and their evidence README. Exclude intermediate failed/mislabelled screenshots and adjust the evidence index to the retained set.

## Validation to accompany the commits

- 26 relevant frontend model checks; TypeScript; production Vite build with configLoader runner.
- v1 continuity, frameworkcatalog and httpapi tests, with and without postgres tags.
- Uncached real PostgreSQL starter seed/adoption/isolation/version-pinning test and existing published-edition adoption regression.
- Live ISO/GDPR adoption, Forms independent approval, draft reopen, source isolation and explicit staff group maintenance.
- All three wizard steps at actual 1440/1280/1024/768/390/320px, light/dark; modal validation, keyboard selection, focus wrapping and return.

The earlier activation milestone carries its own recorded checks; run its focused tests again before committing that milestone. Run the selected checks and inspect staged diffs during commit preparation after approval.

## Excluded from this proposal

- `deploy/scripts/seed-demo-foundation.sh`: line-ending-only working-tree change.
- Existing untracked `scripts/prepare_nist_csf.py` and `scripts/test_prepare_nist_csf.py`: earlier offline NIST candidate tooling, not part of this starter workflow. Preserve them, do not delete or silently add them.
- Local environment files, copied databases, credentials/session keys, binaries, logs, node_modules, build/cache output.
- Superseded or incorrectly targeted screenshot attempts. Keep representative verified evidence, not every inspection artifact.

## Known limits

Starter content is not complete official framework coverage. Detailed ISO/PCI/SOC mapping still needs licensed-source/content review. Six questionnaires remain draft; ISO and GDPR activation/approval in the copied database are demos. Per-question expiry/API policy configuration, automatic respondent dispatch and Program activation are distinct workflows; the starter wizard does not imply those actions occurred.
