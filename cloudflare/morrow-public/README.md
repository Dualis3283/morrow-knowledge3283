# Morrow Public Publisher and Bridge — Candidate Worker

**Scope:** public-safe read-only Worker source code, not deployed, not an officially ratified Morrow Core specification.

## Routes

| Route | Function |
| --- | --- |
| GET / | Static accessible overview page |
| GET /api/v0/framework | Non-normative method and lifecycle vocabulary |
| GET /api/v0/documents | Pinned public GitHub documents; draft RFC explicitly marked |
| GET /api/v0/synthetic-cases | Three synthetic examples without result claims |
| GET /.well-known/morrow.json | Public discovery manifest |
| GET /healthz | Test readiness indicator, not external uptime proof |
| POST /mcp | Experimental public-only JSON-RPC tool/resource prototype |

Privacy and safety: no user sessions, secrets, private Notion or Gmail connectors, personal knowledge store, model API, tracking, outbound network calls, write tools or social posting. A model-provided argument cannot access local or external private paths.

**MCP status:** experimental candidate. Successful local JSON-RPC unit tests do not prove compliance with every official MCP requirement. Test independent protocol clients before advertising conformance.

## Test

Requires Node 22. Run: node --test cloudflare/morrow-public/test/*.test.mjs

GitHub Actions runs deterministic negative and positive tests, and validates the Wrangler configuration. Passing Node tests does not prove an actual Cloudflare production runtime.

## Deployment gate (not executed)

1. Repair Cloudflare authentication; all connected Cloudflare access paths returned HTTP 400 errors on 19 October 2026.
2. Confirm the intended account and isolate this service from the existing knowledge-repo Workers Builds integration and the website production project.
3. Use a separately approved Access-protected staging route; workers.dev is disabled in configuration and no route is supplied.
4. Use Wrangler to deploy with this configuration only after explicit review of permissions, logs, cost and staging hostname.
5. Independently read back each staging route, run negative security tests, verify costs, and obtain release approval before public exposure.

## Other components

Ask Morrow education bot already exists as an Access-protected Workers AI prototype and retains its keyboard-only staging gate.
Morrow Verify remains a planned independent conformance runner; this package provides only synthetic case descriptions.
Morrow Observer remains planned, subject to retention minimisation and aggregated privacy review.
Morrow Outreach remains planned and must be human-approved for releases; no autonomous posting.
Portable private-context storage and multi-model interoperability remain unimplemented.

The unratified Core RFC stays in GitHub draft PR #1. The existing unrelated Cloudflare Workers Builds failure remains unresolved.
