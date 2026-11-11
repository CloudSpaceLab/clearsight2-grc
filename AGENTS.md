# UI work

For prototype requests, first use the relevant HTML/CSS/JS templates under `docs/design/references/clearsight-2026-10/source/`. Create a separate prototype derived from those templates and preserve archived originals. Prototype work does not authorize implementation in the app; keep app implementation as a separate step requested by the user.

Use `docs/design/references/clearsight-2026-10/source/clearsight-unified-design-system-v1/clearsight-design-system/` as the UI guide for subsequent work. Read its README and unified specification, and inspect the relevant HTML/CSS/JS references before changes. Preserve archived originals.

Reuse the current app shell, routes, React components and shared semantic theme tokens. Reference HTML is design guidance, not production code to transplant. Preserve the existing Home navigation as requested by the user; record navigation differences from the reference explicitly.

Include relevant tests and a live demo with UI changes. Check light/dark, keyboard navigation and responsive composition. State unavailable backend functionality honestly and never ship illustrative reference figures as customer data.

For prototype PNG screenshots, capture the full page by default, not only the visible viewport, unless the user explicitly requests a crop or viewport screenshot.

Always test and provide a live demo of changes. Report what was verified and any functionality that could not be exercised.

## Implementing a prototype in the main app

When the user asks to implement a prototype in the app, treat the named prototype as the visual source of truth. Inspect its HTML, CSS, JavaScript, screenshots and design notes first, and inventory every screen, section, card, control, dialog, label, state, interaction and responsive layout. Preserve the existing page and navigation except for the entry point the user requests.

Match the prototype's structure, spacing, typography, colors and responsive composition using the existing app framework, shell, shared components and semantic tokens. Do not introduce an alternate design or omit a prototype element. The prototype's source is guidance, not production code to transplant; preserve the archived originals.

Connect real backend behavior where available. If a prototype interaction cannot safely work the same way, preserve its intended appearance where possible, explain the exact difference and never invent data or imply an unavailable operation works.

Compare the prototype and app in equivalent states at the same desktop, tablet and mobile viewport sizes, in light and dark modes. Check every dialog and state, test keyboard navigation and relevant workflows, and fix identified differences. Update the acceptance checklist and demonstrate the result live. Do not claim a 100% match unless verified; report remaining differences and any checks that could not be performed.
