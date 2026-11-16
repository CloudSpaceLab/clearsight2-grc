# Framework adoption wizard prototype

Status: separate interactive design prototype. Main-app implementation is not authorized by this artifact. Backend and frontend application code are unchanged.

Open `library.html`, select NIST CSF 2.0 and choose **Adopt framework**. That opens `index.html?entry=library` at step 1 while preserving any local draft. `index.html` is now self-contained: its CSS and classic JavaScript are embedded so it does not depend on file-protocol module imports or a local server. Browser storage availability still depends on browser policy.

For maintenance, edit `index.source.html`, `model.js`, `wizard.js`, `reference-shell.js` or `wizard.css`, then run `node build-preview.mjs` to regenerate the portable `index.html`. Do not edit only the generated HTML and leave its sources behind.

The Program activation demonstrated in the main app is a separate workflow backed by v1 and the copied database. This standalone framework-adoption prototype does not query that database or automatically display the real `FID-ISMS-001` Program, its approved requirement or the CRO's actual activation decision.

## Agreed workflow

1. Review default requirements and the linked groups of questions within a **Questionnaire**. Adopt the wording, customize only the Program copy, or record an exclusion reason.
2. Review answer expiry and data quality settings for each question group. Smart questions show configurable sample connections and matching, mismatched and unavailable validation results.
3. Choose a Program Owner and one or more respondent departments/units. Review the proposal before preparing the local demo receipt.

Questionnaire is retained. The sample questionnaire is **Cloud security assessment · Version 1**. Each requirement points to a section of that questionnaire. Viewing its questions does not collect assessment answers. The prototype does not yet offer changing the entire questionnaire or editing the source form definition.

Requirement changes are specific to the selected Program. The original template wording is immutable and remains visible in the customization dialog and proposal review. Question policy changes are also kept in the Program draft rather than changing the source questionnaire.

## Design references and intentional changes

- `../framework-library.html` and `../framework-adoption.html` supply the library, shell, panels, edition inspector, source card and typography. Their hashes are retained in `source-manifest.json`; archived files are unchanged.
- The unified design system README and specification under `../../clearsight-unified-design-system-v1/clearsight-design-system/` were reviewed. Semantic colors mirror the existing v2 theme.
- The existing Home/Frameworks/Programs/Forms/Vendors/Risk & Losses/Privacy/Reports navigation is retained. Scope, global search, notifications and unrelated navigation are not connected to production services in this prototype.
- The new three-step wizard replaces the reference's single long adoption screen. It introduces requirement decisions, settings review and respondent assignments as requested.
- The extra prototype banner was removed following review. The reference's compact **Illustrative design data** badge is retained, with an appearance control in the common header.
- Requirement/question/Program content and people are labelled sample data. NIST identifiers are illustrative reference associations; bank requirement wording and question policies are not official NIST requirements or an approved catalog release.

## Existing app inspection

| Existing capability | Observed source | Implication for implementation |
| --- | --- | --- |
| v2 Framework Library and adoption view | `web/src/features/frameworks/V1FrameworkLibrary.tsx`, `FrameworkAdoption.tsx` | Reuse the authenticated app shell, routes and scope. |
| Adoption drafts and independent adoption decisions | v1 `internal/continuity/program_framework_adoption.go` | Extend the current adoption model rather than creating a second workflow. |
| A single questionnaire/form-version link per adoption | v1 `internal/monitoring/framework_questionnaire.go`; v2 `FrameworkQuestionnaire.tsx` | Existing selection can be reused; per-requirement question-group associations require additional work. |
| Starter reference areas with an assessment prompt | v1 `internal/frameworkcatalog/reference_templates.go` | Current starter metadata does not provide this complete library of default requirements and linked question groups. |
| Separate Program requirement proposals and review | v1 `internal/continuity/program_requirement_review*.go`; v2 `CreateRequirement.tsx`, `RequirementReviewPanel.tsx` | Program-specific copies must retain source identity/version and use the existing review process. |
| Evidence collection expiry/renewal | v1 `internal/monitoring/collection_cycle.go`, `collection_consumer.go` | Collection-level expiry exists; do not assume that this provides per-question validity and API quality policies. |

Production work still needs governed default requirement/question associations, Program-specific adoption configuration, supported per-question policies, approved connector/rule contracts, and department assignment routing. Owner selection must not grant permissions. Draft saving, publication, assessment dispatch, external API validation and independent approval must be tested through v1 before any production completion claim.

## Local state and limitations

Drafts are kept only in the browser under `clearsight.framework-adoption-wizard.v1`, separately for the two sample Programs. **Save draft** persists the selected Program. Unsaved work is not guaranteed to survive a reload. The final action creates a local **demo proposal** only; no reviewer is notified and nothing is approved. No backend requests or external API calls are made.

The library's adoption demonstration is enabled for NIST only. Other catalog entries are reference examples. Industry filtering remains disabled because reviewed classifications are unavailable; no draft industry classifications were added.

## Verification

Run `node --test model.test.mjs` from this folder. Eleven model tests cover decision gates, Program isolation, immutable originals, exclusions, validity bounds, smart-question configuration, required assignments, proposal snapshots and draft parsing.

See `ACCEPTANCE.md` for interaction checks and outstanding responsive work. Screenshots in `evidence/` are full-page captures unless a filename explicitly states otherwise. Screenshots from before the banner review show an earlier iteration; `template-aligned-questionnaire.jpg` is the updated design after that correction.
