# Framework starter → Forms → Program adoption

Implementation and local demo acceptance, 16 November 2026. Reviewer: Codex. This is local development verification, not production content approval or a claim of complete regulatory coverage.

## Implemented boundary

Backend services, APIs, migrations and backend tests are in `C:/Projects/clearsight-grc`. Frontend work is in this v2 worktree. Existing Home navigation, published-edition adoption and whole-form questionnaire integration remain available. Archived prototype sources were preserved. Pre-existing Program activation work was not replaced.

The existing adoption aggregate now supports a starter-template subtype. Native Forms owns the questionnaire and its immutable revisions; scoped starter requirements link to an exact questionnaire ID, revision and section ID. Adoption saves its own source snapshot, requirement decisions, wording, owner and respondent units. Approval creates native Program requirements and versioned question-group links in the same transaction as the adoption event and outbox record.

## Inventory and installed starter content

Existing identities were reused. These are original bank starter prompts, not reproduced licensed standards or verified complete framework coverage.

| Existing template code | Edition | Requirements / groups | Questions | Focus |
| --- | --- | ---: | ---: | --- |
| ISO_27001_2022 | ISO/IEC 27001:2022 | 5 | 15 | Scope, risk treatment, controls, improvement, privileged access |
| NIST_CSF_2 | CSF 2.0, 2024 | 6 | 18 | Govern, Identify, Protect, Detect, Respond, Recover |
| PCI_DSS_4_0_1 | 4.0.1, 2024 | 4 | 12 | Payment scope, protection, testing, validation |
| GDPR_2016_679 | Regulation 2016/679 | 4 | 12 | Processing, rights, privacy risk, processors/transfers/incidents |
| NDPA_2023 | Nigeria Data Protection Act 2023 | 4 | 12 | Processing, rights, security, accountability |
| UK_DPA_2018 | Data Protection Act 2018 | 4 | 12 | UK applicability, rights, safeguards, incidents/suppliers |
| DORA_2022_2554 | Regulation 2022/2554 | 4 | 12 | ICT risk, incidents, testing, third parties |
| SOC_2 | 2017 TSC, revised points of focus 2022 | 4 | 12 | Service scope, governance, operations, examination evidence |

Total: eight native questionnaires, 35 default requirements/groups, 105 questions per legal entity. Each group contains a review-date question, an explanation/exception question and an evidence-file request. A separate bank-only SOC 2 requirement was added through the app during maintenance testing; it reuses the Service and report scope group and does not change the global four-requirement starter.

ISO includes **Review privileged digital banking access** → **Privileged access review** → **When was the last privileged access review completed?** and **Upload the signed privileged access review record.** These use native date and file fields.

## Installation and maintenance

Use the v1 repository's normal checksum-tracked migration runner, `bash deploy/scripts/migrate.sh migrations`, with its configured `DATABASE_URL` and PostgreSQL tooling. New migrations are 000144 (starter workflow), 000145 (scoped maintenance) and 000146 (source metadata corrections). Do not rerun old migrations manually or change recorded checksums.

For an already migrated installation, the supported idempotent repair/backfill is `SELECT backfill_framework_starter_forms();`, or pass a legal-entity UUID to limit it. The new-entity trigger installs missing packs automatically. Existing native Forms and scoped links are not overwritten. New questionnaires remain DRAFT; no approval is fabricated. Migration downgrade refuses destructive removal of adopted records, and source metadata corrections are intentionally retained.

Authorized staff use Frameworks → open starter → **Add starter requirement** or **Manage bank template & question link**. Set wording, load a native Forms revision, choose its actual question group and record a change reason. Maintenance is scoped to the bank and audited with optimistic version checks; saved Program copies remain unchanged. The management form opens the bank source, not the selected Program's tailored wording.

In Forms → Create form → Open draft, staff find and edit the native starter questionnaire. Send it for independent review; the assigned reviewer approves and activates it. A published form can be opened to create a new draft version. Existing links never follow that revision automatically. Staff explicitly repoint future source links or choose **Use current bank question link** for an editable Program draft. Submit/approval revalidates the actual version and group server-side.

## Live demo retained in the copied database

Browser: http://127.0.0.1:5192/?screen=frameworks ; separate v1 backend on 127.0.0.1:8092 with command authorization enforced.

1. Created `DB-ISMS-01 · Digital Banking Information Security` through the app (ID `01a1dbd2-7d67-7512-9e2e-bfe7df3f26d4`). Scope covers mobile/internet banking, supporting systems, customer information and critical service providers.
2. Opened ISO starter and the exact Privileged access review question group.
3. Program Owner submitted the native ISO questionnaire; separate Internal Auditor approved/activated revision 3. All five source links were explicitly pinned to that approved version.
4. Tailored privileged access to quarterly review of mobile/internet banking administrators; retained the signed service-owner approval requirement and recorded the reason. Flagged shared monitoring/audit coverage for applicability review with a reason.
5. Saved and reopened the adoption draft. Wording, decisions and exact group links persisted. Selected Information Security and Operations respondent units.
6. Program Owner submitted; assigned CRO independently approved the demo adoption. Database reconciliation: ACTIVE adoption, five linked native requirements (four APPROVED and one DRAFT pending applicability follow-up), five question links at version 3, two respondent units, distinct maker and reviewer.
7. Opened the same ISO starter for existing `CBN-CLOUD-ENC-01`. It began with original wording. Saved and reopened its independent DRAFT with zero Program edits. Digital Banking's tailored copy and the source remained unchanged.
8. Created ISO native questionnaire DRAFT revision 4 through Forms. The active ISO adoption and cloud draft still point to revision 3. Revision history is DRAFT 1 → PENDING_APPROVAL 2 → ACTIVE 3 → DRAFT 4.
9. Repeated native Forms approval and Program adoption with GDPR for `CBN-CLOUD-ENC-01`. Internal Auditor activated questionnaire 3; four explicit source links were saved; Program Owner drafted/submitted and CRO approved. Database: ACTIVE, four requirement links at version 3, two respondent units, independent maker/checker. Opened the exact Security and privacy risk group in native Forms.
10. Added bank-specific SOC 2 supplier report boundary review through the app, loaded revision 1 groups and saved its group link. Reopened View questions successfully. Its draft questionnaire remains subject to independent approval before adoption submission.

