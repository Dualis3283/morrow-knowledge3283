# Ask Morrow — Public Corpus Manifest v1.0-eval

**Status:** Frozen for evaluation; not yet connected to a public chatbot  
**Freeze date:** 1 October 2026

## Version anchors

This manifest defines the exact source boundary for the first read-only Ask Morrow evaluation corpus.

- **Morrow knowledge repository:** `Dualis3283/morrow-knowledge3283`
- **Morrow source commit:** `9b416f8b19b6ce77adf8ca46bd915330271f3209`
- **Website repository:** `Dualis3283/david-walsh-site`
- **Website source commit:** `2f8f3cfac166225849445779a059a05431eca8da`
- **Canonical privacy-hardened website deployment:** `f030df30`

The corpus may not silently follow `main`. Any source change after these anchors requires an explicit manifest revision and privacy review before it enters Ask Morrow retrieval.

## Governing rule

The corpus inherits:

`00-CORE/PUBLICATION_PRIVACY.md`

**Private continuity is broader than public permission.**

A fact being available to the private Morrow instance, Notion, ChatGPT memory, Gmail, files, or another connector does **not** make it eligible for the public corpus.

## Retrieval authority

When sources disagree, public Ask Morrow should prefer:

1. Publication Privacy Standard.
2. Public Morrow ethos / operating model.
3. Current approved public website source at the pinned website commit.
4. Approved public project knowledge files.
5. Curated route catalogue.
6. Assistant interpretation.

No lower source may override the privacy boundary or present stale operational state as current.

---

## A — Included Morrow knowledge sources

These files are approved for direct retrieval in v1.

| ID | Source | Classification | Role |
|---|---|---|---|
| M-A01 | `00-CORE/PUBLICATION_PRIVACY.md` | Public / policy | Hard publication and retrieval boundary. |
| M-A02 | `00-CORE/MORROW_ETHOS.md` | Public | Purpose, principles, human agency and continuity. |
| M-A03 | `00-CORE/OPERATING_MODEL.md` | Public | Core loop, dialogue rules, analysis/recommendation/execution modes. |
| M-A04 | `00-CORE/CONSISTENCY_PROTOCOL.md` | Public | Verification depth, source discipline, uncertainty handling. |
| M-A05 | `00-CORE/VISUAL_SYSTEM.md` | Public | Public design language and cross-project visual principles. |
| M-A06 | `02-KNOWLEDGE/BEST_PRACTICES.md` | Public | Reusable learned rules for continuity, verification, scope and production. |
| M-A07 | `01-PROJECTS/COMPLEATED_LOYALTY.md` | Public | Approved public-safe project knowledge for Compleated Loyalty. |

### Why the initial set is intentionally small

v1 is designed to test whether Ask Morrow can:
- explain the Morrow method;
- distinguish evidence from interpretation;
- guide visitors through approved projects;
- preserve the publication boundary;
- say when the corpus does not contain an answer.

Breadth is not the initial objective. Inspectability is.

---

## B — Included website retrieval sources

The following public website pages are approved as factual / navigation retrieval sources at website commit `2f8f3cfa...`.

| ID | Route | Classification | Retrieval purpose |
|---|---|---|---|
| W-B01 | `/` | Public | Site identity, high-level disciplines, project/release navigation. |
| W-B02 | `/about/` | Public | Approved author/creative identity only. |
| W-B03 | `/professional/` | Public | Approved professional-method summary; no private employer data. |
| W-B04 | `/projects/morrow/` | Public | Primary visitor-facing explanation of Project Morrow. |
| W-B05 | `/projects/deck-planner/` | Public | Deck Planner purpose, workflow and user-facing feature explanations. |
| W-B06 | `/projects/compleated-loyalty/` | Public | Visitor-facing Compleated Loyalty story and project material. |
| W-B07 | `/releases/ascension/` | Public | Approved Ascension release information. |
| W-B08 | `/releases/duality-unfolding/` | Public | Approved Duality Unfolding release information. |
| W-B09 | `/releases/pearlescent-gaze/` | Public | Approved Pearlescent Gaze release information. |

### Website ingestion rule

