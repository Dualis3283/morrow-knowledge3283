# Ask Morrow — Workers AI Proof-of-Concept Checkpoint

**Date:** 1 October 2026  
**Status:** response gate passed on Cloudflare Workers AI; staging system/UX closure pending  
**Production exposure:** none

## Exact implementation state

- Website branch: `feature/ask-morrow-prototype`
- Website branch head: `efbe212fb6a2eef8def7086c6d33f1bc011def84`
- Clean immutable staging preview: **`e77f0489`**
- Active provider: **Cloudflare Workers AI**
- Model: `@cf/google/gemma-4-26b-a4b-it`
- Workers AI binding: `AI`
- Staging environment: Preview only
- Staging Production deployments: disabled
- Real production canonical: **`f030df30`**
- Real production Ask Morrow variables/bindings: **none**

The OpenAI adapter remains in source only as an inactive future comparison path. OpenAI billing is no longer required for the proof of concept.

## Why the provider changed

The intended use is a free testing ground rather than a paid production service.

Cloudflare Workers AI fits that purpose because:
- the website and runtime already live on Cloudflare;
- Workers AI can be called through a non-secret binding;
- the Free plan supplies a daily neuron allowance with a hard usage ceiling;
- actual neuron usage is returned by the platform and can be measured directly;
- no external inference API credential is required.

## Cost controls implemented

Gemma 4 runs with thinking disabled for Ask Morrow.

Measured direct probes:

### Tiny connectivity probe

Thinking enabled:
- 36 prompt tokens;
- 40 completion/reasoning tokens;
- **1.418 neurons**;
- ~1.2 seconds;
- no visible answer because the small budget was consumed by reasoning.

Thinking disabled:
- 39 prompt tokens;
- 6 completion tokens;
- **0.518 neurons**;
- ~0.67 seconds;
- correct visible response.

### Realistic Project Morrow prompt

Using two high-relevance retrieved chunks:
- ~937–948 prompt tokens;
- 160–250 output tokens during tuning;
- **12.98–15.34 neurons**;
- ~3.3–4.7 seconds.

At that observed request size, a 10,000-neuron daily allowance corresponds to approximately **650–770 similarly sized requests/day**.

These are measured examples, not a guaranteed average.

The runtime records actual Cloudflare neuron usage when returned, with token-rate estimation only as a fallback.

## Evaluation baseline

The first frozen non-P0 Gemma baseline was deliberately run before remediation.

Result:
- **26 non-P0 response cases**
- **12 / 26 full pass** — 46.2%
- **13 partial**
- **1 fail**

Important: the fluent/factual appearance of an answer did not count as a pass when it missed the frozen requirement.

The main defects were:
- canonical route omissions;
- excessive verbosity / completion truncation;
- navigation-only policy not enforced deterministically;
- one true corpus-boundary failure: memoir content was summarized from incidental public homepage context despite memoir being navigation-only.

This baseline is retained as evidence and was not redefined after seeing the result.

## Remediation

The response architecture was changed at the orchestration layer instead of merely prompting the model harder.

Added deterministic handling for:
- memoir navigation-only policy;
- poetry navigation-only policy;
- public-vs-retrieval corpus distinction;
- unavailable awards/analytics/revenue/chart/employer facts;
- Ask Morrow live-status question;
- explicit route/navigation questions;
- common Project Morrow FAQ;
- common Deck Planner FAQ;
- canonical route attachment for named public projects.

Additional model-side rules:
- ordinary answers target ~80–140 words;
- ordered methods must preserve every required step;
- smallest-useful-change wording retained for scope-control methodology;
- Gemma thinking disabled.

## Release-candidate response gate

The remediated implementation was re-tested against the frozen set.

### Non-P0 primary run

**26 / 26 full pass**

Architecture split:
- **16 / 26** handled deterministically with zero model inference;
- **10 / 26** required Gemma synthesis.

This reduced both cost and policy risk.

### P0 hard gate

Frozen privacy + prompt-injection cases:
- 14 cases;
- 3 required trials each;
- **42 / 42 trials intercepted deterministically before model inference**.

Neuron cost for those trials: **0**.

### Repository regression suite

Current Ask Morrow implementation reached:
- **23 / 23 unit tests passing**;
- static validation passing;
- HTML accessibility sanity passing;
- metadata validation passing;
- secret scan passing;
- publication-privacy validation passing.

A later copy-only UI change removed the requested sentence about private memory/files/Notion/Gmail/admin access from the visible intro. Source readback and staging deployment were verified; server-side privacy rules were unchanged.

## Workers AI binding path

The Cloudflare dashboard initially placed the user-added non-secret `AI` binding in the staging project's Production environment.

Remediation:
1. read back exact binding shape;
2. mirrored `AI` into Preview through Cloudflare project configuration;
3. restored staging to preview-only deployment;
4. removed the unnecessary Production `AI` binding;
5. removed stale Preview `OPENAI_MODEL`;
6. triggered a clean Preview rebuild.

Final staging preview `e77f0489` contains exactly:
- `ASK_MORROW_ENABLED=true`;
- `ASK_MORROW_PROVIDER=cloudflare`;
- `ASK_MORROW_CF_MODEL=@cf/google/gemma-4-26b-a4b-it`;
- Workers AI binding `AI`.

No OpenAI secret or model variable remains in the running staging preview.

## User-side runtime evidence

While authenticated through Cloudflare Access, the user successfully asked:

**“What is Project Morrow?”**

The staging UI returned the expected deterministic FAQ response with:
- the Morrow continuity/method summary;
- evidence/interpretation distinction;
- explicit human agency/authorship boundary;
- canonical `/projects/morrow/` route.

That FAQ path uses zero Workers AI neurons.

## Remaining system/UX gate

The response-behaviour gate is passed, but public beta is **not yet approved**.

Still to verify under the Access-protected staging page:
1. one authenticated **model-bound** question through the actual Pages Function + `env.AI.run()`;
2. keyboard-only interaction walkthrough;
3. active-provider rate/error behaviour where practical;
4. final system/UX checklist readback.

Cloudflare Access should remain enabled during these checks.

## Next action

Use the authenticated staging page to ask a model-bound question such as:

**“How should Morrow treat evidence and interpretation?”**

If that succeeds, capture the response and complete the remaining system/UX gate before any PR or production/public-beta decision.
