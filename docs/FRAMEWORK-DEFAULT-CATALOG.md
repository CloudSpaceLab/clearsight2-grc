# Requested default framework catalog

These are the reference entries requested for the default catalog. The local development database contains these in the separate `framework_reference_templates` table, installed by the v1 backend migration `000139_framework_reference_templates.up.sql`. They are not published editions, requirement libraries, or evidence of compliance. Edition details follow the Framework Library design and require source verification before release.

The v1 migration adds a review-required starter pack in separate tables: purpose, applicability prompt, official source, source note, and 34 assessment areas with questions and evidence examples. These original prompts are neither complete requirements nor official clause mappings. Source notes flag that the Nigeria link is an NDPC overview rather than the Act itself, ISO's 2024 amendment needs checking, and SOC 2's applicable criteria and scope need confirmation.

| Framework or regulation | Reference edition | Issuer |
| --- | --- | --- |
| ISO/IEC 27001 | 2022 | ISO/IEC |
| NIST Cybersecurity Framework | 2.0 | NIST |
| PCI DSS | 4.0.1 | PCI Security Standards Council |
| General Data Protection Regulation | Regulation (EU) 2016/679 | European Union |
| Nigeria Data Protection Act | 2023 | Federal Republic of Nigeria |
| UK Data Protection Act | 2018 | UK Parliament |
| Digital Operational Resilience Act | Regulation (EU) 2022/2554 | European Union |
| SOC 2 | Criteria edition to be confirmed | AICPA |

ISO/IEC 27001 is already present in the design and should appear only once. SOC 2 is an assurance reporting framework; it should not be presented as an ISO certification. Catalog presence does not establish applicability, adoption, assessment, compliance or certification.

Before publication, obtain authoritative source artifacts, pin each intended edition and amendment, verify exact dates and rights, prepare the required manifests and source checksums, and obtain independent review and approval. Do not redistribute licensed text without permission. In particular, do not infer a SOC 2 criteria edition from its name.

The v1 repository's `docs/operations/framework-catalog-publication.md` documents an offline verifier and a trusted internal publisher, but says that the publication boundary is not yet connected to a CLI, API or automatic deployment. The v2 library reads the v1 `reference-templates` endpoint separately from published editions and displays their starter guidance. Templates are not available for adoption. A production release needs a governed publication mechanism and must preserve existing catalog and Program records.
