# V1 field and action map

Observed online and cross-checked against local v1 source. The assessment reference controls visual composition; v1 controls workflow meaning. This inventory distinguishes supported prototype controls from recognized v1 capabilities requiring implementation.

| Surface / control | Purpose and use | Prototype |
| --- | --- | --- |
| Blank form | Start a new definition, initial section and required short-answer question | Functional |
| From template / starter preview | Inspect and copy a versioned starter pattern | Functional synthetic 4-question starter; not a clone of the live 8-question catalog |
| Draft with AI | Generate a reviewable proposal from instructions | Unavailable; source/service boundary explained |
| Import | Extract XLS/XLSX/document questions with source mapping | Unavailable; no file is parsed or uploaded |
| Back to Forms | Return to library; protect unsaved changes | Local saved-template list; unsaved edits block leaving until saved |
| Title / draft state / revision | Identify current record and saved version | Functional; unsaved indicator |
| Preview | Inspect respondent labels, guidance, controls and required marks | Functional local dialog; responses are not saved |
| Review / count | Locate missing metadata, invalid fields/choices/bounds | Functional validation summary; not compliance review |
| Save draft | Persist editable definition with expected-version protection | Functional local storage; quality gates; no live persistence |
| Send for approval | Save changes if necessary, hand off current revision, lock editing | Functional sample route/note/receipt; no activation or real routing |
| Approval decision | Independent rationale-based request changes / approval | Local sample role guard only; activation remains unavailable |
| Outline / Canvas / Settings | Navigate structure, edit content, inspect settings | Three-pane desktop, mobile pane controls |
| Code | Stable human-readable definition reference | Editable; required for save |
| Form name / purpose | Respondent identity and reason for collection | Editable; required for save |
| Default layout | Automatic, all questions or section wizard | Retained setting; preview currently all sections |
| Allow layout switching | Permit respondent presentation changes | Retained setting; no runtime response engine |
| Scoring mode | None, Risk or Compliance; direction changes meaning of points | No score only; risk/compliance configuration and simulation unavailable |
| Add section / title / guidance | Group questions and explain a section | Functional; 20-section maximum |
| Move / duplicate section | Change order or reuse section content with fresh identifiers | Functional; keyboard buttons, not pointer drag |
| Remove section | Remove grouping while retaining questions elsewhere | Functional, questions reassigned to first remaining section |
| Add / label / response guidance | Define a question and respondent instructions | Functional; 200-question maximum |
| Move / duplicate / remove question | Order and reuse fields; remove after confirmation | Functional within section; at least one field retained |
| Response type | Text, contact, numeric, date, choices, checkbox/attestation and evidence/signature families | 19 v1 field type identifiers selectable; type-specific runtime capture limits below |
| Required response | Blank answer not allowed when collecting responses | Retained; marks shown in preview; no response submission engine here |
| Section selector | Move question to another section without losing field identity | Functional |
| Choices | Single/multiple select options | Functional; 2–50 nonempty unique options |
| Min/max response limits | Constrain response size/value according to type | Simplified generic min/max; full v1 type rules not replicated |
| Field assessment | None, manual, automatic, automatic plus review | None/manual retained; automatic modes unavailable |
| V1 rubric, weight, required reviewer/role | Define assessment responsibility and outcome criteria | Recognized, not implemented; do not infer policy from sample settings |
| Logic | Visibility conditions referring to prior fields | Recognized but unavailable; no invalid rules emitted |
| Data handling | Collection intent, linked record target, browser cache policy | Recognized but unavailable; no sensitive data handling claim |
| Formats / attestations / numeric/date constraints | Type-specific accepted formats and legal statement/limits | V1 source recognized; only basic preview/type metadata present |
| File/photo/vendor document/signature | Collect governed files or signature record | No capture; preview states limitation; no implied scan/acceptance |
| Reusable section picker | Copy sections from an authorized existing template revision | Unavailable without source access/read contract |
| Required sign-off helpers / automated rules | Add governed sign-off or configure testable scoring rules | Not replicated; no scoring or approval invented |
| Review response policies | Navigate policy governance for the form | Not implemented in isolated prototype |

Live v1's specific actor currently had Send for approval disabled on a blank incomplete definition. Availability in production also depends on actor authority and current state; passing this prototype's quality checks does not establish that authority.
