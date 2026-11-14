# Deck Lab 0.1.14 — Actual spell-cost reductions and bounded scripted responses

## Context / evidence

User report: simulator did not correctly adjust cost of spells when The Darkness Crystal (Final Fantasy) was in play, and the next milestone after 0.1.13 is to let the scripted opponent make a limited legal response instead of always auto-passing. Oracle rulings for The Darkness Crystal (6 June 2025): **Black spells you cast cost {1} less**; the reduction applies **only to generic mana**. Determine total cost with increases (including commander tax) then reductions; **mana value does not change**. It also has a separate replacement effect (nontoken opponent-controlled creatures would die → exile instead, you gain 2 life) and activated return ability `{4}{B}{B}, {T}`. These latter two effects are **NOT** automated by this release.

Primary Oracle/rulings: https://mtg.wtf/card/fin/96/The-Darkness-Crystal ; official rules https://magic.wizards.com/en/rules

## Shared cost computation

A new exported `spellCostQuote(state,player,card,extraGeneric,{isSpell})` starts with the printed *supported fixed mana symbols*, adds generic costs such as commander tax, then subtracts only applicable generic reducers, flooring the payable generic requirement at zero. It does not remove coloured pips, invent a mana source, or change spell mana value. The **same quote** drives `payment`, casting eligibility, actual tap/payment, guided assisted casting and opponent normal-turn casting. The user-facing casting dialog shows the printed mana cost, reductions and the actual payable colored/generic symbols and contributors; `play` logs modifiers for audit.

Named, static, generic spell reducers handled: The Darkness Crystal and Jet Medallion (black spells), Pearl/Sapphire/Ruby/Emerald Medallion (matching colour), Foundry Inspector and Etherium Sculptor (artifact spells), Jhoira's Familiar (historic spells), Ugin, the Ineffable (colorless spells). Each applies only when its permanent is **controlled on the battlefield** (tapped still counts), and each separately stacks when applicable. Colour is determined from `colors` when supplied, so Devoid/colorless cards are not misclassified by their mana symbols. If no `colors`, printed symbols are the conservative fallback; this is not full spell-colour-changing continuous-effect support.

Cost reducers are named `partial` coverage: other Oracle effects of their bodies are not automatically interpreted. Activated abilities (e.g. Shorikai and Proteus Staff), manual library moves and mana-ability costs are explicitly excluded from spell reductions. Other cost-increase/reduction layers, alternative or X/hybrid/Phyrexian payment, variable discounts based on board state, convoke, delve, affinity, imprinted types and alternate casting timing remain open.

## Scripted opponent response policy

On an active human main-phase open response window, when user passes and top stack object belongs to human, scripted opponent may cast an actual **Counterspell**, **Negate**, **Stifle**, or **Disallow** from its own hidden hand, subject to exact target rules and genuine available mana. The cast uses the same mana/tap planner as a human (and the same applicable cost reductions), enters the stack, is logged publicly, and returns priority to the human. Up to two such responses per window; otherwise opponent passes and top object resolves. The policy deterministically tries Stifle, Negate, Counterspell, Disallow and never reveals uncast opponent cards. The response count is saved/restored with the game.

**Important limitations:** This is not a real opponent strategic policy or full two-player APNAP priority. The scripted opponent does not respond to its own spells, cast removal/pumps/protection on your turn, or respond in combat/end step; it counters eligible human top-of-stack objects only with available named spells. The human has no cross-turn casting window. Commander graveyard/exile choices, simultaneous enter-the-battlefield ordering, and The Darkness Crystal's exile/lifegain replacement effect remain unimplemented.

## Tests and independent gates

10 new deterministic cases for The Darkness Crystal/medallions, colour requirements, stacking reductions, commander tax, static tapped state, source leaving play, named artifact reductions, correct payment, opponent genuine paid Counterspell, insufficient mana and exact Negate/Stifle target gating. Total deterministic suite: **176 tests passed locally**. Browser Playwright test at 390px and 1440px exercises the discounted three-land payment for `{2}{B}{B}`, a real opponent counter response, persisted human priority through reload, and the resulting zone state. Previous mana, draw, mill, Ponder, library reveal, end-step and response-window regression cases retained.

Lifecycle: prepared → GitHub PR → CI and Android source/safety/privacy → APK and source parity → merge → website production smoke and Cloudflare deployment → public HTTP and SHA256 independent readback → **physical Android device (not observed)**. Do not promote unverified stages.