For v1:
- ingest **visible page text and approved metadata only**;
- exclude script bodies, source comments, deployment identifiers, hidden implementation details and administrative metadata;
- route answers back to the canonical public URL where useful.

---

## C — Navigation-only sources

These destinations may be named and linked by Ask Morrow, but their body text is **not** part of the v1 retrieval corpus.

| ID | Route / source class | Classification | Reason |
|---|---|---|---|
| N-C01 | `/memoir/` | Personal but approved | Public excerpt is intentional, but intimate autobiographical text is unnecessary for v1 retrieval. |
| N-C02 | `/poetry/` | Personal but approved | Public creative work remains available to visitors without becoming general chatbot retrieval context. |
| N-C03 | Public downloadable PDFs | Public | Linkable project resources; not required for initial chatbot grounding. |
| N-C04 | LinkedIn / Spotify / YouTube / Amazon destinations | Public external | Ask Morrow may route visitors there but must not crawl or ingest external profile content in v1. |

Ask Morrow may say that these resources exist and provide the public site route. It must not quote, infer from, or summarize un-ingested body content as though it retrieved it.

---

## D — Explicitly excluded sources

These sources are **not eligible** for v1 retrieval.

| Source class | Reason |
|---|---|
| Private ChatGPT memory/history | Private continuity is not publication permission. |
| Private Notion pages/databases | Operational/private source. |
| Gmail / correspondence | Private. |
| Personal files / connected app content | Private unless separately approved into the corpus. |
| Unapproved memoir/journal/autobiographical source material | Private. |
| Health, family, relationship, financial, contact or precise-location context | Private-never-publish by default. |
| Names/details of non-public third parties | Private-never-publish by default. |
| `03-WORKING_STATE/*` | Operational state; unnecessary and may expose implementation detail/stale state. |
| `04-DECISIONS/DECISION_LOG.md` | Contains historical operational decisions and stale website-state entries; not suitable for v1. |
| `05-RESEARCH/*` | Measurement/workflow research is not needed for visitor grounding in v1. |
| `06-SOURCES/SOURCE_REGISTRY.md` | Contains internal source pointers / operational links. |
| `07-ARCHIVE/*` | Historical/superseded state; high stale-state risk. |
| `01-PROJECTS/WEBSITE_AND_APPS.md` | Contains deployment/operational history beyond visitor need. |
| `01-PROJECTS/PROJECT_REGISTER.md` | Public-safe but contains mixed/stale operational state; excluded until refreshed for corpus use. |
| `01-PROJECTS/MORROW_SITE_ASSISTANT.md` | Implementation planning for the assistant itself; excluded to avoid self-referential retrieval loops. |
| Raw GitHub history / commits / issues | Versioning evidence, not visitor corpus content. |
| Cloudflare / GitHub / Notion administration | No public assistant access. |

---

## E — Behaviour when information is missing

Ask Morrow must not bridge a corpus gap by searching private continuity.

Approved fallback:

> “I don't have that information in the public Morrow knowledge base.”

Where useful, it may add:
- which public source it did check;
- a relevant public route;
- whether the answer would require private or unapproved information;
- a request for the visitor to reframe around public material.

It must not imply that unavailable public information does not exist privately.

---

## F — Citation / routing expectations

For factual answers grounded in the corpus:
- prefer a short answer plus the relevant public website route;
- distinguish recorded fact from interpretation;
- when discussing Morrow methodology, name the principle or operating step being applied;
- if multiple approved sources disagree, state the conflict rather than silently choosing a convenient version;
- never cite private/internal destinations.

---

## G — Corpus update process

A corpus change requires:

1. proposed source;
2. privacy classification;
3. inclusion purpose;
4. source version/date;
5. semantic privacy review;
6. stale/conflict review against current included sources;
7. manifest revision;
8. evaluation rerun before public deployment.

**No automatic “include everything public” rule exists.**

---

## H — Freeze decision

**v1.0-eval is frozen for evaluation.**

Approved retrieval set:
- **7** Morrow knowledge files;
- **9** website pages.

Navigation-only:
- memoir;
- poetry;
- public PDFs;
- external public profiles/platforms.

Everything else remains excluded until explicitly admitted by a later manifest revision.
