# HAR and console inspector · 18 November 2026

**Release state** — Active and independently verified. Owner workflow confirmation is pending.

**Design decision** — Preserve chronology while searching. Within the active source and category, search counts matching events and marks them separately from the selected row. Previous/Next match and Enter/Shift+Enter jump in place so adjacent events remain available. This applies the MVR display policy to investigation work.

**Local evidence** — After Inspect files, selecting an event displays captured values directly. Copy trace collects UTC start, method, endpoint, HTTP status, correlation IDs, duration, blocked time and wait time in milliseconds. The copied endpoint masks query values. Report exports retain their separate redaction controls.

**Verification** — All 65 HAR and console unit tests passed. Browser checks jumped to the last match in 3,602 requests, verified the preceding row remained visible and compared clipboard text with the displayed trace. Pull-request QA, main QA and production promotion succeeded. The public inspector assets and offline ZIP matched the release. [Site PR #61](https://github.com/Dualis3283/david-walsh-site/pull/61) · [Main QA](https://github.com/Dualis3283/david-walsh-site/actions/runs/44289896123) · [Production promotion](https://github.com/Dualis3283/david-walsh-site/actions/runs/44290475924)

**Resume point** — Dave’s confirmation that jumping between repeated IDs and pasting the timing reference works for his usual investigation workflow.
