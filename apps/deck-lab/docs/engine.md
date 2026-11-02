# Bounded simulator behavior

`web/engine.mjs` is a standalone, serializable ES module. It does not call an LLM. Card definitions come from Scryfall; executable effects come from a small explicit adapter registry. Oracle text is not treated as arbitrary executable rules.

## State and actions

The public contract is in `API.md`. `act` returns a deep copy and rejects invalid actions without mutating its input. Deck instances have stable unique IDs, independent from Scryfall's definition IDs.

Additional state fields are `rngState`, `startingPlayer`, `combatDone`, `stats`, `roundStats`, `warnings`, `lastRandom`, and optional `finishReason`. Each player also has a `manaPool`, `command` zone, `commanderId` and `returnCommanderOnDeath` policy. `createGame` and `simulate` accept optional `commander` and `opponentCommander` card definitions. Commanders are not part of the shuffled library or opening hand. Their separate panel sits beside the hand with a divider.

`upgradeGame` returns a migrated copy of an older saved table, and `act` applies the same migration before actions. Recognizable legacy `pN-commander` instances acquire the Commander fields wherever they currently reside, without marking ordinary cards with the same Scryfall definition ID as commanders. A missing historical cast count defaults to zero; earlier manual casts are not reconstructed from old logs.

Phases are `opening`, `main`, and `finished`. `keep` ends opening-hand selection. Counted London mulligans redraw seven and require the exact number of bottom selections. There is no free mulligan. The auto policy takes at most two mulligans seeking 2–5 lands, then bottoms excess lands or expensive cards. An opening deck shorter than seven draws only available cards; subsequent failed draws end the test.

Each round includes a turn for both players. On the play, the user skips their first draw; on the draw, the opponent acts first and skips their first draw. A missing opponent deck creates a passive goldfish opponent. Automated duel simulation requires both decks.

Known sources pay actual colored, colorless, and generic symbols. The engine taps sources only as necessary and retains excess mana until the turn ends. Sources with conditional costs or restrictions are excluded unless explicitly adapted. Variable X, hybrid, Phyrexian, alternative and missing costs need manual payment. Unconditional multicolor sources and simple enters-tapped sources are supported; `produced_mana` alone is never interpreted as an unconditional mana ability.

Tapping a known source manually adds its default color to the tracked pool. Untapping through the UI is an explicit manual override and removes any remaining matching pool mana. It can override normal legality, so automated output should be used for comparisons independent of manual edits.

The stack resolves last-in, first-out. Ordinary sorceries and permanents cannot be cast onto a nonempty stack. Supported instants can. Unknown spells can be put on the stack with their ordinary cost, but `resolve` rejects them. Resolve their actual effects yourself, then use `move` to place the card in its destination. Partial creature bodies can be resolved manually with an explicit omitted-abilities warning; automation skips them. A small set of partial mana sources and damage spells are automated only for their documented subset, with warnings and run notes.

Manual `move` explicitly bypasses costs and effects. Zone changes clear counters, marked damage, deathtouch marks, and temporary buffs. Entering the battlefield sets the entry turn. Counter controls represent +1/+1 counters only.

## Commander practice controls

Commander identity is attached to the physical instance through `isCommander`, with persistent `commanderCasts` and an owner's `commanderId`. It persists through hand, stack, battlefield, graveyard, exile and command-zone moves. Copies of the same Scryfall card definition do not share cast counts or Commander identity.

An ordinary cast from the command zone pays the card's base cost plus two generic mana for each previous cast from that zone. A successful cast increments `commanderCasts` when it reaches the stack, even if it is later removed without resolving. An illegal/unaffordable attempt does not increment it. Casting the commander from hand uses normal cost without adding or incrementing command-zone tax. Manual moves to the battlefield bypass casting and do not increment the count.

For a double-faced commander, this casting control uses the front face's ordinary mana cost. Back-face/alternate casting and unsupported card abilities require manual handling; paying the casting cost does not make the full Oracle text executable.

For practice, the owner's `returnCommanderOnDeath` policy defaults to true and is logged. A commander sent to the graveyard returns to its owner's command zone, even when another player controlled it. Disable the policy with `commanderReturnPolicy` to keep it in the graveyard, or supply `keepCommanderInGraveyard:true` on an explicit manual move. Moving a genuine commander directly to `command` always uses its owner's zone.

That default is a practice convenience, not a complete model of official Commander state-based choices, death triggers or replacement timing. Commander damage and automatic commander casting by batch/opponent policy are not implemented. Coverage/manual controls remain authoritative for unsupported effects.

## Combat and opponent policy

