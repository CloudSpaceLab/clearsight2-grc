# ClearSight — Home / Enterprise Control Tower

## Scope
Design for the existing Home navigation item and screen=home route. No additional product page or navigation route is proposed. The HTML file is review packaging, not a new application route.

## Canonical references
- App shell: web/src/shared/DesignShell.tsx and web/src/framework-parity.css; retain Home, Frameworks, Programs, Forms, Vendors, Risk & Losses, Privacy, Reports and Settings.
- Approved unified specification, system.css and component examples in ../clearsight-unified-design-system-v1/clearsight-design-system.
- Screen packaging follows reference packages: HTML composition, separate CSS, separate JavaScript, Markdown design notes.

## Header and interaction
Retain Branches/Departments/Teams/Groups, search, notifications and profile. A labelled moon/sun icon toggles appearance. Home remains selected while switching Oversight, Attention and My work. Other global destinations remain unavailable in this isolated design review rather than jumping to unrelated Home panels.

## Content
All five areas remain: vendors/onboarding, forms/assessments, compliance/Programs, risks/losses, Attention/My work. Four headline cards maximum. Current posture and historical losses remain distinct. All figures are synthetic and definitions await confirmation. No depreciation feature or compliance-score claim.

## Handoff
Replace existing HomeEmpty content inside DesignShell when implementing approved production Home; do not create another app shell or a second Home. Use authorized backend reads and honest unavailable states; do not ship these sample figures. The current revision changes review artifacts only.

## Assets and verification
Original reference files remain unchanged. Referenced gallery PNG assets are missing from this checkout. Shell uses the existing CSS logo and SVG icons. Browser visual acceptance remains required at 390/768/1024/1280/1440 pixels, light/dark, keyboard and reduced motion.

## Scope and decision hierarchy revision
Removed the separate Organization/Scope/Loss period row: the app header already owns organization filters. Reporting period now lives inside operational losses and updates only that panel and its headline card. Synthetic monthly gross/recovery/net figures reconcile to the quarter. Four headline measures retained. Risk bars now use proportional widths. Each domain summary includes source context and snapshot date. Attention includes priority, responsible team, due date and proposed next action; My work includes individual assignments. Actions explain the intended handoff without claiming a live backend operation. Existing navigation, shell and theme icon remain intact.

## Unified specification synchronization — 9 November 2026
Aligned with docs/HOME-UI-ASSESSMENT.md and the implemented Home: four desktop metrics at 1440+, two laptop columns, stacked mobile metrics and tablet charts; 220px desktop rail, 32px inset, 16px gaps, 24/16px panel padding, 12px metadata and 44px controls. Tab panels are focusable; View attention queue moves focus to its tab. Appearance uses the same persisted preference as the runtime. Original reference sources remain unchanged.

The design intentionally retains clearly labelled synthetic populated examples for review. The actual Home uses unavailable states until authorized organization summaries exist; populated preview figures are not implemented backend functionality.
