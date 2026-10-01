# Ask Morrow — Model Runtime Checkpoint

**Date:** 1 October 2026  
**Status:** staging model path wired; API billing inactive; evaluation paused

## Exact state

- Website feature branch: `feature/ask-morrow-prototype`
- Website feature head: `b4af125710932030ba077aca210fa6ecefd9c613`
- Isolated staging canonical: **`b962d551`**
- Real production canonical: **`f030df30`**
- Real production Ask Morrow env vars: **none**
- Staging key: present as encrypted `secret_text`
- Staging model: `gpt-6-luna`
- OpenAI model probe result: **429 `billing_not_active`**

## Interpretation

The secure credential path and Cloudflare → OpenAI network/model path are functioning far enough to reach the OpenAI API. The current blocker is account/project API billing activation. It is not a retrieval, Pages Function, secret-format, Cloudflare, or corpus failure.

## Release status

Ask Morrow remains staging only, read only, not merged to `main`, not enabled in the real production project, and not eligible for public beta until the frozen evaluation passes.

## Next action

Activate API billing for the OpenAI project associated with the staging key, then resume from the single grounded model probe before running the frozen evaluation suite.