Combat supports numeric power/toughness, summoning sickness, flying/reach, defender, haste, vigilance, trample, first strike, double strike, deathtouch, lifelink, indestructible, hexproof, and shroud. It permits one blocker per attacker and one combat per turn. Damage in each strike step is simultaneous. Blocked nontrampling attackers remain blocked if their blocker dies in the first-strike step. Menace, multiple blockers, banding, protection, infect, and triggered/replacement abilities are outside this model.

The script plays one supported land, then prioritizes early ramp, card draw, removal, creatures, and combat buffs. It attacks with available creatures and uses a deterministic simple blocking policy. It does not reserve mana, bluff, perform general responses, or optimize long-term play. Search adapters pick the first eligible basic land and accept optional searches.

Opponent target ranking accepts only a card/permanent and the supplied public battlefield. It adds explainable contributions for visible power, evasion, counters, recognized counter/token multipliers, repeatable draw, mana engines, and anthem synergies. Legendary status (+0.5) and mana value (up to +2) are small priors. Own-hand information is used to select playable actions; opposing-hand and library contents are never used for target ranking. Scoring an unsupported ability does not implement that ability.

## Simulation output

`simulate` accepts `runs` from 1 to 1000 and `rounds` from 8 to 12. A run seed is the requested seed plus the run index. Runs finish at lethal damage, attempted draw from an empty library, or the requested round limit.

`summary` includes:

- `runs`, `seed`, `roundLimit`.
- `avgDamage` and `avgOpponentDamage`: total damage to the opposing player over the whole test, averaged across all runs.
- `avgMulligans`, `avgMissedLandDrops`, `avgCardsCast`, `avgLandsPlayed`, `avgLifeRemaining`, and `avgRoundsReached` across all runs.
- `lethalRuns`: runs where either life total reached zero; this is not a competitive win rate.

Each `rounds` row contains `round`, `damage`, `opponentDamage`, `landsPlayed`, `cardsCast`, `missedLandDrops`, `lifeRemaining`, and `runsObserved`. Damage, casts, and land drops are for that round, not cumulative. Row means include only runs reaching that round. Later rows may therefore reflect surviving runs. `summary` always includes every run.

`coverage` contains separate `player` and `opponent` rows plus `skippedCards`. Status is `supported`, `partial`, or `manual`, with reasons. `notes` describes policy, limits, partial adapters, skipped card names, early termination, and denominator differences. Coverage and notes must accompany reported simulation results.

The sample decks have full coverage for their limited card pool. Complex imported decks will have substantial manual coverage. Results measure the configured bounded scenario; they do not predict tournament outcomes or substitute for Magic rules adjudication.

## Guided play and named interactions — candidate for web and Android

