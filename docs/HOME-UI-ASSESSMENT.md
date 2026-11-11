# Home UI assessment — 9 November 2026

Authority: [unified interface specification](design/references/clearsight-2026-10/source/clearsight-unified-design-system-v1/clearsight-design-system/clearsight-design-system-spec.md), its README and modular HTML/CSS/JS examples. Original sources remain untouched.

| Contract | Assessment / amendment |
| --- | --- |
| Existing Home and one shell | Preserved current screen=home and DesignShell. No second operational route. |
| Maximum four headline measures | Four fixed slots; values explicitly unavailable. No sample customer figures. |
| Oversight / Attention / My work | Separate keyboard-operated tabs; panels now focusable. Added direct Attention link with tab focus handoff. |
| Desktop composition | Corrected four-column threshold to 1440, Home rail to 220px and content inset to 32px. |
| Laptop / tablet / mobile | 2x2 metrics at 1024–1439; charts stack below 1024; mobile metrics stack. No horizontal overflow in tested sizes. |
| Visual rhythm | Adjusted Home card gaps to 16px, padding to 24/16px, metadata to 12px, main values to 28/18px and relevant controls to 44px. |
| Shared styling | Home primary text now uses a shared semantic color; existing reference stylesheet and global theme retained rather than importing prototype CSS into production. |
| Period semantics | Loss period remains local and disabled without server support. No historic date applied to current posture. |
| Trust and authority | No fabricated zero, score, source date, chart or approval. Existing workspace links are navigational, not exact metric drills. |
| Navigation discrepancy | Unified reference favors Oversight/Programs/Work/Insights/Reports/Configure; current app has Home/Frameworks/Programs/Forms/etc. User explicitly requested preserving actual app navigation, which takes precedence. |

## Verification
- Production TypeScript/Vite build passed; git diff whitespace check passed.
- Live Home demo inspected; widths 390/768/1024/1280/1440 checked in light and dark, with zero document horizontal overflow.
- Grid inspection confirmed one mobile metric column, two laptop columns and four desktop columns; tablet charts stack.
- Attention link selected/focused its tab; ArrowRight advanced to My work.
- Screenshot evidence: local ignored .local/home-design-assessment.png.

## Remaining acceptance
This is an unavailable-state UI implementation, not full operational Home completion or pixel-parity certification. Organization summaries, source/as-of lineage, scoped exact drills, populated/loading/partial/stale/denied fixtures and authenticated role acceptance remain pending backend contracts. Referenced v1 atomic component/token files are not present in this v2 checkout; current shared shell, Icons and tab hook are reused. Complete token/component consolidation, populated visual comparison, manual screen-reader/reduced-motion and cross-browser acceptance remain open. No claim of full design-system compliance or production readiness.

## Future work
Repository AGENTS.md now records this exact directory as the UI guide and the user's live-demo/testing requirement.
