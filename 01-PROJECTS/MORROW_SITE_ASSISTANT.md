# Ask Morrow — Public Website Assistant

**Status:** Phase 0 complete; public corpus definition / read-only prototype next  
**Date:** 1 October 2026

## Purpose

Create a public-facing assistant that helps visitors understand David Walsh's work by using the **Morrow ethos and methodology** rather than behaving like a generic website chatbot.

The assistant should guide, explain and connect context. It should not pretend to be David, should not make decisions for visitors, and should not claim access to private continuity that has not been deliberately published.

Working name:
- **Ask Morrow**

## Core behavioural model

The public assistant should inherit the public-safe Morrow operating sequence:

**Context → Evidence → Pattern → Interpretation → Action → Verification → Lesson**

Response principles:
- context before conclusion;
- evidence before interpretation;
- distinguish confirmed facts, interpretation and unknowns;
- preserve human agency and authorship;
- explain method rather than hide it;
- make uncertainty visible;
- avoid passive agreement;
- prefer inspectable/reversible next steps;
- never claim private memory or source access it does not have.

For substantial answers, adapt:

**Context → Evidence → Findings → Interpretation → Actions / Next steps**

The assistant should remain conversational rather than mechanically printing those headings every turn.

## Recommended v1 architecture

### Browser

A small accessible chat interface on the site:
- optional floating **Ask Morrow** entry point;
- full panel or dedicated Morrow page;
- keyboard-accessible controls;
- visible disclosure that answers are AI-generated;
- current page URL/title can be supplied as context so Morrow can answer questions about the page the visitor is viewing.

### Server boundary

Use a same-origin Cloudflare Pages Function, for example:

`POST /api/morrow-chat`

Responsibilities:
- validate request size/shape;
- apply abuse/rate controls;
- hold the AI API credential server-side;
- construct the Morrow instruction layer;
- call the model API;
- return only the response data required by the UI;
- log only privacy-minimal operational data.

Never expose a standard API key in browser JavaScript.

### Model interface

Use OpenAI's **Responses API** for new work.

A first version does not require D1, KV or R2.

Privacy-first session option:
- keep a bounded recent transcript in browser state;
- send the necessary recent turns with each request;
- use non-durable response storage where practical;
- do not create a permanent visitor identity.

A later version could add durable conversation state only if a demonstrated user need justifies the retention/privacy trade-off.

## Knowledge boundary

The website assistant must use a **curated public knowledge set**, not David's private memory.

Recommended public knowledge sources:
- selected public-safe files from `morrow-knowledge3283`;
- public website copy;
- approved project summaries;
- approved release/creative metadata;
- explicit source links.

Do **not** expose by default:
- private Notion pages;
- private ChatGPT memory/history;
- Gmail or personal contacts;
- private files;
- website-repository write credentials;
- GitHub write actions;
- Cloudflare administration;
- personal/sensitive memoir source material beyond what is already approved for publication.

## Retrieval

For v1, use a small curated knowledge corpus.

Preferred pattern:
- upload approved Morrow/site documents to a searchable knowledge store;
- allow the assistant to retrieve only from that corpus;
- return source/page references when a factual answer relies on the corpus.

The public bot should be able to say:
- “I don't have that in the public Morrow knowledge base.”
- “This is an interpretation, not a recorded decision.”
- “That information is private/not published.”

## Action boundary

**v1 should be read-only.**

Allowed:
- explain pages/projects;
- connect related work;
- explain Morrow methodology;
- guide visitors to Deck Planner, poetry, music, memoir or professional work;
- answer public project questions;
- suggest where to look next.

Not allowed in v1:
- edit the website;
- update Notion;
- write to GitHub;
- deploy Cloudflare;
- send email/messages;
- access private personal data;
- make purchases or external commitments.

Public write/action tools should be considered only after explicit threat modelling, authorization design and a real user need.

## Recommended interaction examples

- “What is Project Morrow?”
- “How does Morrow differ from a normal chatbot?”
- “How did the Morrow method affect the Deck Planner?”
- “Show me how the poetry and music connect.”
- “What should I look at if I'm interested in systems thinking?”
- “Explain Compleated Loyalty without assuming I play Magic.”
- “What is confirmed versus still experimental in this project?”

## Quality / evaluation gate

Do not ship solely because the assistant sounds plausible.

Before public release, create a fixed evaluation set covering:
- factual grounding;
- source boundary;
- private-data refusal;
- uncertainty handling;
- correct Morrow methodology;
- page routing;
- hallucination resistance;
- prompt-injection attempts;
- mobile accessibility;
- latency/error states;
- abuse/cost controls.

A public assistant should only be described as “Morrow” after those evaluations show it behaves consistently enough with the published model.

## Relationship to the existing Morrow instance

The site assistant can **act according to the Morrow ethos and methodology**, but it is not automatically the same continuity-bearing instance used in private ChatGPT work.

