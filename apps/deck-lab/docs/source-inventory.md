# Existing MTG sources and prototype lineage

Inspected through the user's authorized Composio GitHub connection on 1 November 2026. Repository and branch names below are observed sources, not guesses.

## Simulator scripts

The MTG work is in [`Dualis3283/morrow-knowledge3283`, branch `feature/mtg-simulator-research-2026-11-01`](https://github.com/Dualis3283/morrow-knowledge3283/tree/feature/mtg-simulator-research-2026-11-01/05-RESEARCH/MTG-SIMULATOR). It was **not present on `main`** at inspection. Source snapshot: `1470bdef08dfb59530e27a28fbb137a58375e524`.

The branch belongs to the open, unmerged [PR #10, “Add reproducible MTG simulator and Ovika–Karn head-to-head test”](https://github.com/Dualis3283/morrow-knowledge3283/pull/10).

| Source | Existing behavior | Relevance to the mobile app |
| --- | --- | --- |
| [`ovika_goldfish.py`](https://github.com/Dualis3283/morrow-knowledge3283/blob/1470bdef08dfb59530e27a28fbb137a58375e524/05-RESEARCH/MTG-SIMULATOR/ovika_goldfish.py) | Standard-library Python; manually defined Ovika deck; 100 seeded opening hands, 12 turns, one London mulligan, casting priorities, mana/ramp, draw and token approximations. Also runs a reconstructed October 29 comparison. | Pattern for repeatable deck revisions, mulligan and land/casting traces. It does not model opponent damage or blockers. |
| [`ovika_vs_karn_heuristic.py`](https://github.com/Dualis3283/morrow-knowledge3283/blob/1470bdef08dfb59530e27a28fbb137a58375e524/05-RESEARCH/MTG-SIMULATOR/ovika_vs_karn_heuristic.py) | Reuses Ovika definitions; manually defines Karn; 100 seeded duels with alternating starting player, 40 life, 21 commander damage and a 15-turn limit. Named-card policies cover selected removal, counters, locks, wipes, tokens and combat. | Pattern for a scripted opponent and explicit bounded assumptions. This is a matchup-specific heuristic, not a generic threat-scoring engine. |
| [`simulator_manifest.json`](https://github.com/Dualis3283/morrow-knowledge3283/blob/1470bdef08dfb59530e27a28fbb137a58375e524/05-RESEARCH/MTG-SIMULATOR/simulator_manifest.json) | Stable simulator IDs, SHA-256 digests, seed, run counts and limits. | Useful versioned evidence and replay metadata. |
| [`README.md`](https://github.com/Dualis3283/morrow-knowledge3283/blob/1470bdef08dfb59530e27a28fbb137a58375e524/05-RESEARCH/MTG-SIMULATOR/README.md) and [`Ovika_vs_Karn_results.json`](https://github.com/Dualis3283/morrow-knowledge3283/blob/1470bdef08dfb59530e27a28fbb137a58375e524/05-RESEARCH/MTG-SIMULATOR/Ovika_vs_Karn_results.json) | Describe assumptions and preserve the archived duel summary. | Keep model outputs separate from real-world performance claims. |

Both scripts were rerun from temporary copies without changing the reference source. Both exited successfully. Their SHA-256 values matched the manifest. The regenerated duel JSON equaled the archived JSON: Karn 56, Ovika 43, unresolved 1; mean finish round 8.92. This verifies reproducibility of that model, **not** correctness against comprehensive Magic rules or competitive win probability. The current inspection did not have archived goldfish CSVs against which to establish byte-for-byte equivalence.

Exact dated deck inputs were extracted from the original `DECK` and `KD` definitions into [`examples/ovika-2026-11-01.txt`](../examples/ovika-2026-11-01.txt) and [`examples/karn-2026-11-01.txt`](../examples/karn-2026-11-01.txt). Each has 99 main cards plus its explicitly separate commander. The fixtures preserve the source snapshot rather than asserting the lists are current, Scryfall-validated or fully supported by the new app. They are intended for import/manual testing, not as default automated samples.

### Porting boundaries

The original sources store most permanents as card-name strings and aggregate token counts. Their policies hard-code particular names and board conditions. Mana colors, entry/sacrifice conditions, card draw, copying, equipment, blocking and combo access include substantial approximations. There is no general stack/priority system, arbitrary deck importer, Scryfall resolver, touch UI or Android package.

The goldfish file is also a script rather than an import-safe library: its historical benchmark executes at module scope and refers to a summary variable initialized under its main guard. The duel avoids this by executing only the source prefix before the guard. Do not embed that loading pattern in the app.

The mobile prototype uses a newly written JavaScript state model and UI. It carries forward **concepts**—seeded draws, bounded tests, card profiles, explicit policies and logs—rather than claiming to execute or faithfully port the Python match model. Changes in language, RNG and policy mean identical seeds do not imply identical Python/JavaScript results.

## Website, card import and visual references

The website source is maintained in a separate private repository. Inspected snapshot: `536990b62cdda7eb64b86d901dfdb72a66fb0142`.

| Source | What it provides |
| --- | --- |
| `site/projects/deck-planner/index.html` (website source reference; see the public website) | Existing deck entry and planning workflow, keep/mulligan notes, card resolution and multi-face handling. It is a planner, not a turn simulator. |
| `functions/api/resolve-deck.js` (website source reference; see the public website) | Existing same-origin Scryfall-backed resolver. The updated app uses the dedicated public simulator batch resolver for card metadata; simulation stays on the device. |
| `site/projects/deck-wheel/index.html` (website source reference; see the public website) | Closest existing black-and-gold interface reference: near-black background, warm gold, serif display titles and touch-sized controls. |
| `site/assets/cl-playmat.webp` (website source reference; see the public website) and `compleated-playmat.webp` (website source reference; see the public website) | Existing Compleated Loyalty playmat artwork. Both inspected assets show the project's visual world. Neither has printed stack, land, command or placement labels. The app's functional zones are new overlays, not a claimed reproduction of a placement diagram found in these assets. |
| [`00-CORE/VISUAL_SYSTEM.md`](https://github.com/Dualis3283/morrow-knowledge3283/blob/538ca51e8cd903291e1d09168d3a6bb9af5a4ec3/00-CORE/VISUAL_SYSTEM.md) | Serif display hierarchy, clean interface text, restrained warm gold and dark editorial base. |

The owner requested publication of this app, APK, source archive and preview on 1 November 2026. This package includes the approved public-facing playmat artwork, without copying the original website source.

## New app scope

Manual touch play supports broader cards by exposing explicit zone/life/counter controls. Automated tests must declare their supported card/effect coverage and skip or flag unsupported mechanics. Scryfall supplies authoritative card metadata and artwork references; it does not provide executable rules. A threat indicator may use battlefield power, keywords, engine tags and public synergies, with small legendary/mana-value priors, while disclosing the reasons. It must not inspect the opposing hand to rank battlefield threats.
