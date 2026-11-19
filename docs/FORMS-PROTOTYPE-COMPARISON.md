# Create form: prototype and main app comparison

Reviewed 11 November 2026. This is an audit of the current implementation, not a claim of visual parity or a sign-off.

Follow-up: the header wave, selected outline treatment, real starter preview card, yes/no and single-choice preview selects, duplicate/section ordering and question-removal dialog were subsequently implemented. Basic browser checks covered the starter preview, duplicate, removal cancel/focus return and mobile outline at a 390px requested viewport. The remaining matrix and complete visual comparison have not yet been re-audited.

## Sources and limits

- Prototype: `docs/design/references/clearsight-2026-10/source/clearsight-designs-01-05/create-form-revision/` — `index.html`, `builder.css`, `builder.js`, `builder-model.js`, `FIELD-ACTION-MAP.md`, and its full-page PNGs.
- Main app: `web/src/features/assessments/FormAuthoring.tsx`, `formAuthoring.css`, `formAuthoringModel.ts`, `AssessmentWorkspace.tsx`, and the shared app shell.
- Browser observation: the running v2 builder was inspected in the built-in browser; the prototype PNGs and source were inspected separately. Browser security blocked opening the prototype's `file://` URL in the browser. The two screens were not captured at the same viewport with identical content, so this is **not a pixel-difference measurement**. Responsive observations below describe the source and earlier checks, not a fresh side-by-side test at every breakpoint.
- Existing Forms: retain its current page and behavior. The requested Create form entry is the only intended addition to that page. Do not restore the file from Git: its pre-existing work predates this authoring request.

## Shell and launcher

| Area | Approved prototype | Main app | Assessment |
| --- | --- | --- | --- |
| Entry | Separate authoring screen under Forms | Create form button in existing assessment header; Back to Forms returns | Entry exists; compare its spacing at desktop/mobile without changing the existing page. |
| Header | Title, supporting copy and blue wave illustration | Title and copy; wave illustration missing | **Visual mismatch.** |
| Shell | Prototype includes sample identity, scope and notifications | Existing app shell, real demo session, fewer live controls | Intentional integration difference; retain app shell and existing Home navigation. Prototype sample identities are not production data. |
| Launcher | Four method cards, a visible starter preview card, and saved-template list | Four method cards; real starter catalog appears only after choosing From template; saved v1 list | **Structure and interaction mismatch.** Align card geometry, spacing and starter-preview placement using authorized catalog data; never display the sample as customer data. |
| Sample-role disclosure/footer | Local simulation disclosure and prototype footer | No sample-role switch or simulation footer | Intentional: real actor and database must not be presented as simulated. |
| Saved rows | Row name, code, revision, section/question counts and status; entire row opens | Name, code, status, revision and separate Open button | **Layout and content mismatch**; preserve v1 permissions. |

## Builder composition

| Area | Approved prototype | Main app | Assessment |
| --- | --- | --- | --- |
| Toolbar | Back, status, Preview, Review with count, Save draft, Send for approval in a single responsive toolbar | Same core actions, different label (`Review checks`), wrapping and extra review actions when pending | **Visual/label mismatch**; actual status and authority remain essential. |
| Desktop grid | Sticky outline, wide canvas, sticky separate settings cards; prototype spacing, borders and typography | Same three broad regions but locally authored CSS and different widths, padding, typography and wrapping | **Not verified as aligned.** Compare at identical viewport and populated record. |
| Outline | Number badge, selected section highlight, nested questions only for expanded section, divider and Add section | Plain numbered text; sections and questions rendered together; selected question styled but selected section/number anatomy differs | **Structure and visual mismatch.** |
| Form settings | Outline Form settings changes inspector to Presentation and Scoring cards | Same broad card arrangement after last correction | **Partial match**; exact card spacing, focus and active outline state not verified. |
| Form identity | Code, prominent name and purpose in one card | Same three inputs | **Partial match**; compare dimensions, type scale, label spacing and placeholder styles. |
| Section card | Section title and guidance, move/copy/remove controls, question cards and Add question | Same broad contents | **Partial match**; section/question action spacing and ordering need direct comparison. |
| Question card | Number/type, Settings, up/down, duplicate/remove; question and guidance; required/assessment summary | Similar controls and fields, but assessment summary is omitted | **Content and spacing mismatch.** |
| Numbering/order | Question order follows prototype's field array; duplicated question inserted directly after its source | Duplicate currently appended to the end of the field array; section reorder can display question numbers out of visual order | **Behavior mismatch and defect.** Fix ordering and cover cross-section/section-reorder cases. |
| Add section | Adds a section and initial required question | Adds a section and initial question | Basic action matches; test limits and keyboard/focus behavior. |
| Outline/inspector navigation | Selecting a question or section moves focus and scrolls to the corresponding pane/target; Form settings focuses inspector | Changes panes and uses scrolling in some cases; no equivalent systematic focus transfer | **Accessibility and interaction mismatch.** |
| Question settings | Selection context, Go to question, separate Response/Assessment/Options cards | Separate cards now exist; spacing, numbering and labels are independently styled | **Partial match**; compare exact layout and selected/focus states. |
| Field assessment | None and manual independent review selectable in prototype | Selection disabled; advanced existing rules view only | **Functional mismatch.** V1 requires a reviewer role, weight and rubric; implement a truthful v1-compatible authoring flow rather than persisting the prototype's incomplete sample metadata. |
| Min/max | Generic sample min/max controls | No min/max controls | **Functional and visual mismatch.** V1 uses type-specific constraints, so map appropriate controls and validation by field type. |
| Choices | Options textarea in Response card for choice fields | Choices textarea in Response card | Basic control exists; test multiline, duplicates and persisted v1 behavior. |
| Logic/data handling | Disclosure rows explaining preview limitation | Disclosure rows with limitations | Similar, but exact copy/spacing and expanded states need comparison. |
| Delete question | Prototype's custom confirmation dialog | Native browser confirm | **Dialog mismatch.** Use accessible app dialog matching the reference. |
| Section removal | Retains its questions in first remaining section | Same general outcome; adds native confirmation | Similar result, different interaction; test multiple sections and ordering. |

