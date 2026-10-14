# Morrow Phase 3 — Live External Model Pilot Access Log

**Run date:** 14 October 2026 (Europe/Dublin). **Status: BLOCKED — zero usable external model responses.**
**Scope:** Determine whether real external AI model replies can be collected from supported browser access paths using public-safe synthetic tests. This is an **access feasibility pilot**, not model benchmarking or external certification.

## Source material
- Owner-approved [primary P0 strategic goal](../00-CORE/STRATEGIC_DIRECTION_2026-10-14.md).
- [Phase 3 handoff on `main`](../03-WORKING_STATE/MORROW_CORE_PHASE3_HANDOFF_2026-10-14.md).
- [Morrow Core v0.2 draft](../00-CORE/MORROW_CORE_V1_DRAFT.md), observed GitHub blob SHA `7afa340da40789153cc510ee9f01048365f2cff0`, not ratified.
- [Existing 16 candidate conformance cases](CORE_V1_CONFORMANCE_CASES.md).
- [Three frozen synthetic pilot fixtures](PHASE3_LIVE_PILOT_FIXTURES_V0_1.json).

## Actual attempted interactions

| Route | Exact observed stage | Status | Model evidence |
|---|---|---|---|
| Duck.ai anonymous chat | Model menu visible; tried T02 via claimed Claude Haiku 4.5 selection. Prompt appeared in chat; a CAPTCHA challenge requesting duck-square selection blocked response. Model-selection state was not independently confirmed at completion. | **BLOCKED / NO OUTPUT** | No model response; cannot attribute a result to Claude |
| PLAI.chat guest free model | T02 prompt visible in submitted chat. Page reported Cloudflare Turnstile browser-verification failure and did not call model. Exact downstream model ID was not displayed, only `FREE`. | **BLOCKED / NO OUTPUT** | No inference response; error text is a website error, not a model answer |
| Perplexity.ai guest Search | Homepage allowed typing. On submitting T02, a `Sign in to continue using Perplexity` gate appeared. No identifiable response or model ID. | **BLOCKED / NO OUTPUT** | No observable model answer |
| SurfSense /free | Homepage advertises no-login AI, but actual hosted chat removed/redirects to desktop/local app; no usable text input on site. | **UNAVAILABLE** | No model call |
| Composio direct inference discovery | `openai` and `replicate` connectors reported **no active connection**. Did not request, create or expose any API key. | **AUTHENTICATION REQUIRED** | No model call |

### Operational constraints observed
The Firecrawl browser service rejected an initial `zeroDataRetention=true` request because this setting was not enabled. Continued only with **synthetic, non-personal prompts**; no private Morrow project data, user identity, secrets or credentials were submitted to third-party chat sites. Browser sessions were stopped after checks. No CAPTCHA/login challenge was circumvented.

## Integrity and rubric
- **Completed external model responses: 0.** **Completed paired A/B comparisons: 0.** Pass/fail scores: **NOT OBSERVED / N/A**.
- The prior **14/14 Bridge validator tests** are separate code tests, not live-model tests.
- "Website accepted typed text" is not proof the target model executed the prompt.
- Do not score a failed browsing session as model failure, silently swap providers, or attribute unidentified third-party replies to a named model.
- User access/permission, terms of service, cost and retention checks are prerequisites for further testing.

## Next executable route
Use a user-authorized signed-in browser in ChatGPT Work mode or connect an authorized model API/runtime. For a reproducible research benchmark prefer official provider endpoints with pinned model version, explicit costs and permissions. First run T01/T02/T06 A/B with one provider and record exact raw outputs; then replicate on two other independent implementations (including local) and expand to T01–T16.

**Checkpoint:** access feasibility work performed and documented; real live-model behavioral testing remains unstarted. Do not present 0/3 access attempts as sample model quality or effectiveness percentages.
