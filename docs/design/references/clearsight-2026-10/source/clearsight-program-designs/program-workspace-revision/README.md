# Program workspace revision

See [IMPLEMENTATION-MAP.md](IMPLEMENTATION-MAP.md) for the prototype-to-app component/API mapping, verified v2 support, v1 reuse candidates and proposed implementation sequence. This map does not implement app changes.

Open http://localhost:4178/docs/design/references/clearsight-2026-10/source/clearsight-program-designs/program-workspace-revision/ while the repository-root static server is running (`python -m http.server 4178 --bind 127.0.0.1`).

This separate interactive design reference preserves archived source and the current Home navigation. It uses the original Program reference layout, the unified specification and shared Home theme styles. The unified specification proposes a different global navigation; this revision deliberately retains Home, Frameworks, Programs, Forms, Vendors, Risk & Losses, Privacy and Reports as requested.

## Files
- index.html: revised reference composition; Overview, Issues, Assessment, Doc & Activity.
- revision.css: responsive layout and shared-theme presentation, including bounded period controls and stacked mobile content.
- revision.js: local interactions, dialogs, keyboard tabs, file upload/download and browser persistence.
- model.js: transactional sample workflows and validation.
- model.test.cjs: workflow, independent review, versioning and persistence tests.
- `program-workspace.png` and `program-workspace-mobile.png`: full-page visual references for the prototype revision.

## Walkthrough
Choose Contributor to create an assessment, select its type, answer questions, save draft and submit. Choose Reviewer for per-question outcomes and rationale. Configuration proposals need separate review before becoming effective. Program owner can edit Program settings. Issues require resolution evidence and independent closure verification. Documents support local upload, download and separate review. Activity shows local events and filtered JSON export. The five top-level tabs are Overview, Issues, Assessment, Documents and Activity. Reset sample workspace clears this prototype's records only.

## Contracts and limits
The v1 form contract and evidence response-assessment model inform immutable response revisions, per-field outcome/rationale and independent reviewer decisions. The v2 Program read models inform Program, issue and evidence relationships. Prototype statuses are presentation states requiring final mapping to service contracts. This is a local browser simulator, without production authentication, API writes, real scheduled execution or compliance approval. Original coverage graphics remain illustrative reference figures, not customer data or calculated compliance. Other module navigation opens reference guidance; it does not implement those modules.

## Validation
Run `node --test docs/design/references/clearsight-2026-10/source/clearsight-program-designs/program-workspace-revision/model.test.cjs` and `node --check docs/design/references/clearsight-2026-10/source/clearsight-program-designs/program-workspace-revision/revision.js`.

Built-in browser verification: all four tabs in light and dark at the actual mobile viewport of 434 CSS px had no document overflow. At the restored desktop viewport of 1288 CSS px, the header controls remained contained and keyboard ArrowRight moved Assessment to Doc & Activity. Native viewport requests did not produce exact requested dimensions; a full exact-breakpoint matrix remains unverified. Earlier local workflow checks covered draft persistence, submission/review, schedule approval, document upload/download and independent issue closure. Sample data persists per browser origin; localhost and 127.0.0.1 are separate stores.


## Template alignment and location
This prototype lives beside its source template under `clearsight-program-designs/program-workspace-revision/`. The archived `../program-workspace-preview.html` and `../program-workspace-design-notes.md` remain unchanged. Original embedded styles and Overview structure are retained. Revised registers use the source record-row pattern; assessment questions/review/configuration extend the selected record below its list. Documents and activity follow the source register composition. Prototype role controls sit in a collapsed disclosure instead of dominating the Program header.

This prototype remains a separate browser simulator; its local workflows and sample actors are not production app behavior. The main app keeps the same five Program tabs and Home-compatible navigation while using backend records and authority. The former `/docs/design/program-workspace-revision/` URL is retired; use this folder's URL.

### Verification after relocation and template alignment
All moved local assets resolved on disk; original template inline style blocks compare equal. The built-in browser opened the new URL and checked all four tabs in light/dark at actual width 434 CSS px without document overflow. Desktop width 1288 CSS px had no overflow; Enter opened New assessment, Escape closed it, and focus returned to its trigger. Screenshots in this folder reflect the relocated version. All 11 model tests passed after the move. The app implementation and archived template were not edited.


## Layout preference correction
Restored the previously reviewed side-by-side Assessment list/detail and Documents/Activity panels at desktop widths. Narrow viewports retain responsive stacking. This supersedes the stacked-register composition described above. The organized source-folder location and all existing demo records/workflows remain unchanged.

## Available Programs directory
The prototype now starts at `#programs` when no hash is supplied. Its Programs sidebar item and workspace breadcrumb return to this directory. Search by code/name, status filtering and Clear filters operate on the one existing sample Program; Open returns to Overview and the five reviewed tabs. This is local sample navigation, not an authorized API list. The app's Program navigation remains backend-scoped and retains the existing Home navigation.

Built-in browser checks: unmatched search and Retired status show the empty state; ISMS-001 plus Active returns the sample; keyboard Open reaches the four-tab workspace, breadcrumb returns to directory, existing November demo assessment remains present. Light/dark mobile at 390 CSS px had no horizontal overflow. Full-page proofs: program-directory.png and program-directory-mobile.png.

## Documents and Activity separation — 10 November 2026
Five top-level tabs: Overview, Issues, Assessment, Documents, Activity. Documents has name/assessment search, review-state filter, record/version/submission metadata and existing independent review workflow. Activity has actor/record/event search, event-kind filter, UTC timestamps, event references and filtered JSON export. Legacy #doc-activity bookmarks open Documents; document drills now target Documents, history shortcut targets Activity. Existing assessment lifecycle and source prototype remain unchanged. This is a browser-only prototype: resettable local history is not a production audit trail; document submission/review does not establish compliance. No retention or classification policy is fabricated. App implementation is unchanged.
