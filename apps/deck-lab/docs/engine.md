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


## Mana, token-resolution and loyalty tracking audit — 0.1.6

### Confirmed before the fix
- Underground River was not recognised as a mana source because the bounded parser did not support its two separate tap abilities and associated colored-mode damage.
- Only named cast triggers (Ovika, Third Path Iconoclast, Molten Gatekeeper entry damage) created token permanents. Ordinary token-creating instant/sorcery spells had no effect adapters; they could not automatically resolve.
- Planeswalkers were generic manual permanents. No distinct loyalty resource, activation timing/limit, loyalty loss from targeted damage or zero-loyalty state based removal was modelled.

### Implemented scope
- Underground River offers {C}, {U}, or {B}; selecting U/B deals exactly one damage to its controller when the ability is used, including through an auto-selected casting payment. C causes no damage. Payment preview does not alter health. Explicit source/colour choices remain available.
- Named, *audited* token-spell adapters: Raise the Alarm (two 1/1 white Soldiers), Dragon Fodder and Krenko's Command (two 1/1 red Goblins), Hordeling Outburst (three 1/1 red Goblins) and Midnight Haunting (two 1/1 flying white Spirits). Tokens appear only as the spell resolves, with separate entry triggers and ephemeral token lifecycle. Unknown effects, variable X, choices and replacement effects are never inferred. Ovika triggers on casting *before* the spell's token effect resolves.
- Planeswalkers: printed loyalty initialised on entry and older saves migrated; `loyalty` stored separately from +1/+1 `counters`. Printed +/-/0 loyalty abilities are presented in the inspector with per-turn once-only cost/stack tracking. Their effects must be resolved manually. State-based removal when loyalty reaches zero, and targeted damage from supported burn spells, work. Generic manual loyalty adjustment is explicitly labelled as an override. Planeswalker combat, loyalty replacements/doubling, emblem effects, and unknown Oracle ability effects are NOT automated.

### Evidence and boundaries
- 8 fresh deterministic regression tests for land mana and life damage (manual and auto); explicit token spell resolution, stack interaction with Ovika and Molten Gatekeeper, token ceasing outside battlefield, unmodeled X tokens; loyalty entry/turn activation/zero removal, targeted damage, and save migration. All previously passing tests rerun.
- Added a real-browser test at 390px mobile and 1440px desktop for manual River tap mode, life change, token resolution, planeswalker loyalty cost, used-this-turn display and deliberately manual effect.
- **Rules references:** Underground River, https://mtg.wtf/card/bro/267/Underground-River ; Wizards Foundations Mechanics, https://magic.wizards.com/en/news/feature/foundations-mechanics ; comprehensive rules https://mtg.wtf/help/rules .
- Release gates must pass independently before production and Android 0.1.6 debug APK can be marked live. Physical Android test remains unobserved.


## Tracked nine-deck opponent interaction slice — candidate 0.1.7

**Persistent register:** `apps/deck-lab/docs/NINE_DECK_MECHANICS_TRACKER.md` plus `apps/deck-lab/docs/nine-deck-card-matrix.json`. The source-reviewed matrix covers nine complete decks, 900 physical cards, 767 list entries, and 644 distinct card records. The card-level legacy supported/partial/manual classifier is NOT a complete implementation certificate.

**Automated in this candidate, with identical engine for both players:** Sai, Master Thopterist (artifact spell cast -> 1/1 flying artifact Thopter), Sram, Senior Edificer (Aura/Equipment/Vehicle spell cast -> draw), Etherium Spinner (mana value >= 4 cast -> Thopter), Whirlwind of Thought (noncreature spell cast -> draw), Night's Whisper (draw two, lose two life), and Shorikai, Genesis Engine (pay {1} and tap, stack ability -> draw two, discard one, create a Pilot). The scripted opponent uses a deterministic highest-mana-value discard heuristic; the player receives an explicit post-draw discard selector. Some known simple Equipment may enter the battlefield, but equipment attachments/effects remain manual. Scripted Shorikai can be cast from its command zone with exact mana plus commander tax when affordable; no free commander or unsupported transformations.

**Observability:** `opponentDiagnostics` counts turns, public actions, casts, ability activations, trigger resolutions, and unsupported hand-card counts without exposing hidden card names. Unresolvable stack states pause the opponent instead of advancing the player turn and claiming a complete outcome. The manual loyalty marker is never auto-resolved by the scripted opponent.

**Testing / boundaries:** Eight new scripted-opponent tests, 390px and 1440px browser UI test for opponent cast trigger and player Shorikai choice, plus pre-existing engine/browser/Android artifact parity checks. This is an audited named-card subset, not a general Oracle engine: token doubling/replacements, general draw ordering/scry, DFC and Room doors, most loyalty abilities, crewing, full equipment attachments and other unknown effects remain open in the tracker. The source changes are not live until PR/CI/production readback. Physical Android-device test remains unobserved.


## Core mana eligibility and card draw reliability — candidate 0.1.8 (2 November 2026)

**Context and reproduced gaps:** previous mana-source reader handled mostly one-line unconditional tap text. Imported multi-mode Talismans, pain lands, colored Diamonds, dual lands and some conditional lands were misclassified. The payment search failed an activation sequence where an Island must pay {1} for Prismatic Lens before the Lens supplies colored mana. Card draw had only a handful of audited adapters; an unsupported draw-trigger effect left the player without an immediate way to correct the hand.

