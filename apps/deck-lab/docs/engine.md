# Bounded simulator behavior

`web/engine.mjs` is a standalone, serializable ES module. It does not call an LLM. Card definitions come from Scryfall; executable effects come from a small explicit adapter registry. Oracle text is not treated as arbitrary executable rules.

## State and actions

The public contract is in `API.md`. `act` returns a deep copy and rejects invalid actions without mutating its input. Deck instances have stable unique IDs, independent from Scryfall's definition IDs.

Additional state fields are `rngState`, `startingPlayer`, `combatDone`, `stats`, `roundStats`, `warnings`, `lastRandom`, and optional `finishReason`. Each player also has a `manaPool` and `command` zone. `createGame` and `simulate` accept optional `commander` and `opponentCommander` card definitions. Commanders are not part of the shuffled library. Move commanders manually between command and battlefield; automatic commander casting, tax, replacement rules, and commander damage are not implemented.

Phases are `opening`, `main`, and `finished`. `keep` ends opening-hand selection. Counted London mulligans redraw seven and require the exact number of bottom selections. There is no free mulligan. The auto policy takes at most two mulligans seeking 2–5 lands, then bottoms excess lands or expensive cards. An opening deck shorter than seven draws only available cards; subsequent failed draws end the test.

Each round includes a turn for both players. On the play, the user skips their first draw; on the draw, the opponent acts first and skips their first draw. A missing opponent deck creates a passive goldfish opponent. Automated duel simulation requires both decks.

Known sources pay actual colored, colorless, and generic symbols. The engine taps sources only as necessary and retains excess mana until the turn ends. Sources with conditional costs or restrictions are excluded unless explicitly adapted. Variable X, hybrid, Phyrexian, alternative and missing costs need manual payment. Unconditional multicolor sources and simple enters-tapped sources are supported; `produced_mana` alone is never interpreted as an unconditional mana ability.

Tapping a known source manually adds its default color to the tracked pool. Untapping through the UI is an explicit manual override and removes any remaining matching pool mana. It can override normal legality, so automated output should be used for comparisons independent of manual edits.

The stack resolves last-in, first-out. Ordinary sorceries and permanents cannot be cast onto a nonempty stack. Supported instants can. Unknown spells can be put on the stack with their ordinary cost, but `resolve` rejects them. Resolve their actual effects yourself, then use `move` to place the card in its destination. Partial creature bodies can be resolved manually with an explicit omitted-abilities warning; automation skips them. A small set of partial mana sources and damage spells are automated only for their documented subset, with warnings and run notes.

Manual `move` explicitly bypasses costs and effects. Zone changes clear counters, marked damage, deathtouch marks, and temporary buffs. Entering the battlefield sets the entry turn. Counter controls represent +1/+1 counters only.

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