## Dialogs, persistence and review

| Area | Approved prototype | Main app | Assessment |
| --- | --- | --- | --- |
| Preview | Dialog named for form; yes/no and single choice use a select; fields show labels, guidance and controls | Generic Respondent preview title; yes/no and single choice use radio buttons | **Visual and interaction mismatch.** Keep preview answers nonpersistent. |
| Review checks | Dialog lists missing identity, question/section, option and generic bound errors | Dialog handles basic identity, section, question and choices; no bounds checks | **Incomplete parity**; add checks for implemented v1-compatible constraints. |
| Save/reopen | Browser-local sample with version protection | V1 API draft and revision with expected version | Intentional data/persistence difference; verify denial, stale revision and metadata preservation. |
| Leaving draft | Prototype blocks leaving until saved | App offers native confirm to discard | **Interaction mismatch**; agree safe behavior and match dialog presentation without trapping users. |
| Send for approval | Sample route, handoff note, confirmation and receipt; prototype can save before sending | Real v1 transition, confirmation; must save first, no route picker/note or dedicated receipt panel | **Layout/workflow mismatch.** Do not fabricate a route or note the backend cannot store. |
| Review decision | Prototype sample reviewer can request changes or approve for later activation, with rationale | Authorized v1 reviewer can reject or approve **and activate**, without rationale in this screen | Material backend semantic difference. Clearly label actual action and verify whether v1 can support separate approval, activation and rationale before changing it. |
| Pending state | Submitted revision locked, receipt shown | Fields locked, actual state and status message shown | Basic lock matches; receipt layout differs. |
| AI/import | Explicitly unavailable | Explicitly unavailable | Aligned in capability; compare card wording and appearance. |

## Responsive, theme and accessibility

| Area | Approved prototype | Main app | Assessment |
| --- | --- | --- | --- |
| Breakpoints | Four launcher columns, two at 1100px, one at 767px; builder inspector stacks at tablet; mobile pane controls | Same broad CSS breakpoints and mobile pane approach | **Partial match only.** Capture equivalent full-page states at 390, 768, 1024 and 1440 CSS pixels; check page overflow and usable controls. |
| Sticky panes | Explicit grid placement and bounded scroll for outline and settings | Sticky bounded panes with tablet grid placement but different rules | **Needs comparison**, especially overlapping, independent scroll and wrapped toolbar at laptop widths. |
| Light/dark | Prototype defines both themes | App uses shared semantic tokens and shell theme | Correct integration direction; color, contrast, borders and selected states require side-by-side checks. |
| Keyboard/dialogs | Prototype implements focus targeting and native modal dialogs | Native modal used for preview/checks/transition; native confirms for removals; explicit focus handling differs | **Incomplete.** Test keyboard access, focus containment/return, controls and reduced motion. |

## Priority for correcting the app

1. Preserve existing Forms behavior and compare the launcher and each builder pane at identical viewport widths with equivalent, clearly labeled records.
2. Match outline structure, active states, card dimensions, toolbar wrapping, typography, wave/header and inspector presentation using the shared app shell and semantic tokens.
3. Correct question/section ordering, navigation and focus; replace native confirms with matching accessible dialogs.
4. Implement and test type-safe v1 constraints and manual assessment configuration; keep unsupported capabilities clearly identified until complete.
5. Match preview and review dialogs while preserving real v1 lifecycle semantics. Confirm backend support before presenting separate approval/activation or stored rationale.
6. Test successful and denied roles, save/reopen/conflict, light/dark, responsive and keyboard flows; demonstrate the result live. Update the Forms acceptance checklist with actual evidence.
