# Wizard acceptance checklist

Prototype review, 13 November 2026. This is not main-app acceptance or backend verification.

## Verified

- [x] Separate library entry offers **Adopt framework** for NIST and links to step 1; no archived reference was modified.
- [x] Extra top banner removed; compact reference sample badge retained; appearance toggle moved to common header.
- [x] Explicit **Questionnaire** card shows questionnaire name/version, the requirement's question group and question count.
- [x] Selecting a requirement updates its inspector; keyboard arrows, Home and End select list entries.
- [x] Adopt defaults, customize title/wording/reason, and exclude with a reason.
- [x] Missing customization or exclusion fields display validation errors.
- [x] Program customizations preserve the source requirement and the other Program's draft.
- [x] Linked-question dialog shows question wording and answer type; closing returns focus.
- [x] Filtering supports all, pending, adopted, customized and excluded decisions, including an empty result.
- [x] Step 1 blocks advancement while decisions remain unresolved or all requirements are excluded.
- [x] Question settings support answer expiry, bounded whole-number validity, evidence presence and sample smart-validation settings.
- [x] Smart-validation connection/rule selection and matching, mismatched and unavailable sample responses exercised.
- [x] Unavailable API results remain unverified; no external API call is made.
- [x] Each included question group must be marked reviewed before advancing.
- [x] Owner, respondent departments/units and adoption rationale are required.
- [x] Multiple respondent units and the assignment preview exercised.
- [x] Save/reload restores local draft values; Program drafts remain separate.
- [x] Final review includes original/custom requirement wording and prepares a clearly labelled local demo receipt.
- [x] Native dialog Escape handling and explicit Tab/Shift+Tab wrapping exercised.
- [x] Eleven model tests pass; JavaScript syntax checks pass.
- [x] Portable `index.html` now embeds its CSS and classic JavaScript. No external script or module imports are needed. The generated preview renders six requirements and linked-question details, with no browser console errors when served over HTTP.
- [ ] Automated direct `file://` verification: unavailable because the browser tool rejects file URLs. The standalone conversion removes the module-loading dependency, but direct disk opening still needs a user/browser check. Local browser-storage policy can also differ between file and HTTP origins.
- [x] Desktop layout inspected in light and dark at an observed 1440px viewport; updated layout observed at the normal 1159px browser viewport.

## Remaining before prototype completion

- [ ] Recheck all three steps and dialogs after the latest template correction at actual 1280, 1024, 768, 390 and 320px widths in light and dark.
- [ ] Verify page/control geometry, overflow, focus visibility and mobile selection behavior at those actual widths. Early attempted resize captures remained at 1440px and are not accepted as responsive evidence.
- [ ] Check the appearance control after relocation in both themes.
- [ ] Complete the user-paced demonstration: one action at a time, pausing for the user before opening another view or step.
- [ ] Obtain user review of the new wizard before main-app implementation.

No production endpoint, database migration, framework publication, authority decision or assessment dispatch was implemented or validated by this prototype.
