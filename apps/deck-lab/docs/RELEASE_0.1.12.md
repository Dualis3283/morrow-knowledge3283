# Deck Lab 0.1.12 — Synthetic Destiny delayed end step

## Context and Oracle evidence

`Synthetic Destiny` is an instant costing `{4}{U}{U}`. On resolving it exiles all creatures the caster controls; **at the beginning of the next end step**, it reveals from that controller's library until a number of creature cards equal to the number of creatures exiled is revealed, puts those creature cards onto the battlefield simultaneously, and shuffles the remainder of the revealed cards into their library. A creature token exiled by the effect counts, despite subsequently ceasing to exist; exiled cards never become part of the library shuffle. The whole library is shuffled even if there are no noncreature cards revealed.

Oracle and rulings: https://mtg.wtf/card/khc/44/Synthetic-Destiny

## Implemented (bounded engine)

- Named instant adapter with ordinary mana payment, stack resolution, and exile immediately; delayed event records the original count and source instance ID. A token counts before leaving; creature cards remain exiled in their owner zone.
- A delayed **next end-step** event persists across browser/App save and reload and triggers before end-of-turn cleanup. It uses the existing `matching-reveal` tray, with exact card IDs, fixed enter-the-battlefield versus shuffle destinations, and explicit confirmation before library changes.
- The turn-end sequence is paused while a human player reviews the revealed cards and resumes after confirmation. Multiple pending Synthetic Destiny events at the same end step process serially without advancing the turn prematurely.
- The script-controlled opponent uses deterministic, logged order and the mandatory whole-library shuffle; it never exposes its hand. The user sees **End turn → N delayed effects** in the main-phase controls and **End step** in the selection phase.
- If no creature cards match or the library is exhausted, all encountered cards are handled, with no invented creatures. Token-heavy counts above 99 are permitted, bounded by actual remaining library.

## Verification

Seven new tests: paid casting and true next-end timing, exile of tokens, zero-creature shuffle, saved delayed and pending-choice state, multiple events same end step, deterministic opponent handling, insufficient mana atomicity. Existing regression tests remain. Website browser tests exercise the paid spell, next-end-step UI, persistence across refresh, confirmed ordered allocation and turn progression at 390px and 1440px. CI, APK build, source privacy and live readback are separate evidence gates.

## Explicitly incomplete

This does not introduce generic end-step priority and responses, full creature enter-the-battlefield ordering/replacement abilities, state-based commander-to-command-zone choice, or arbitrary replacement effects. Opponent-controlled instant casting on another player's turn remains limited by the scripted opponent model. Physical Android device installation is not covered by CI.
