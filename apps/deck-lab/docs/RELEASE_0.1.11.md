# Deck Lab 0.1.11 — Creature-reveal variants

**Scope:** Named, bounded adapters for Proteus Staff, Mass Polymorph, and Empty the Laboratory. This builds on the 0.1.10 saved library-selection tray and is not a general Oracle interpreter.

## Oracle reference and implementation

- **Proteus Staff** (https://mtg.wtf/card/mb2/140/Proteus-Staff): click the source on your battlefield, choose a creature controlled by either player, pay {2}{U} via usable mana sources and tap the staff. Move target to **its owner's** library bottom. Reveal from its **controller's** library until the first creature card; put the hit on that controller's battlefield and order the rest on the bottom. Tokens cease to exist and owner/controller remain distinct. **Known limitation:** this is an atomic practice resolution; opponent responses and intervening stack objects are not modelled.
- **Mass Polymorph** (https://mtg.wtf/card/m11/64/Mass-Polymorph): after the ordinary spell cast and stack resolution, exile all creatures the caster controls, including tokens (which cease to exist). Reveal from that caster's library until an equal number of creature cards is found or the library runs out. Revealed creature cards enter the battlefield together; the rest are shuffled into the library. Exiled creature cards stay exiled. **Known limitation:** the engine does not fully order simultaneous ETB triggers or commander command-zone choices.
- **Empty the Laboratory** (https://mtg.wtf/card/mic/14/Empty-the-Laboratory): dedicated **Cast for X** control pays {X}{U}{U} using the normal planner; at resolution choose X Zombies you control (or all available if fewer), sacrifice them, then reveal until an equal number of **Zombie creature** cards is found or the library runs out. Revealed Zombies enter together; nonmatching cards are randomized at the bottom of the library. Zombie deaths may queue known death-draw triggers. **Known limitation:** trigger/replacement event ordering and other variable-cost casting modifiers may need manual adjudication.

The selected library records are persisted by card instance ID and not mutated until final confirmation. Invalid allocations, arbitrary zone assignments, unsupported shuffle choices and insufficient payments are rejected. A fixed-destination tray presents matches as battlefield entries and nonmatches as bottom/shuffled entries. The reusable manual Ponder/Preordain/reveal interfaces remain available.

## Verification and lifecycle

Eight deterministic named-variant regression cases test correct owner/controller libraries, staff payment, token disappearance, empty/no-hit library, X payment and Zombie sacrifice, and invalid allocation atomicity. Full Android regression suite passes 148 cases locally before CI. Playwright 390px and 1440px browser test covers the named card UI paths. Requires GitHub branch/site QA, Android build, archive parity, merge, Cloudflare production readback and external device test as **separate gates**; never treat a prepared source as production verified.

## Open next

Synthetic Destiny's delayed next-end-step trigger, replacement effects, multi-creature simultaneous ETB triggers, commander command-zone exile choice, general trigger stacking, clone/reveal copying, and sophisticated scripted-opponent decisions.
