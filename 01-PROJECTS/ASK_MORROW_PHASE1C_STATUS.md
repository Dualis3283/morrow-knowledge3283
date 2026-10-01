# Ask Morrow — AI Workflow / Staging Checkpoint

**Checkpoint:** 1 October 2026  
**Status:** staging architecture preserved; provider evaluation paused at Cloudflare authentication restoration  
**Production exposure:** none

## Confirmed current state

- Ask Morrow remains a **staging-only** experiment.
- Public/private separation remains mandatory: the assistant may use only the curated public-safe Morrow corpus.
- Frozen corpus: `ask-morrow-v1.0-eval`.
- Frozen evaluation set: **40 response cases + 8 system/UX cases**.
- Deterministic privacy / prompt-injection boundary remains part of the design.
- No private Notion, Gmail, files, personal history, credentials, or write-capable tools belong in the public runtime.
- The OpenAI staging path was reached successfully after a staging-only key was bound, but the API project returned **HTTP 429 `billing_not_active`**. No production key/binding should exist.
- Because this is a proof-of-concept intended to minimise recurring cost, **Cloudflare Workers AI is the next provider to evaluate** before enabling paid OpenAI API billing.
- Provider abstraction remains the intended design so Workers AI and OpenAI are implementation choices rather than architectural lock-in.

## Cloudflare access checkpoint

Historical project work established a dedicated scoped API-token path that could return real Cloudflare HTTP 200 responses and manage Pages/deployments.

During this checkpoint, the currently exposed Composio Cloudflare connection reported itself as **ACTIVE**, but a real account API call failed with:

- **HTTP 400**
- **Invalid request headers**
- **Invalid format for `X-Auth-Key` header**

Therefore a connector badge is **not** evidence of usable Cloudflare authentication.

Do not continue Workers AI implementation through the rejected legacy `X-Auth-Key` path.

### Authentication rule

Use the previously proven **scoped API-token / Cloudflare MCP path**.

Do not use:
- raw credentials in chat;
- browser/client-side secrets;
- Git-tracked secrets;
- legacy email + Global API Key authentication for this workflow.

## Best next actions

### Gate 0 — restore access; no code commit

1. Restore/reconnect the scoped Cloudflare API-token path.
2. Prove it with a real account-level Cloudflare request returning success.
3. Read back `david-walsh-staging`.
4. Confirm the production project remains free of Ask Morrow provider secrets/bindings.
5. Confirm the staging project is the only target for model experiments.

**This is an authentication repair, not a source-code change. Do not create a code commit merely to record credential churn.**

### Commit 1 — provider boundary

After Gate 0 passes:

- re-verify the actual head of `feature/ask-morrow-prototype`;
- preserve the deterministic boundary/retrieval path;
- introduce or normalise a small provider adapter interface;
- keep provider-specific code behind that interface;
- keep secrets and environment-specific identifiers out of source.

Suggested commit intent:

`refactor(ask-morrow): isolate model provider boundary`

### Commit 2 — Workers AI staging provider

Only after Commit 1 is clean:

- add a Workers AI provider implementation using the Cloudflare `AI` binding / `env.AI`;
- perform the smallest possible staging inference first;
- fail closed when the binding/model is unavailable;
- retain the existing privacy/retrieval boundary;
- do not alter production bindings.

Suggested commit intent:

`feat(ask-morrow): add staging Workers AI provider`

### Commit 3 — evaluation telemetry

After a real inference succeeds:

- record provider, model identifier, request outcome, latency and bounded usage metadata needed for cost/capacity comparison;
- do **not** log private prompts, credentials, private source content, or unnecessary visitor identifiers;
- keep instrumentation sufficient to compare free/low-cost proof-of-concept behaviour with a future paid provider.

Suggested commit intent:

`test(ask-morrow): instrument provider evaluation`

## Evaluation gate

Run the frozen **48-case** evaluation only after the staging model path works.

Required before any PR/public beta decision:

1. frozen response cases executed;
2. P0 privacy/prompt-injection trials remain intercepted before unsafe model use;
3. active provider/dependency failure paths exercised;
4. keyboard-only interaction gate completed;
5. latency/usage captured;
6. failures and regressions recorded;
7. production-secret/binding check repeated.

**No PR to `main`, no production promotion, and no public Ask Morrow endpoint until the evaluation gate passes.**

## Current unknowns

- The current exact head of the private `Dualis3283/david-walsh-site` feature branch was not independently read back during this checkpoint because the present direct GitHub connection did not expose that private repository. Re-verify it before the first source commit.
- Workers AI binding resolution (`env.AI`) has not yet been proven in the resumed session.
- No successful Workers AI model inference has yet been recorded.
- Comparative latency/cost/quality data does not yet exist.

## Resume point

**Restore scoped Cloudflare token access → prove HTTP success → inspect staging → minimal `env.AI` inference → provider-adapter commits → frozen evaluation → decision on public beta/provider economics.**
