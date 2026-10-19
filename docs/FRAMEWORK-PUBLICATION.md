# Framework publication verification

The v2 framework-import boundary reuses the tested **v1** `internal/frameworkcatalog` publication validator, checksum verifier and edition delta preflight. Source files are copied exactly, with their synthetic tests.

## Run

```bash
go run ./cmd/framework-verify -manifest ./publisher-edition.json -source ./original-regulatory-document.pdf
```

The command returns edition identifiers, a release fingerprint and verified source byte count with status `checksum_validated_not_approved`. It reads bounded local files and does not invoke the network, mutate a database, create Programs, or claim a standard is adopted.

## Required governance after successful verification

1. Confirm source authenticity, promulgation/effective/amendment dates, and jurisdiction/industry applicability against the regulator's official publication.
2. Establish permitted redistribution rights for clause summaries. `CITATIONS_ONLY` does not permit copied normative language.
3. Conduct independent legal/regulatory content review with reviewer/authorizer separation; record immutable approval references and curator identity.
4. Publish through an audited transaction with edition conflicts rejected, no overwriting of previously published releases.
5. Tenant adoption is explicitly version-pinned. Clause references alone are not scored obligations. Program requirements, evidence and assessments need actor-scope and approved weights.

**No HTTP publication route is exposed.** The catalog API remains reference metadata only. A verifiable source hash is a technical integrity check, not regulatory approval.