**Corrected Oracle evidence:** [Ovika, Enigma Goliath](https://mtg.wtf/card/one/213/Ovika-Enigma-Goliath) costs `{5}{U}{R}` (mana value **7**), not eight. A previous purported recheck incorrectly changed the fixture to eight. Mana value stays seven even when commander tax increases the amount paid. Test fixtures and browser regression were corrected, and temporary haste expires at end of turn.

The same engine now offers `suggestions(state, player)` and explicit `assist` actions (`land`, `next`, `main`). The playmat shows what will happen next and which recognized mana sources will be tapped; assisted actions are opt-in. `main` loops through recognized actions and ordered stack triggers only, without automatically ending the turn or assigning combat. An in-session Undo restores a previous table snapshot. Players can still move, tap, and adjust cards manually. Web and Android use identical engine code and parallel UI elements.

Normal land drops work for any valid card with Land type, without requiring its mana ability to be interpreted. Known basic land subtypes (`Island`, `Mountain`, etc.) supply intrinsic tap colors even on nonbasic duals/triomes. Optional/conditional land-entry choices are conservative (tapped rather than falsely paying life); unknown mana abilities are never inferred from the card's `produced_mana` field. Choosing land types and tapping is deterministic, not a perfect optimization or a guarantee of preserving held-up interaction. Assisted actions expose that choice before committing; Undo permits retesting.

Named, audited interaction adapters (not freeform Oracle interpretation): [Ovika](https://mtg.wtf/card/one/213/Ovika-Enigma-Goliath) creates mana-value-many Phyrexian Goblins with haste until turn end after a noncreature cast; [Third Path Iconoclast](https://mtg.wtf/card/bro/223/Third-Path-Iconoclast) creates one colorless 1/1 Soldier artifact creature token per noncreature cast; [Molten Gatekeeper](https://mtg.wtf/card/mh3/128/Molten-Gatekeeper) deals one to the opposing player for each *other* friendly creature entering (including these tokens). Each trigger goes on the stack, carries a source ID and resolves separately. The model represents a bounded 1v1 opponent, not full Commander multiplayer or general replacement/priority/ward/unearth/X-cost rules.

**Evidence boundaries:** Tests exercise Ovika's seven-mana auto-cast, mana/color source provenance, known and unfamiliar lands, generated token interactions, stack order, unknown effect pause and Android source parity. Full MTG Arena rules parity, complete ManaBox playtesting feature parity, physical Android verification, external authenticated staging walkthrough and independent Oracle review of all imported cards are **not claimed**. Goldfish/head-to-head numbers are only meaningful within declared supported coverage; they are not competitive win-rate predictions.

### UX rationale

- ManaBox's compact mobile deck access, playtesting and deck charts support minimizing setup and manual board management.
- MTG Arena community feedback about bad auto-tap choices and trigger overload supports visible mana-source previews, Undo, and bounded trigger resolution.
- User can step, automate a main phase, or directly manipulate the playmat; the engine never silently pretends an unsupported card effect has resolved.


## Mana-aware card casting and payment preview (0.1.4 candidate)

**Regression reproduced and fixed:** The earlier engine recognized Sol Ring, Mind Stone and a few other rocks but not common commander-dependent Arcane Signet or activated-cost signets. Tapping them manually did not add usable mana; casting a spell also auto-tapped sources without a choice dialog. `manaSource` now models Arcane Signet and Commander’s Sphere from the *actual imported commander colour identity*, and the ten two-colour Signets with their required **{1} activation payment**. Unsupported conditional/alternative mana abilities are still marked manual; no blanket `produced_mana` inference.

**New playmat workflow:** Affordable cards in hand and command zone get a gold Ready outline. Drag a card to the visible cast target on desktop, swipe up on touch, or tap the card and choose Play; all open the same payment dialog. The dialog lists floating mana, available untapped lands/rocks, which ones would be tapped, and colour-mode selections for flexible sources. Uncheck sources, change colours, or cancel without spending mana. Confirming uses the *exact quoted source IDs and mana modes* and rejects an unaffordable combination. Land drops remain direct and a dedicated Tap for mana dialog handles manual Arcane Signet colour selection. Floating mana is displayed with a separate pool indicator and counted towards later spells. Undo reverts a complete action in the current session; spent mana cannot be reclaimed by simply untapping the source.

**Evidence:** Automated engine tests cover (1) two lands paying for Arcane Signet, which resolves, taps for red, then casts a red instant; (2) Izzet Signet requiring a coloured land's generic mana for activation and producing both red and blue; (3) specified payment sources and flexible-mana choices including refusal without mutation. Real-browser tests exercise a drag-and-drop desktop flow and mobile tap flow, source deselection and re-selection, the rock colour picker, floating-mana consumption, end-to-end instant damage, and horizontal layout. Android 0.1.4 debug APK packages the same bounded engine and parallel playmat UI. These source and package claims require their relevant CI gate and actual deployment verification before being marked verified.

**Deliberate limits:** This remains bounded deterministic practice, not all Magic rules. Conditional mana rocks, mana replacement effects, complex stack priority, unmodeled cards and commander decisions require manual adjudication. The casting dialog currently previews payment, not an arbitrarily general target-picking interface. Browser/device QA is required before calling the release complete.



## Meticulous Commons recognition — 0.1.5

**Observed regression (0.1.4):** importing Meticulous Commons correctly put it on the battlefield but the simulator returned `tapOptions=null`; tapping manually produced no mana. The card's printed Oracle text is `This land enters tapped unless you control a planeswalker. {T}: Add {W} or {B}.` Its conditional entry clause and mana ability did not match the previous narrow, unconditional land parser.

**Fix:** explicit, card-name-verified mana adapter for Meticulous Commons with `{W}` or `{B}`, plus a conservative reusable two-line Oracle parser for the same supported planeswalker condition. `entersTapped` evaluates the *controller's own* existing battlefield before the land enters; an opponent's planeswalker does not qualify. No planeswalker means enters tapped until normally untapped, with the mana ability still registered on the card. Existing source-picker UI offers exactly two colored options and the casting payment planner sees them. An unfamiliar conditional land still requires manual handling.

**Proof:** five deterministic regression tests cover colored choices, no extra/blue mana, tapped entry, untapping and spending black, owned planeswalker entering untapped, opponent planeswalker not qualifying, and unrelated lands not being inferred. The extended desktop/mobile browser test validates the tap-for-mana choice dialog and downstream spell payment. Both website and Android use byte-identical engine source; Android version 0.1.5 debug candidate uses version code 6. Independent CI, production and physical-device verification are separate gates.

**Reference:** https://mtg.wtf/card/fra/184/Meticulous-Commons
