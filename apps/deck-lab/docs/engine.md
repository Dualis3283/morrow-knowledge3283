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

## Candidate card-interaction adapter — Ovika (review branch, not released)

The first verified triggered-ability slice is Ovika, Enigma Goliath in **manual table play**. After Ovika has been manually resolved to the battlefield, casting a noncreature spell with a known fixed mana value puts an Ovika token-production trigger **above the spell** on the stack. Resolving the trigger creates exactly that many red 1/1 Phyrexian Goblin tokens with haste. The original spell remains on the stack and resolves separately. Tokens cease to exist when moved off the battlefield. Triggering only happens after a successful cast, and not while Ovika is in the command zone.

The interaction is restricted to a named, auditable adapter and does **not** execute arbitrary Oracle text. Ovika's ward is unimplemented, variable-X and unusual face-based costs need manual resolution, and commander casting remains manual for unsupported abilities. Batch games do not auto-cast commanders; therefore **this update does not establish Ovika win rates or goldfish token counts**. The simulation report must continue to disclose partial card coverage and skipped effects.

The exact effect was cross-checked against Wizards of the Coast's Foundations release notes (Ovika entry, printed cost {5}{U}{U}{R}, mana value 8): https://media.wizards.com/2024/downloads/FDN_Release_Notes_dPeeQG7XyE/EN_FDN%20Release%20Notes%2008282024.pdf . Dedicated regression cases verify trigger ordering, known mana value, haste, cost failure, absence, creature exclusion, immutable state and token disappearance. Both browser and Android engine sources must remain byte-identical before any release.

**Independent rules recheck (2026-11-01):** The first draft's test fixture incorrectly gave Ovika a cost of `{5}{U}{R}` (mana value 7). This is now corrected to `{5}{U}{U}{R}` (mana value 8), anchored in the official Foundations release notes. Tokens receive *temporary* haste only until turn end, rather than permanent haste. Tests explicitly cover expiry and printed-card fixture parity. Official rules also note that the chosen X affects mana value; dynamic X remains manual/unsupported in this bounded adapter.
