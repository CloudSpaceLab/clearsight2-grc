# Program Documents acceptance

Verified on 19 November 2026 using the revised Program workspace reference and unified semantic theme tokens.

- [x] Query files with the selected Program ID inside the existing tenant, entity and role restrictions.
- [x] Follow every returned cursor before searching the complete authorized Program file set by file, questionnaire or question.
- [x] Show current evidence by default and offer current and previous evidence with occurrence-specific review states.
- [x] Inspect the file question, submission time, evidence currency, validity, scan status and checksum.
- [x] Open the exact submitted revision and focus the file question from the document drawer. Resolve explicitly linked revisions beyond the first history page.
- [x] Download both the original and corrected PDF as the independent reviewer.
- [x] Check Enter to inspect and Escape to close. Check 1440, 900 and 390 pixel layouts in light and dark themes without horizontal page overflow.
- [x] Run the production build, 89 frontend checks, and affected Evidence and HTTP API backend suites.

The demo uses the existing fictional Assessment correction and resubmission record. Revision 1 retains DEMO-original-privileged_access_record.pdf and its follow-up decision. Revision 2 retains DEMO-corrected-privileged-access-record.pdf and its reviewed decision. Live browser navigation verified both exact revision links and question focus. Both files downloaded successfully from the Documents drawers.

An authenticated API check forced two-file pages. Chief Risk Officer and Evidence Respondent each received 15 occurrences across eight pages. Internal Auditor received zero. A different Program ID returned zero files for every tested account. The Program filter narrows the existing document read authority. Response answer visibility continues to use the assigned respondent and independent reviewer checks.

Screenshots are stored under output/screenshots/assessment-correction-2026-11-19/documents-*.jpg. The register currently loads all authorized pages before applying text and review filters. Large-volume performance and production deployment were outside this local acceptance run. Home navigation follows the existing application shell.

## Final Documents review follow-up

- Added a dedicated loading-error state and Try again action. Failed loads do not show a misleading empty-result message, and retry clears the prior error.
- Linked response questions receive automatic focus once per opened revision.
- Added document-register frontend checks for multi-page Program scope, failed-load retry, cancellation, repeated cursors, and exact revision/question URLs.
- Added a V1 repository regression for Program filtering, revision pagination and denied readers.
- The frontend production build and 93 checks passed after these changes. The earlier browser walkthrough remains recorded above. These final follow-ups were checked through build and automated tests.
- Additional V2 commit files are web/src/features/programs/documentRegisterModel.ts and web/scripts/document-register.nodecheck.mjs.


## Remaining prototype features implemented on 19 November

- Added an Existing assessment destination to Add supporting document. It lists the signed-in respondent's assignments, resolves the authoritative request, and saves the file against a visible file question in its draft. Submitted assignments require an open correction window. The existing draft version, correction reference, and other answers are preserved. The response must subsequently be submitted.
- Added exact-file question/group review rationale to inspection. The saved submitter name and response revision come from the authorized V1 document inventory.
- Added protected PDF, inert-image and text previews. Text previews are bounded to 2 MB. HTML and SVG are excluded. Content uses the existing authorized file endpoint and blob URLs are revoked when the preview closes.
- Kept standalone Program document entry available through the existing request workflow. Independent review notes appear only where a review has actually been recorded. Generic response reviews continue through their existing response inspector.
- Frontend build and 95 checks passed. Evidence, Monitoring and HTTP API suites passed. Local API checks verified the actual submitter, revision 2, recorded review rationale, PDF response status 200, and named actors for respondent/reviewer roles. Unrelated auditor received no protected document.
- Live browser acceptance for these new features is pending. The inbuilt browser interaction tools are unavailable in this session. The page was queued using the Codex inbuilt-browser panel tool. No visual demo or responsive acceptance is claimed for this pass.


## Inbuilt browser walkthrough completed

The inbuilt browser controls became available later on 19 November. The Chief Risk Officer opened the revision-2 PDF drawer and verified Evidence Respondent, response revision 2 and the saved review rationale. The first native PDF frame was blank in this browser. It was replaced with Mozilla PDF.js 6.5.438, loaded dynamically with its local worker. The corrected PDF then rendered visibly with page navigation and optional extracted page text. The existing access.png image also rendered visibly.

Program Owner created DEMO · Documents upload walkthrough through the approved ISO v3 assessment dialog. Evidence Respondent opened Add document, selected that assessment and its privileged-access file question, uploaded the fictional corrected PDF and saved it into the draft. The app reopened the assessment and showed the named file, Attached to draft and Draft saved. This new isolated response was left in Draft for completion. Choosing the already-reviewed demonstration response correctly reported that an open correction request was required. Internal Auditor received no protected corrected-PDF row.

Documents and Activity were checked at 1440, 900 and 390 CSS pixels in light and dark themes with no page-level horizontal overflow. Temporary viewport overrides were reset. Evidence is under output/screenshots/documents-activity-2026-11-19/. The final build and 95 frontend checks passed. The renderer adds web/package.json and web/package-lock.json to the V2 commit contents, alongside DocumentPDFPreview.tsx.

The dependency audit reported three existing development dependency findings in Vite, nanoid and source-map-js. PDF.js was absent from the advisory list. Those development-tool dependency updates remain outside this workflow change.