All approvals above are **demo approvals in the copied development database**. No production release, official standards approval or compliance conclusion is implied. The new Program remains a draft Program; activation is a separate existing workflow.

## Verification checklist

- [x] Fresh database migration run; forward migrations through 000146 applied.
- [x] Existing copied database upgrade preserved familiar Programs, requirements and existing form history.
- [x] Seed/backfill reruns preserve staff edits and saved adoptions and create no duplicate packs/groups/links.
- [x] Real PostgreSQL tests validate all eight native questionnaires and 35 group links; cross-tenant reads and invalid group writes fail closed.
- [x] Atomic adoption event/projection and native requirement creation; existing published-edition adoption regression passes.
- [x] Approval requires a different actor and current authority; tenant/legal-entity identity is server-bound.
- [x] ISO full live adoption, source isolation, second Program draft, newer Forms version pinning.
- [x] GDPR second-framework live adoption and exact native Forms group navigation.
- [x] Bank-defined requirement creation and audited source maintenance through UI and PostgreSQL tests.
- [x] Required tailoring rationale, filter empty state, keyboard requirement selection, Escape/return focus, explicit Tab/Shift+Tab modal wrapping.
- [x] All three wizard steps measured at actual 1440, 1280, 1024, 768, 390 and 320px widths in light and dark; no horizontal overflow. An initial capture affected the reference tab instead of the app; those measurements were rejected and rerun against the verified app width.
- [x] Desktop/tablet/mobile question dialogs, source management and Program tailoring inspected; full-page screenshot evidence retained in `output/screenshots/framework-starter-workflow/`.
- [x] 26 relevant frontend model checks, TypeScript and production Vite build passed. Tagged and non-tagged v1 continuity, frameworkcatalog and httpapi package tests passed; uncached real PostgreSQL starter and existing published-adoption tests passed.
- [x] The reported `program_requirements_modality_check` failure is fixed: approved starter copies use native MUST modality. The regression runs through PostgreSQL. Unrelated save errors no longer appear inside View questions, and SQL internals are not exposed to the user.

## Design references and deliberate adaptations

Reviewed `framework-adoption-wizard/README.md`, `ACCEPTANCE.md`, `index.source.html`, generated `index.html`, `library.html`, `wizard.css`, `wizard.js`, `model.js`, `iso-model.js`, `iso-wizard.js`, `reference-shell.js`, `reference.css`, `source-manifest.json` and existing evidence. Parent framework-library/adoption references and unified design-system README/specification informed shell, colors and cards.

Retained the three-step order, Program context, requirement list/inspector, filter, decision controls, linked-question dialog, monitoring review, assignments, summary and source card. Desktop uses separate source-aligned cards; mobile uses requirement selection instead of a long list. Actual backend states and counts replace sample figures. Native shell/navigation were preserved; mobile icon buttons now retain accessible names.

Significant differences: applicability is a review flag rather than an automatically approved exclusion; ownership is read from the Program's saved responsibility rather than granting authority in a picker; Forms and adoption each use their real independent review flow; source maintenance adds audited controls absent from the sample. Per-question expiry/external API validation remain explicitly unavailable because no supported configuration contract exists here. Respondent choices record intended units and do not dispatch assessments. These differences are intentional and this is not a claim of pixel-identical or complete production acceptance.

## Content review still required

Detailed ISO/PCI/SOC mapping requires licensed source review and the bank's content approval. The six other questionnaires remain draft pending their own review; only ISO/GDPR were independently activated in this demo. Starter adoption does not establish framework compliance, and applicability flags do not grant exemptions. Full assessment dispatch, evidence collection and subsequent compliance conclusions are separate existing workflows, outside this starter-adoption acceptance.

Authoritative source metadata: ISO https://www.iso.org/standard/27001 ; NIST https://nvlpubs.nist.gov/nistpubs/CSWP/NIST.CSWP.29.pdf ; PCI https://www.pcisecuritystandards.org/document_library/ ; AICPA https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022 ; NDPA https://ndpc.gov.ng/wp-content/uploads/2024/03/Nigeria_Data_Protection_Act_2023.pdf ; UK https://www.legislation.gov.uk/ukpga/2018/12/contents ; GDPR https://eur-lex.europa.eu/eli/reg/2016/679/oj ; DORA https://eur-lex.europa.eu/eli/reg/2022/2554/oj . Verified citations are kept distinct from broad assessment areas awaiting detailed mapping review.