**Implemented in shared engine and UI:**
- Source eligibility now reads independent printed `{T}: Add ...` modes conservatively, including typed dual-land intrinsic abilities, Shivan Reef/Caves of Koilos/Underground River damage, Ancient Tomb, Talismans, tapped Diamonds, Palladium/Gold Myr and Birds of Paradise; supports color options from Commander identity, dynamically supplied opponent-land colors for Fellwar Stone and Exotic Orchard, owned-land colors for Reflecting Pool, and Chromatic Lantern's additional land mana ability. Prismatic Lens's color mode requires a separate generic activation; Temple of the False God cannot produce mana until five lands. Many complex conditional activations still need overrides.
- The spell-payment planner handles per-mode activation requirements (including another source paying for the activation), displays eligible untapped sources, and keeps already-floating mana in the pool. Invalid payments do not mutate game state. Color or life effects are shown per mode.
- Visible **Draw card +1** control moves exactly one card from your library into hand, increments the draw statistic, logs it as a manual draw and is reversible with the existing in-session Undo. It must not be presented as an automatic card ability resolution.
- Audited named triggers for Enduring Innocence (once-per-turn draw when another creature with power <=2 enters), Undead Augur (own Zombie death draw + lose life), and Midnight Reaper (own nontoken creature death draw + life damage); normal Think Twice drawing from hand is automated but flashback is not. Sram/Whirlwind cast triggers, Shorikai, and Night's Whisper already work in the 0.1.7 baseline.
- For unsupported printed mana modes, the card inspector offers a deliberate **Tap and assign mana manually** override with color/amount selector. It taps the permanent, adds floating mana, and permanently logs the override as *not rules-validated*. This is necessary for unfinished filter-land and rock mechanics, not a claim they are fully automated.

**Evidence:** 15 additional deterministic mana/draw regression cases using published Scryfall Oracle-derived card records from the nine-deck audit, plus desktop/mobile Playwright flows for Prismatic Lens cost/land source checks, hand growth via Draw card and manual mana override. All earlier regression tests continue. Web and Android engine/app content must remain byte-identical. Build, CI, production and physical-device verification are separate gates.

**Remaining boundaries:** multimode filter lands with colored activation costs, ETB replacement/choice (bounce lands, Lotus Field sacrifices), Varying mana spending restrictions, generic/complex draw replacement effects and most bespoke triggered effects, Room/DFC/Adventure/Prepare handling, arbitrary spell targets and full planeswalker effects remain manual. Do not infer full Oracle correctness from this release.


## Manual milling and source-linked exile — candidate 0.1.9 (2 November 2026)

### Context and scope
The nine Commander decks include mill-to-graveyard, abilities that exile a creature or other permanent under a particular card, and some permissions to cast or otherwise replay exiled cards. Generic zone moves were losing the association with the exiling source and did not provide a source-specific recast workflow. These are deliberately **manual** adjudication controls, not a new inferred rules interpreter.

### Added manual actions and evidence
- **Mill cards…**: select your library or the scripted opponent's and an integer 1–99. Cards move from the library's existing top order into their **owner's graveyard**. Mill counts are tracked separately from draws and logged with the milled card names. Milling a library empty is not an automatic loss. Other triggered/replacement abilities are not inferred.
- **Exile under another card…**: select a face-up card on the battlefield, in a graveyard or on the stack, then identify the permanent or spell on the battlefield/stack that caused its exile. This records persistent `exiledBy = {sourceId, sourceName, sourceOwner, exileTurn}` on the exiled card in its **owner's exile zone**. Tokens cannot be linked; moving a linked card out of exile clears the association. Commanders may require a user-adjudicated command-zone choice.
- The card inspector for the source shows **Exiled with this card** and buttons to inspect each linked exiled card. The opponent's graveyard and exile zones are accessible without disclosing their hand/library. Links survive save/reload and the original source leaving play, although this **does not** imply casting permission persists.
- Linked cards offer **cast with normal mana payment** (uses existing tap sources, printed cost, stack and cast triggers), **cast without paying mana** (an explicitly logged manual permission), **put permanent onto your/owner's battlefield without casting**, and **return to owner's hand**, with no inferred permission or free/alternate-cost rule. Playing an exiled land requires an available land drop. Unknown spell effects still require manual stack movement after casting.
- This work uses the same pure shared engine on website and Android, saves all link metadata with the local table, records every manual action in turn notes and remains reversible via the existing Undo history.

### Tests and limitations
Nine deterministic engine regression tests cover own/opponent mills, empty library without automatic loss, mill→grave→linked-exile, ownership/controller separation, link persistence across save and source departure, paying to cast, deliberately free cast, manual permanent return, unlinked exile denial, token protection, land-drop rules and stack source handling. The website Playwright test at 390px and 1440px covers mill opponent→open opponent graveyard→link to source→inspect source's exiled cards→return permanent and ordinary paid cast.

**Not automated:** legal source target choices, trigger/replacement events, opponent rules choices, cast permissions/limits, alternate faces, free-cast X/alternate costs, imprint timing and source-specific token copy effects. State records may support future adapters. Browser, Android candidate build, CI, deployment and physical-device testing are independent lifecycle gates.
