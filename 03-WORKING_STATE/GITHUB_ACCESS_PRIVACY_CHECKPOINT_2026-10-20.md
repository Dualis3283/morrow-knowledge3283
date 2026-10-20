# GitHub Access and Publication Boundary — 20 October 2026

**Scope:** Public-safe Morrow project access and privacy-process checkpoint. This is not a corporate evidence archive, a verified employment record, or GDPR certification.

## Context
Morrow's public, version-controlled methodology must remain separate from private professional records and confidential organisational evidence. A previous attempt to write the public working-state checkpoint through the first-party GitHub connector failed despite reported repository-owner permissions.

## Evidence and sequence
1. Correct public repository verified as `Dualis3283/morrow-knowledge3283`, default branch `main`.
2. First-party GitHub connector can authenticate and read repository files. An earlier update operation returned **HTTP 403 — Resource not accessible by integration**. Subsequent collaborator-permission and branch-protection reads also returned HTTP 403; installation discovery returned an empty list.
3. A separately connected, active Composio GitHub account authenticated as the repository owner and read the repository, owned-repository listing and branch metadata successfully.
4. Branch metadata confirmed `main` is protected and requires `privacy` and `verify-layer` checks. A new documentation branch was created from the observed main tip `538ca51e8cd903291e1d09168d3a6bb9af5a4ec3`, demonstrating a working Composio write pathway without changing protected `main`.
5. A bounded audit read 62 files on the current main branch and found no direct employer, selected case-key, email-address, or Irish IBAN matches. Date strings, test labels and blob hashes initially resembling phone/address patterns were manually examined as false positives. The approved public author identity remains visible by design.
6. A separate private workspace draft was created and read back with only high-level historical professional evidence categories, explicit verification caveats and no direct identifying values or internal case references. Its private location is deliberately omitted here.

## Findings and interpretation
- **Confirmed:** Repository exists; primary connector reads are operational; primary connector writes failed; the alternative authenticated Composio connection can create a branch; protected-main checks are configured.
- **Hypothesis:** Connector installation or API scope differences explain the first-party 403 responses. The exact restriction has not been established.
- **Privacy:** Automated pattern scanning detects selected material; it does not hash or inherently anonymise personal data. A Git content hash is not an identity pseudonym. Where personal identifiers are unnecessary, exclusion and data minimisation are preferred. Intentionally approved public attribution is not treated as hidden or hashed.

## Publication controls
- Do not copy private case records, employee/customer identifiers, internal references, employer system links, logs or credentials into this public repository.
- Keep any private professional evidence only in an employer-authorised location.
- Require evidence verification, provenance, classification, indirect-identification review and appropriate approval before publishing professional case studies or claims.
- Preserve protected `main`, required CI and human review. A staging branch or pull request is not a production release.

## Remaining verification and next actions
- [ ] Check this proposed change with repository privacy and verify-layer CI; do not claim a PASS without actual results.
- [ ] Confirm whether the first-party GitHub integration needs reauthorisation or an expanded repository installation/scope.
- [ ] Review historical Git revisions, additional branches, external websites/deployments and media metadata before claiming comprehensive privacy clearance.
- [ ] Confirm source-side private workspace sharing/access and employer confidentiality permissions.
- [ ] Independently verify professional activity figures and case-level attribution before public use.

**Decision:** Preserve the public/private boundary and use the functioning GitHub integration through a review-first branch workflow. Never bypass protected-main release controls to resolve an access problem.
