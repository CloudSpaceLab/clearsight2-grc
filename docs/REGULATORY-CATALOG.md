# Initial regulatory library: coverage and quality contract

The v2 initial catalog ships 21 **source-reference metadata** entries in `internal/catalog/data.json`, not 21 completed assessment frameworks. All source text remains at the issuer's website; no commercial/licensed clause text is bundled.

## Seed geography and sectors
- **Nigeria**: NDPA 2023 and 2025 GAID (privacy); CBN 2024 risk-based cyber framework (banks/payment service banks); PIA 2021 and upstream safety (oil/gas); telecom references marked for verification.
- **Kenya**: CBK Cybersecurity Guidance (2017) and Prudential Guidelines (2013); ODPC privacy and Communications Authority references awaiting original-text review. CBK September 2026 draft revisions must **not** replace in-force editions without final publication.
- **South Africa**: POPIA 2013 official act; financial cybersecurity Joint Standard 2 of 2024 and communications regulation queued for source-edition validation.
- **Ghana**: Bank of Ghana 2026 Cyber and Information Security Directive source identified; Data Protection Act 843, NCA and petroleum references queued for statutory-text verification.
- **European Union**: GDPR, DORA and NIS2 official EUR-Lex primary sources; offshore petroleum safety reference queued for edition check. NIS2 national transposition and DORA implementing measures are separate revision/territory obligations.

## Verification workflow

1. Confirm exact law/standard *name*, issuer, force date, amendments, and applicable legal person/sector.
2. Determine source license: may ClearSight store a clause, paraphrase a requirement, or only store a link? Do not redistribute ISO/IEC controls without suitable license.
3. Extract identifiable clauses/obligation IDs from authoritative primary text; retain revision, section, page/URL, content digest and language. Two-person editorial review required.
4. Map obligations to existing common control objectives without duplicating control implementations. Store clause-specific scope and legal interpretation separately.
5. Publish a versioned edition only after approval; immutable amendments and explicit superseded/current status. Customers choose adoption and record their own applicability.
6. Calculate a score **only** from an approved Program policy and the expected assessed population; unknown and missing data cannot count as compliant.

## Status semantics
- `source_identified`: a traceable primary authority/source landing page was located, not that the full edition has been audited.
- `verification_pending`: placeholder/instrument title or edition needs regulator-lawyer validation.
- `metadata_only`: 0 vetted source clauses; cannot be adopted as a scored compliance library.
- `link_only`: no rights to copy full source text have been granted or assumed.

Required before marketing “preloaded compliance programs”: reviewed, permitted clause extracts (or curated control objectives independently authored with citation), signed edition provenance, review receipts, test cases and continuous amendment monitoring.

## Source samples
- [CBN DMB/PSB 2024 framework](https://www.cbn.gov.ng/Out/2024/BSD/CBN%20Risk-Based%20Cybersecurity%20Framework%20for%20DMBs%20and%20PSBs_2024.pdf)
- [NDPC resources](https://ndpc.gov.ng/resources/)
- [CBK legislation & guidance](https://www.centralbank.go.ke/policy-procedures/legislation-and-guidelines/)
- [South Africa POPIA official Gazette](https://www.gov.za/sites/default/files/gcis_document/201409/3706726-11act4of2013protectionofpersonalinforcorrect.pdf)
- [Bank of Ghana Cyber & Information Security Directive (2026)](https://www.bog.gov.gh/reg_directives/cyber-and-information-security-directive-2026/)
- [EU GDPR](https://eur-lex.europa.eu/eli/reg/2016/679/oj)
- [EU DORA](https://eur-lex.europa.eu/eli/reg/2022/2554/oj)
- [EU NIS2](https://eur-lex.europa.eu/eli/dir/2022/2555/oj)
- [Nigerian upstream regulations](https://www.nuprc.gov.ng/laws/regulations/gazetted)
