# Morrow Deck Lab — Nine-deck mechanics tracker

**Audit date:** 2 November 2026  
**Deck sample:** 9 complete Commander decks, 900 cards, 767 named deck entries, 644 distinct named cards. Source card and face records verified against Scryfall.  
**Important:** An engine card-level `supported` or `partial` label is **not** an assertion that all Oracle abilities work. This is a tracked engineering and testing backlog, not a win-rate certification.

## Lifecycle gates

`identified → source audited → adapter implemented → deterministic tests → opponent/browser tests → CI verified → merged → live readback → device verified`.

A feature remains at its last observed gate; no status can be advanced based on a plan or source commit alone. Keep the website, Android and scripted opponent results distinguishable. Source documents and test fixtures must remain free of private Genesys data or personally identifiable information.

## Implementation register

| ID | Priority | Capability | Status | Test / acceptance |
|---|---|---|---|---|
| MECH-001 | P0 | Opponent decisions and visible automation audit | implemented-source-pending-ci | Same actions and costs for both players, opponent trace, explicit manual stopping and tested no-fake-outcome behaviour |
| MECH-002 | P1 | Generic event queue and replacement-effect stages | planned | Replacement modifies event before token entry, simultaneous triggers ordered with APNAP and choices recorded |
| MECH-003 | P1 | Token-spell X and multimode support | planned | Pay X, resolve stack, create correct token counts, copy characteristics and enter triggers; no invented resolution |
| MECH-004 | P1 | Card selection and draw/draw-discard decisions | partially-implemented-source-pending-ci | Interactive player hand/library/selection choices and reproducible AI choices without hidden info leakage |
| MECH-005 | P1 | Room door state and unlock action | planned | Two independent unlocked-door flags, cast-one-door, pay-to-unlock special action, fully-unlocked transition fires once |
| MECH-006 | P1 | Double-faced, adventure and prepare semantics | planned | Choose legal casting face, transform state independent of type, correct zones and mana costs and no free alternate casting |
| MECH-007 | P1 | Planeswalker counters and repeated activation exceptions | partial | Loyalty distinct from +1/+1, activated effects resolve, multiple legal activations only when card allows, no false manual auto-resolution |
| MECH-008 | P2 | Recursion, copies and ETB/death loops | planned | Event-linked permanents retain ownership/token characteristics and obey graveyard/exile restrictions |
| MECH-009 | P2 | Vehicles, crew, attachment and equipment effects | partial | Creature stats and tapping during crew, equipment costs/timing, effects only when attached |
| MECH-010 | P0 | Card-level evidence gates and reproducible 9-deck simulator diagnostics | implemented-tracker | Each card referenced by deck, source, layout, flags, effect support stage and verified test evidence; failed gates never labelled live |

## Nine decks and mechanics

| Commander | Entries | Trigger wording | Token-related | Draw-related | Planeswalkers | Special faces | Rooms | Legacy card labels S/P/M |
|---|---:|---:|---:|---:|---:|---:|---:|---|
| Jace, Multiverse Architect | 96 | 24 | 16 | 15 | 3 | 0 | 0 | 20/44/32 |
| Karn, Legacy Reforged | 94 | 33 | 7 | 10 | 5 | 0 | 0 | 4/50/40 |
| Ovika, Enigma Goliath | 73 | 20 | 5 | 17 | 1 | 2 | 0 | 7/21/45 |
| Shorikai, Genesis Engine | 85 | 27 | 8 | 10 | 0 | 1 | 0 | 6/37/42 |
| The Scarab God | 82 | 28 | 7 | 7 | 1 | 1 | 0 | 6/38/38 |
| Esika, God of the Tree | 95 | 34 | 10 | 11 | 20 | 1 | 0 | 15/46/34 |
| T'Challa, the Black Panther | 78 | 31 | 14 | 12 | 0 | 0 | 0 | 7/34/37 |
| Victor, Valgavoth's Seneschal | 80 | 33 | 7 | 7 | 0 | 2 | 3 | 6/29/45 |
| Muldrotha, the Gravetide | 84 | 28 | 6 | 17 | 1 | 2 | 0 | 10/47/27 |

**Mechanic counts are nonexclusive heuristic matches on published Oracle/face text, not actual trigger events per game.** See `nine-deck-card-matrix.json` for every named entry, sources, face layout and explicit coverage gate.

## Scripted opponent decision contract (initial slice)

- Uses the **same `play`, mana payment, `resolve`, triggers and activated ability** handling as the player. No free plays or fabricated costs.
- Recognises Sai's artifact-cast Thopter; Etherium Spinner's mana-value-4 cast Thopter; Sram's Aura/Equipment/Vehicle-cast draw; Whirlwind's noncreature-cast draw; Night's Whisper's life loss and draw; and Shorikai's draw two/discard one/Pilot activated ability. All named effects are independently bounded.
- Uses a **deterministic highest-mana-value discard heuristic** for scripted Shorikai; the human receives a choice. Recorded outcomes must not be described as optimal play.
- Counts unknown/non-automatable cards **without exposing concealed card identities** in the live opponent view; details may be revealed only at completed games or explicit audit view.
- Stops at unsupported stack effects. It must not move to the next turn, infer card text, or report full-game fidelity where an effect was unmodelled.
- This phase **does not** implement Room doors, DFC/Adventure/Prepare, token replacements, general scry and draw decisions, all loyalty abilities, crew, combat damage prevention or multiplayer timing. Their acceptance tests remain open.

## Immediate next stages

First: event and replacement staging for token creation, then player-choice and scripted-choice library sequencing. Second: Room and face-specific persistent state, especially Victor, Esika and Ral. Third: copies, proliferate and full loyalty abilities with exceptions. Every stage must be run against the nine named deck fixture sets, with scripted-opponent end-to-end tests and visible manual/blocked counts.
