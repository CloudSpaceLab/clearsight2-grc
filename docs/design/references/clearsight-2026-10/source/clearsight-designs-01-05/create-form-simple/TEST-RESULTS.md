# Create Form prototype verification

12 November 2026. Browser demo started with a blank form at http://127.0.0.1:5182/create-form-simple/index.html. Created an illustrative 14-question form across Ownership and review, Evidence and sign-off, and Evaluation. The editable example is saved in that browser origin. The separate approval test used localhost on the same port.

| Field | Verified behavior | Result |
| --- | --- | --- |
| Short answer | Enter, clear, required error, optional blank, stored maximum length | Passed |
| Long answer | Multiline entry and required check | Passed |
| Yes / No | Exclusive selection, Yes reveals follow-up, No skips it, visible follow-up requires an answer | Passed |
| Single choice | Configured choices, one selection at a time | Passed |
| Multiple choice | Configured choices, independent selections | Passed |
| Date | Date control accepts 12 November 2026 and required blank fails | Passed |
| Evidence file | Local picker, visible selected filename, required blank fails | Passed locally |
| Attestation | Checkbox confirmation and required blank check | Passed |
| Multiple choice grid | Edited row/column labels, visible matrix, one selection per row, every required row checked | Passed |
| Checkbox grid | Edited row/column labels, visible matrix, several selections per row | Passed |
| Rating | Seven configured values, separated star controls, one selection | Passed |
| Linear scale | Ten configured values, separated number controls, one selection | Passed |
| Time | Time control accepts 14:30 and required blank fails | Passed |
| Dropdown | Edited choices, blank placeholder, selected value, duplicate-choice rejection | Passed |

All 14 blank required questions were detected by Check answers. Filling all 14 produced the successful preview result. Changing No to Yes with an empty follow-up produced one invalid question. Completing the follow-up resolved it. Clearing a previously answered required text field identified that field.

The browser run recorded 47 explicit assertions. These included duplicate grid-row and dropdown-choice rejection, question image rejection for an unsupported file, image attachment and reload, removal, duplicate/delete, explicit import selection, section placement, mouse dragging, keyboard reorder, movement across sections, saved order, stale-save rejection, approval eligibility for all 14 types, and the persisted pending-approval edit lock.

At 390, 768, 1159 and 1440 CSS pixels, the editor had no horizontal page overflow and preview grids retained visible width. Mobile dark mode and keyboard dialog closure were exercised. Grid tables scroll within their own answer region when needed.

The test found and corrected a floated-legend layout defect that collapsed grid width. Rating and scale choices now have separate hit areas and selected styling. Added Check answers to exercise required-response validation and error focus. Text preview controls now retain stored maximum lengths. The existing four builder-model tests and JavaScript syntax checks pass.

## Limits

This is an HTML/CSS/JavaScript prototype. Drafts and approval requests use browser storage. Preview answers and selected evidence files are temporary. Real upload, malware scanning, backend submission, authenticated review authority, activation and compliance scoring were not exercised. Import was tested using the local sample source. Real devices, touch dragging, other browser engines and a screen reader remain unverified. Ratings and linear scales support a range starting at 1 and ending between 2 and 10.

The existing Home navigation is retained in the prototype shell. Sidebar routes beyond authoring display an availability notice. This preserves the user's navigation preference relative to the different hierarchy in the unified reference.

Full-page proof is saved in create-form-simple.png and field-preview.png alongside this file.
