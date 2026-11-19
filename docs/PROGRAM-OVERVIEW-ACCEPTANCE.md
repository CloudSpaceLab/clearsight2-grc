# Program Overview implementation — 18 November 2026

Reference: `docs/design/references/clearsight-2026-10/source/clearsight-program-designs/program-workspace-revision/index.html#overview` and its revision CSS/JS. Unified design-system README and specification reviewed. Archived sources remain unchanged. Existing Home navigation and application shell are preserved.

## Delivered

- [x] Compact Program header with framework, legal entity, jurisdiction, status and resolved accountable owner. Technical revision strings and repeated active-state panel removed from the active Program overview; draft/paused activation controls retained.
- [x] Four current-record counters with working drills. Unknown values remain unavailable; period selection does not recalculate current posture.
- [x] Segmented evidence-review distribution, reconciled legend, area filters and accessible area-detail dialogs. Review outcomes are not presented as compliance conclusions.
- [x] All requirements opens a focused dialog containing the existing approved requirement/review workflows and linked-control inventory.
- [x] Linked-control adapter uses existing v1 aggregate records, approved effective requirements and current non-retired relationships. Future, expired, unrelated and retired records are excluded. The inspected demo Program has no current linked controls; this is an empty state, not a service error.
- [x] Recent assessments have exact-record actions and 7/30/90-day filtering. Selected tab/request survive refresh through URL state. Global navigation clears Program-specific drill parameters.
- [x] Needs attention includes issues, responses awaiting review and documents needing review. Response/issue dialogs open the selected record; the document queue includes follow-up files as well as unreviewed files, matching the backend count.
- [x] Program setup distinguishes framework, linked form/version, schedule state, owner and jurisdiction. Schedule shortcut opens the existing recurring-assessment drawer.
- [x] Program settings use existing v1 details/operations contracts with version and authority rechecks, preserved scope/effective dates and a required rationale. A save was exercised against the named demo Program with unchanged field values, then settings were reopened to confirm values persisted. This adds a versioned settings event to that demo record.
- [x] Copilot presentation offers at most three deterministic shortcuts based on available Program queues; it is explicitly not an AI assessment.
- [x] Dialog Escape handling and focus restoration verified; shared dialog cleanup now closes the modal before restoring focus. Area filters and empty filtered results checked.
- [x] Build/typecheck passed. 37 checks passed across Overview adoption, existing Overview contracts, inventory, activation and v1 transport.

## Rendered evidence

Full-page source/app pairs are in `output/screenshots/overview-implementation-2026-11-18/`, named `app-{desktop,tablet,mobile}-{light,dark}.jpg` and `source-{desktop,tablet,mobile}-{light,dark}.jpg`.

Matched viewport widths: 1440, 768 and 390 CSS pixels. No document-level horizontal overflow in either source or app. Metrics use four columns at desktop, two at tablet and one at mobile. Geometry observations are retained in `geometry.json`. Long real Program names wrap rather than using the prototype's shorter sample title. Exact 1024/1280 proofs and full assistive-technology testing were not completed; this is not a 100% pixel-parity or production acceptance claim.

Live demo: `http://127.0.0.1:5196/?screen=programs&program=01a1e8df-3259-7411-8435-0efdb47cfc95&tab=overview`.

## Explicit service differences

- The existing Program details contract has no governed next-Program-review date. The field displays **Not configured** and remains read-only. Assessment schedule dates are separate and are not substituted for Program review dates.
- Owner reassignment remains a separate responsibility command, rather than silently changing ownership through the accountable-function field.
- Available coverage has three evidence-review outcomes, not the prototype's illustrative supported/gaps/awaiting-review compliance distribution. Area ownership is not supplied by this read model and is not invented.
- Copilot has record-based shortcuts, not a connected generative-AI workflow.
- Recent requests are bounded to the latest 100. The UI states this when the backend marks the result limited. Issue totals are the authorized visible page, labelled when more pages exist; this is not an enterprise-wide count.
- Existing development-session strip, global shell availability restrictions and Home navigation are retained. Backend functionality was reused; no backend implementation was added to v2.

## Re-run

```powershell
node --experimental-strip-types --test web/scripts/overview-adoption.nodecheck.mjs web/scripts/program-overview.nodecheck.mjs web/scripts/program-inventory.nodecheck.mjs web/scripts/program-activation.nodecheck.mjs web/scripts/v1-program-transport.nodecheck.mjs
npm --prefix web run build
```

Build emits a bundle-size advisory; build and typecheck complete successfully. Permission failures, stale versions, foreign records, negative/unknown counts, effective periods and retired relationships are covered by the listed checks. Live role-based review/closure execution belongs to the separate Assessment/Issues work, not this Overview change.

## Source-review UI refinement
Replaced the long inline applicability expansion with a compact summary and the existing record drawer. Requirements have numbered headings, wording-state badges, source references, decision reasons and clear versioned question links. Build passed; live opening, Escape and focus return verified. Mobile drawer geometry at 390 CSS pixels has no document overflow. Light/dark rendering inspected; screenshot references are source-review-light.jpg and source-review-mobile-dark.jpg in the evidence folder.