Correct framing:

> A public-facing Morrow instance, grounded in a curated public knowledge base and the published Morrow operating model.

This preserves continuity of method without falsely claiming continuity of private memory.

## Suggested implementation phases

### Phase 0 — public Morrow page
**Complete 1 October 2026.** The dedicated public page is live at `/projects/morrow/`, uses only public-safe Morrow material, and explicitly distinguishes public method continuity from private memory continuity.

### Phase 1 — public corpus + read-only prototype
- freeze the approved public knowledge corpus and source registry;
- define the fixed evaluation set before exposing the assistant;
- same-origin Pages Function;
- Morrow instructions;
- small curated corpus;
- no durable user memory;
- no external actions;
- test locally/staging only.

### Phase 2 — evaluation
Run fixed test cases and mobile/accessibility review.

### Phase 3 — limited public beta
Expose Ask Morrow with clear AI/public-data disclosure and feedback controls.

### Phase 4 — evidence-led expansion
Only add durable sessions, richer retrieval or additional tools if actual use demonstrates the need.

## Decision

**Feasible with the current website architecture.**

Existing Pages Functions already prove the site can host same-origin server logic. No new database is required for a privacy-first v1. The main new dependency is a server-side model API credential plus a deliberately curated public knowledge corpus.


## Phase 0 production evidence — 1 October 2026

- Website merge: `e7b00b2e0c31b5898991d9df747f931ad2303f25`.
- Cloudflare production: `80cea668`.
- Public route: `/projects/morrow/`.
- 390×844 canonical mobile render: passed with no horizontal overflow or duplicate IDs.
- Homepage Project Morrow CTA: verified live.
- Discovery metadata / sitemap / robots / social card: verified live.
- Production smoke and Deck Planner resolver contract: passed.

### Next concrete dependency

Before implementing `/api/morrow-chat`, define an explicit **public Morrow corpus manifest**:
- included source files;
- excluded/private source classes;
- source dates/versions;
- approved factual/project summaries;
- how answers cite or route back to website sources;
- behaviour when the corpus does not contain an answer.

Then build a staging-only read-only prototype and evaluate it before any public beta.


## Publication privacy gate

The public assistant corpus is governed by `00-CORE/PUBLICATION_PRIVACY.md`.

Before any source enters the public corpus:
- classify it Public, Personal-but-approved, or Private-never-publish;
- exclude private ChatGPT memory/history, private Notion/Gmail/files, private correspondence, health/family/financial/location/contact information and unapproved memoir/journal material;
- require a new explicit approval for any exception;
- preserve an auditable corpus manifest showing source/version and approval status.

**Default:** if the public corpus does not contain the answer, Ask Morrow should say so. It must not silently retrieve from private continuity.


## Corpus privacy precondition — locked 1 October 2026

Before Phase 1 implementation, every Ask Morrow corpus source must be recorded in a manifest with:
- source/path;
- version/date;
- publication classification;
- explicit inclusion reason;
- public citation/routing target where applicable.

The corpus inherits `00-CORE/PUBLICATION_PRIVACY.md`.

Private-never-publish material is not eligible for retrieval even if available to the private Morrow instance or a connected source.

The website's privacy-hardening release also removed unnecessary location/account-origin detail and machine-readable cross-platform correlation, so the public corpus should not reintroduce those details indirectly.


## Corpus v1.0-eval freeze — 1 October 2026

Phase 1A is complete.

The initial public retrieval boundary is frozen in:

`01-PROJECTS/ASK_MORROW_CORPUS_MANIFEST.md`

with the supporting navigation map:

`06-SOURCES/ASK_MORROW_PUBLIC_ROUTE_CATALOG.md`

Version anchors:
- Morrow knowledge: `9b416f8b19b6ce77adf8ca46bd915330271f3209`
- Website: `2f8f3cfac166225849445779a059a05431eca8da`

The v1 corpus intentionally excludes private continuity, operational state, archives, measurement logs, source registries, intimate memoir/poetry body text and external-profile crawling.

**Next phase:** define the fixed evaluation set against this frozen corpus before implementing any chat endpoint.


## Corpus v1.0-eval validation

Phase 1A validation completed 1 October 2026.

Machine-readable index:
`06-SOURCES/ASK_MORROW_CORPUS_V1.json`

Validation record:
`05-RESEARCH/ASK_MORROW_CORPUS_VALIDATION.md`

Results:
- 18 / 18 pinned paths resolved at the frozen commits;
- 7 included Morrow files;
- 9 included website pages;
- 2 navigation-only creative pages;
- 0 direct privacy signals across the 11 checked website pages for the hardened contact/location/correlation patterns.

**Phase 1A is complete. Next: Phase 1B — fixed evaluation set.**


## Evaluation set v1.0 freeze — 1 October 2026

Phase 1B is complete.

Fixed evaluation specification:
`05-RESEARCH/ASK_MORROW_EVALUATION_SET.md`

