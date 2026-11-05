# Morrow MTG simulator — 2026-11-01

**Research status:** Locally rerun and byte-for-byte reproduced the archived output logs using portable source, but **NOT independently verified against comprehensive MTG rules**. These are heuristic results, NOT real-world Commander win probabilities.

## Stable simulation identifiers
- `MTG-SIM-OVIKA-GOLDFISH-2026-11-01-v1` — `ovika_goldfish.py`
- `MTG-SIM-OVIKA-KARN-DUEL-2026-11-01-v1` — `ovika_vs_karn_heuristic.py`

## How to run
Python >=3.10, standard library only. Run both files in this folder:
```bash
python ovika_goldfish.py
python ovika_vs_karn_heuristic.py
```
The scripts write CSV reports and JSON summaries beside the code. The duel script uses card definitions from the goldfish source; keep them together. The repository versions only change filesystem paths and set the imported module's `__file__`; game model logic and results are unchanged. Local reruns of the portable scripts matched the previously delivered CSV outputs and duel JSON **byte for byte**.

## Models
**Solo goldfish:** 100 hands per version, seed `20261101`, 12 turns each. Uses the latest Ovika list plus reconstructed October 29 build. One London mulligan. Draw/filter/trigger policy is simplified; no opponents, reactive stack or blockers.

**Interactive duel:** 100 seeded Ovika-vs-Karn games, alternating play order, starting at **40 life** and **21 commander damage**; 15-turn limit. Not a Two-Headed Giant simulation and does NOT use the separate shared 45-life house rules.

## Observed scripted outcomes, not competitive win rates
- Karn wins: **56/100**; Ovika wins: **43/100**; unresolved: **1/100**.
- Mean finish turn: 8.92.
- Ovika cast by turn six in 56/100; Karn cast by turn five in 68/100.
- Full retained reference: `Ovika_vs_Karn_results.json`; rerunning produces CSV turn/game records.

## Known limitations
- Not a Magic rules engine. Several card Oracle texts, stack windows, ability interactions, equipment, evasion, blockers, planeswalker and mana details are omitted or approximated.
- Commander damage and the win split are especially sensitive to combat/equipment/evasion assumptions.
- Manual card metadata came from dated decklists; cross-check against current cards before using conclusions as a deck recommendation.
- Goldfish undervalues reactive counterspells. Duel policy uses simplified priority/target choices.
- Model outputs are traceable and reproducible; independent rules verification and real-match testing remain **pending**.

## Morrow evidence trail
Context → dated decklists → disclosed card and policy assumptions → deterministic executions → preserved outcomes → locally rerun and verified identical → independently verified (pending). Prepared, committed, and merged are distinct states.

See `simulator_manifest.json` for stable IDs and exact SHA-256 digests of both portable Python files.
