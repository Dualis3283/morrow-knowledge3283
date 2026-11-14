# Deck Lab 0.1.13 — Bounded response priority, counters, cast trigger order

## Context and authoritative rules

A spell/activated or triggered ability can be responded to while on the stack. A non-mana ability normally resolves when all players consecutively pass priority. The stack is last-in, first-out. A counterspell targeting a spell moves that spell to the appropriate zone if successfully countered; countering an activated or triggered ability removes the *ability*, not its underlying permanent. When a player controls multiple triggers from one event, they can choose their placement order on the stack. See the 2026 Comprehensive Rules 117 (priority), 603 (triggers), 608 (resolution), 701.5 (countering), and the Commander format command-zone rules.

Official rules: https://magic.wizards.com/en/rules and https://mtgcommander.net/index.php/rules/

## Implemented bounded 0.1.13 workflow

- **Open response window** when stack nonempty during the human user's main phase; human has priority. Human may cast a recognised instant while stack nonempty and select a valid spell/ability target. **Pass priority** logs human pass, scripted opponent's **deterministic auto-pass**, and resolves the top recognised effect; user regains priority while stack remains. Stack windows are serializable and survive save/reload. **Close response window** returns to the legacy direct resolution shortcut.
- **Counterspell**, **Negate**, **Stifle** and **Disallow** are named, paid instant adapters with validated stack targets: spell / noncreature spell / activated or triggered ability / spell or ability, respectively. The target is validated before paying and again on resolution. Countering a spell sends it to its owner's graveyard subject to existing commander default; countered abilities cease to exist rather than entering a zone. A removed or illegal target does not magically counter a different object.
- Named cast triggers (Ovika, Third Path Iconoclast, Sai, Sram, Etherium Spinner, Whirlwind of Thought) still queue above the spell. The new action to **promote a cast trigger** changes the order of two adjacent triggers that have the **same recorded cast-event batch ID** and human controller, without crossing spells, other controllers or different trigger events. Prior-to-0.1.13 triggers are not presumed to be in that batch.
- The existing **Resolve top** button now states that it uses a **quick pass shortcut** and logs the assumption that both players pass; it is disabled when an explicit response window is open. Unsupported/manual stack effects still require manual resolution and cannot silently auto-resolve from the response window. End turn is blocked on a nonempty stack/response window.
- On-screen target dropdown for named counters includes legal stack items instead of showing battlefield targets. Buttons are touch-sized, and the table displays when the response window is open.

## Tests and verification lifecycle

11 deterministic engine cases cover named counters, positive/negative target validation, no mana lost on invalid target, cast triggers resolving before spell, persisted response window, explicit close/quick-pass distinction, end turn rejection, same-batch trigger ordering and cross-batch/controller protection. CI Playwright mobile 390px and desktop 1440px scenarios cover paid Counterspell, target selection, save/reload and consecutive passes. Full suites also regression-test the older mana draw/mill/reveal and scripted-opponent interactions.

**Not implemented / known limits:** This is not full two-player priority or opponent response AI: the scripted opponent auto-passes and cannot decide to counter a human spell in this window. Human responses during opponent turns, multiple phases/combat priority, APNAP ordering across different controllers, simultaneous ETB/death event batching, replacing commanders' graveyard/exile zone moves with interactive choices, complete stack-based activated abilities or replacement effects are separate milestones. Some commander graveyard moves still use the legacy practice default rather than an offered choice. Do not claim general Oracle correctness or tournament-level win-rate fidelity.

Stages to verify independently: source committed → PR CI tests → Android debug build and APK/source parity → merge → site main CI → Cloudflare production confirmation → public download readback → device testing. Android debug build is not production signed; physical device installation remains unobserved.