Machine-readable cases:
`05-RESEARCH/ASK_MORROW_EVAL_V1.json`

Coverage:
- 40 response-behaviour cases;
- 8 system/UX cases;
- 48 total.

P0 privacy, prompt-injection, request/rate/dependency and credential cases are hard release gates.

**Next phase:** Phase 1C — build a staging-only, read-only prototype against the frozen corpus and evaluation set. No public beta until the evaluation gate passes.


## Phase 1C staging checkpoint — 1 October 2026

The read-only prototype scaffold is implemented and verified in staging.

Detailed evidence:
`01-PROJECTS/ASK_MORROW_PHASE1C_STATUS.md`

Website feature head:
`aecf9b2256d043c6b098885263ef913ffcd3cbe2`

Immutable staging preview:
`eb675ee1`

Verified:
- frozen 24-chunk deterministic retrieval corpus;
- public/private boundary;
- exact 14-case P0 deterministic regression;
- request validation / same-origin / rate controls;
- no-retrieval fallback;
- traceable source IDs;
- stateless session design;
- no private/write tools;
- 18/18 repository unit tests + existing site QA;
- real 390×844 and 320×568 mobile renders with no overflow and >=44px visible touch targets.

Pending:
- staging server-side OpenAI API key is not bound;
- model-generated response evaluation has not run;
- full keyboard-only interaction evaluation remains pending;
- no PR / production exposure.

**Next:** securely complete staging-only model credential setup, then execute the frozen evaluation suite. Do not loosen the evaluation to accommodate prototype behaviour.


## Phase 1C model-runtime checkpoint — 1 October 2026

The trusted model credential is now present in the isolated staging project, but the model-dependent evaluation has not begun because the OpenAI API project reports billing inactive.

Current website feature head:
`b4af125710932030ba077aca210fa6ecefd9c613`

Current isolated staging canonical deployment:
`b962d551`

### Secret isolation

- real production project `david-walsh`: no OPENAI_API_KEY and no Ask Morrow env vars;
- isolated project `david-walsh-staging`: OPENAI_API_KEY exists as encrypted secret_text;
- staging evaluation runtime also has ASK_MORROW_ENABLED=true and OPENAI_MODEL=gpt-6-luna.

The key value was never read or exposed. The user-added secret initially existed in both staging and the real production project. The production copy was removed immediately before model evaluation continued.

### Staging runtime adaptation

Because Cloudflare mobile stored the secret in the staging project's Production environment rather than Preview, the separate staging project was temporarily configured so its own production branch is `feature/ask-morrow-prototype`. This does not change the real `david-walsh` production project.

### Model-path evidence

- health: HTTP 200;
- modelConfigured: true;
- corpus: ask-morrow-v1.0-eval;
- 24 corpus chunks;
- read-only/stateless.

A single grounded model probe reached the OpenAI API and returned upstream HTTP 429 with error type/code `billing_not_active`.

This confirms Cloudflare can read the secret and the Pages Function can reach OpenAI. The remaining blocker is API account/project billing, not website code, secret format or Cloudflare routing.

A staging-safe diagnostic now returns only upstream error type/code and never exposes the key or raw upstream account data.

### Gate status

Still pending:
- OpenAI API billing activation;
- successful first grounded model response;
- 40 frozen model-dependent response cases / required P0 trials;
- active dependency-failure checks;
- full keyboard-only interaction review;
- final frozen evaluation score.

No PR to `main` and no production promotion is permitted until those gates pass.


## Workers AI proof-of-concept checkpoint — 1 October 2026

OpenAI billing is no longer a prerequisite for Ask Morrow.

Detailed checkpoint:
`01-PROJECTS/ASK_MORROW_WORKERS_AI_CHECKPOINT.md`

Current website branch head:
`efbe212fb6a2eef8def7086c6d33f1bc011def84`

Clean staging preview:
`e77f0489`

Active provider:
`@cf/google/gemma-4-26b-a4b-it` through Cloudflare Workers AI binding `AI`.

Response-gate results:
- initial non-P0 baseline: 12/26 full pass;
- remediation preserved that baseline as evidence rather than redefining the test;
- release-candidate non-P0 primary: **26/26 full pass**;
- P0 privacy/injection hard gate: **42/42 required trials pass**, zero inference;
- 16/26 non-P0 cases now use deterministic zero-neuron paths;
- 10/26 require Gemma synthesis.

Measured realistic two-chunk requests consumed **12.98–15.34 neurons**, implying roughly **650–770 similarly sized requests/day** within a 10,000-neuron daily allowance.

Current staging is Cloudflare-only:
- no OpenAI key;
- no OpenAI model variable;
- staging Production deployments disabled;
- real production unchanged at `f030df30`.

**Next:** close the Access-protected system/UX gate with at least one authenticated model-bound website request plus keyboard-only interaction review. No production/public-beta promotion yet.
