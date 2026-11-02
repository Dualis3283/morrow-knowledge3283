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

## Reliability regression — 0.1.8 source candidate (2 November 2026)

- **MECH-011 / P0 / source candidate:** real-deck mana-source eligibility, flexible color modes, dynamic lands, conditional activation, colored cost payment. Planned→attempted→implemented in branch; tests, Android bundle, CI, public live readback and physical device remain separate gates.
- **MECH-012 / P0 / source candidate:** explicit reversible manual Draw card button, named Enduring Innocence, Undead Augur and Midnight Reaper draw triggers. General replacement/draw cards still pending MECH-004.
- **MECH-013 / P0 / source candidate:** manual mana source override for unimplemented filter-land/rock options, with automatic life/mana logging, no arbitrary Oracle inference.

Source references and reproducible tests: `tests/mana-draw-fundamentals.test.mjs` and `tests/mana-draw-cards.json`; website 390/1440px `tests/mana-draw-browser.mjs`. Do not advance status to live without independent Cloudflare and hash readback.

## Added action gate — 0.1.9 candidate

- **MECH-014 / P0:** Manual mill to player's graveyard (1–99 from library top, own/opponent, separate from draw).
- **MECH-015 / P0:** Source-linked exile (source card instance ID, owner, face-up exile record) plus manual paid/free recast and manual battlefield/hand return.
- **Evidence:** `apps/deck-lab/tests/manual-mill-linked-exile.test.mjs`; browser `tests/manual-mill-exile-browser.mjs` on mobile/desktop. Scope: manual, not full Oracle permission enforcement. The merge, CI, live readback and Android-device gates are **pending** until individually verified.

## Library review and ordered reveal — candidate 0.1.10

- **MECH-016/P0:** Named Ponder three-card look, reorder, optional shuffle and then one real draw; Preordain two-card scry top/bottom then draw. Scripted opponent deterministic bounded choice. Source implemented; test/CI/release gates separate.
- **MECH-017/P0:** Manual library look at top N and reveal until first nonland; visual card tray, explicit ordered per-card destinations, confirmation; state/snapshot integrity and ownership.
- **Future:** Variants until N creature/Zombie/mana-value matches, cascade/discover, Brainstorm draw 3/put 2 from hand, and automatic source-specific permissions.

Test evidence: `apps/deck-lab/tests/library-selection.test.mjs` and website `tests/library-review-browser.mjs` (390/1440px).

## MECH-018 · Card-specific creature reveals (0.1.11 source candidate)

Proteus Staff first creature; Mass Polymorph N creatures and shuffle; Empty the Laboratory paid-X, Zombie sacrifice, N Zombie matches and random bottom are implemented in candidate source. Test: `apps/deck-lab/tests/library-variants.test.mjs`; browser: `tests/named-creature-reveal-browser.mjs`. Distinguish attempted, tested, merged, production deployed, and device verified. Do not label complete without independent confirmation. Full stack timing, commander replacement choices, all ETB ordering, and Synthetic Destiny's delayed end-step remain open.

## MECH-019 · Synthetic Destiny delayed next-end-step reveal (0.1.12 candidate)

- Named `{4}{U}{U}` paid instant: exile controlled creatures now, count tokens, create persisted delayed reveal **at next end step**, search until N creature cards, simultaneous battlefield entry and mandatory whole-library shuffle.
- User review is saved and blocks turn progression until confirmation; scripted opponent resolves deterministic library selection. Multiple effects processed serially. Supported source/tests `web/engine.mjs`, `tests/synthetic-destiny.test.mjs`, site browser `tests/synthetic-destiny-browser.mjs`.
- Gates: engine tested locally; GitHub CI, Android APK package, cloud production deployment and live readback **pending independent verification at this checkpoint**.
- Open: full stack priority/responses, commander exile zone-choice, simultaneous ETB/replacement ordering, cross-turn instant casting and battlefield ability ordering.

## MECH-020 · Bounded stack response and counterspell targeting (0.1.13 candidate)

- User-main-phase explicit response window, scripted opponent deterministic auto-pass, top-of-stack LIFO resolution, persistent priority state and honest quick-resolve shortcut.
- Counterspell, Negate, Stifle, Disallow tested as different spell/trigger targets with paid casting and no invented universal effect interpretation.
- Same-owner same-cast trigger batch IDs enable narrow voluntary ordering, not APNAP or simultaneous cross-player/ETB ordering.
- Test files `apps/deck-lab/tests/response-priority.test.mjs` and website `tests/stack-response-browser.mjs`.
- Progress lifecycle: locally tested only until independently verified CI/merge/live. Open follow-ups: opponent turn responses, automatic opponent responses, full APNAP event queue, commander replacement/SBA choices and simultaneous ETB ordering.

## MECH-021 · Generic spell cost modifiers and scripted opponent counter responses (0.1.14 candidate)

- Static named generic-only reducers (The Darkness Crystal, Medallions, Foundry Inspector, Etherium Sculptor, Jhoira's Familiar, Ugin Ineffable) use a **shared spellCostQuote** before payment, including commander tax and cast eligibility. Do not reduce colored symbols or mana value. Casting dialog shows adjusted cost. Abilities are not spells, and unused/static effects of reducers stay manual.
- Scripted opponent can use up to two real paid, legal Counterspell/Negate/Stifle/Disallow responses to human stack objects on human main phase; deterministic transparent public actions. Not full opponent instant/counter AI or cross-turn APNAP.
- Test: `apps/deck-lab/tests/cost-reduction-responder.test.mjs`, web `tests/cost-reduction-opponent-response-browser.mjs` (390/1440px).
- Open: The Darkness Crystal nontoken-creature death replacement/exile/lifegain and exiled-card return activation; Cloud Key or Semblance Anvil type choice and imprint; alternative costs, convoke/delve/affinity, +/− cost layering with many modifiers, replacement/trigger batching, post-main opponent responses, commander zone choices.
- Stage: locally tested candidate until independently verified CI/merge/deployment/readback.
