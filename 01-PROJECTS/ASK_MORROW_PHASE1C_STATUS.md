# Ask Morrow — Phase 1C Staging Prototype Status

**Checkpoint:** 1 October 2026  
**Status:** staging prototype infrastructure verified; model-dependent evaluation pending  
**Production exposure:** none

## Exact staging state

- Feature branch: `feature/ask-morrow-prototype`
- Current branch head: `aecf9b2256d043c6b098885263ef913ffcd3cbe2`
- Immutable staging preview: **`eb675ee1`**
- Pages Functions: active
- Corpus: `ask-morrow-v1.0-eval`
- Embedded retrieval chunks: **24**
- Model selection: `gpt-6-luna`
- `OPENAI_API_KEY`: **not configured**
- Production Pages project Ask Morrow env vars: **none**

The staging prototype is intentionally unavailable as a production/public-beta feature.

## Implemented architecture

1. bounded JSON request validation;
2. same-origin request enforcement;
3. ephemeral anonymous hashed-IP rate control;
4. deterministic protected-source/privacy/prompt-injection boundary;
5. deterministic retrieval from the frozen versioned public corpus only;
6. model generation path using the Responses API only when a server-side key exists;
7. `store:false` on model requests;
8. source IDs + retrieval trace returned separately from generated text;
9. bounded recent transcript supplied by the browser session only;
10. no D1, KV, R2, vector database, private connectors or write tools.

## No-key runtime verification

- health: **200** — read-only, stateless, corpus identified, model not configured;
- privacy request: **200 boundary** — no model call, source M-A01;
- nonsense / no retrieval: **200 fallback** — no sources, no model call;
- grounded query without key: **503 model_not_configured** with approved retrieval trace;
- cross-origin POST: **403**;
- unsupported method: **405**;
- invalid JSON: **400**;
- empty request: **400**;
- rate control: requests 1–10 accepted; requests 11–13 returned **429** with `Retry-After: 60`.

## P0 boundary verification

The exact 14 frozen privacy / prompt-injection response cases from `ask-morrow-eval-v1.0` were executed against the deterministic boundary.

Result: **14 / 14 intercepted before retrieval/model generation.**

Permanent fixture:
`tests/fixtures/ask-morrow-p0.json`

## Repository QA

At current head:
- unit tests: **18 / 18 pass**;
- Deck Planner resolver regressions: pass;
- repository static validation: pass;
- HTML accessibility sanity: pass;
- discovery metadata validation: pass;
- source secret scan: pass;
- publication privacy validation: pass.

## Mobile / accessibility evidence

Initial rendered staging checks found:
1. hidden mobile navigation because the shared menu-toggle contract was omitted;
2. mobile header controls below the 44px touch baseline.

Both were repaired.

Final rendered checks:

### 390 × 844
- no horizontal overflow;
- one H1;
- no duplicate IDs;
- menu opens;
- Project Morrow + Home visible;
- minimum visible target: **44px**;
- textarea programmatically labelled.

### 320 × 568
- no horizontal overflow;
- one H1;
- no duplicate IDs;
- menu opens;
- composer visible;
- Project Morrow + Home visible;
- minimum visible target: **44px**;
- textarea programmatically labelled.

A full keyboard-only interaction walkthrough remains part of the later evaluation gate.

## Defects caught during Phase 1C

1. Initial generated-write transport syntax failure; no repository mutation.
2. Page-context boosting caused false retrieval for a nonsense query; fixed so page boost requires a real token match.
3. Health GET routing was not handled as intended; fixed with explicit generic request routing.
4. Sequential connector writes appended `onRequest` twice; Cloudflare build `e25953c5` failed with duplicate export and was repaired.
5. Rendered mobile audit found inaccessible navigation; shared toggle / ARIA contract restored.
6. Rendered audit found header/menu targets below 44px; prototype-only touch hardening added.

## Current blocker / next dependency

The trusted OpenAI API-key setup flow has been initiated, but **no server-side key is currently bound to Cloudflare staging**.

Do not place a raw API key in chat, Git, browser JavaScript or public configuration.

Once a staging-only server key is securely configured:
1. verify credential containment;
2. execute the frozen model-dependent response cases and required P0 trials;
3. exercise active model/dependency failure paths;
4. complete keyboard-only interaction review;
5. score the frozen evaluation gate;
6. only then decide whether a limited public beta is eligible.

**No PR to main and no production promotion should occur before the evaluation passes.**
