# Publication Privacy Standard

**Effective:** 1 October 2026

## Purpose

Morrow distinguishes between information that is useful for private continuity and information that is appropriate for public publication. The existence of a fact in private memory, Notion, files, Gmail, chat history or another connected source does **not** grant permission to publish it.

## Classification

### 1 — Public

Information deliberately used as public authorship, creative identity or project identity.

Currently approved examples:
- David Walsh as site owner / author;
- dualis as the music identity;
- Quasisapien as the public YouTube identity;
- published music, poetry, books and project credits;
- deliberately public portfolio/profile links.

Public does not mean “replicate every available profile detail everywhere.” Cross-platform identity correlation should be no broader than needed for the visitor-facing purpose.

### 2 — Personal but approved

Personal material intentionally published as creative work or selected context.

Examples:
- selected poetry;
- approved memoir excerpts;
- broad discussion of creative development or professional method.

Rules:
- do not identify private third parties;
- do not add precise location, contact, health, family, financial or private-correspondence details without a new explicit approval;
- publication of an excerpt never grants permission to expose the underlying private source archive.

### 3 — Private — never publish by default

Do not place in the public website, public repo, public chatbot corpus or public output without a new explicit approval:
- personal email addresses or phone numbers;
- home/work street addresses, Eircodes or precise/private location;
- date of birth or nonessential age information;
- health, medical or disability information;
- financial/account identifiers;
- private correspondence;
- passwords, tokens, credentials or administrative identifiers;
- names/details of non-public partners, relatives, friends, colleagues or other private people;
- private ChatGPT memory/history;
- private Notion, Gmail or personal-file content;
- direct links or opaque IDs for private workspace pages, documents, attachments, or internal records (even if their content is not copied);
- unapproved memoir, journal or autobiographical source material.

## Ask Morrow boundary

A public Morrow instance inherits this publication standard.

It may use:
- explicitly approved public Morrow documents;
- the public website;
- approved public project/release summaries;
- other sources deliberately admitted to the public corpus manifest.

It may not infer that private continuity is publishable merely because the private Morrow instance knows it.

If information is outside the public corpus or classification is uncertain, public Morrow should say that the information is not available in its public knowledge base rather than search private sources or guess.

## Required public-release checks

- Replace private workspace deep links with descriptive source titles and authenticated lookup guidance.
- Separate privately reported experience from public research hypotheses unless publication was explicitly approved.
- Run a repository-wide static privacy scan on every pull request and push; failed checks block publication in the documented process.
- Apply a human semantic review for contextual identifiers, indirect re-identification, work-sensitive details and unapproved testimonial material. Scanning alone cannot certify legal compliance.
- Confirm access permissions at the source (including Notion, Drive, links and attachments); removing a link from GitHub does not revoke third-party access.

## Asset hygiene

- Public raster assets should not retain unnecessary EXIF/XMP/Photoshop/comment metadata.
- Public PDFs should retain only deliberately selected descriptive metadata.
- Contact/location identifiers and sensitive JSON-LD fields are release-gated.
- A semantic privacy review remains necessary for substantial biography, memoir, analytics/contact features or public-corpus changes; automated scanners are supplementary.

## Historical copies

When privacy-relevant material is removed from the canonical website, publicly addressable historical deployment snapshots should be retired where the hosting platform permits it. A public repository's Git history, pull requests, caches and forks can preserve removed content. Do not treat updating the default branch as historical erasure. If a genuinely sensitive disclosure is identified, assess actual exposure, revoke public sharing, rotate any compromised credentials, and follow an explicitly approved Git history remediation plan. Never force-push public history solely to remove descriptive non-secret source links.

## Operating rule

**Private continuity is broader than public permission. Publication requires deliberate classification, not mere availability.**
