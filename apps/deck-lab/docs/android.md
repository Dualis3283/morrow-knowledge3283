# Android application — 0.1.2

The Android app bundles the `web/` interface and deterministic simulation engine. The 0.1.2 source configures version name `0.1.2` and version code `3` for package `dev.morrow.decklab`. It needs Android 8.0 (API 26) or later with an updated Android System WebView. Target/compile SDK is 35, Android Gradle Plugin is 8.9.1 and Gradle is 8.11.1. A full JDK 17+ is required, including `javac` and `jlink`; a Java runtime alone is insufficient.

Build from the project root with `bash scripts/build-android.sh`, or open `android/` in Android Studio and sync/build. The standard Gradle wrapper includes its JAR, Unix and Windows launchers, and a pinned distribution SHA-256. The build script provisions a project-local Android SDK and Gradle cache, accepts the Android SDK licenses, and copies the debug APK to `artifacts/morrow-deck-lab-debug.apk`. Internet access is needed for initial toolchain downloads. No release signing key or store publishing is configured.

The original 0.1.0 debug APK was assembled successfully using Temurin JDK 21.0.13+9, Android SDK 35 and Build Tools 35.0.0 on 1 November 2026. Its APK Signature Scheme v2 signature verifies, and its bundled web assets matched that release’s source. The updated 0.1.1 debug APK was also rebuilt and inspected: version name `0.1.1`, version code `2`, min SDK 26 and target SDK 35. Its signature verifies and every packaged web asset matches the updated source. No emulator or physical-device execution is claimed.

The wrapper uses a custom `WebViewClient` asset handler equivalent to a local asset loader. Assets are served only at `https://appassets.androidplatform.net/assets/web/`, with correct JavaScript module MIME types, path traversal rejection and `nosniff`. File/content access and mixed content are disabled. HTTPS links outside the app open in the system browser. There is no native JavaScript bridge. The only requested Android permission is `INTERNET`. Native system-bar, cutout and keyboard insets keep controls within the available screen area on Android 8–15. Use a current Android System WebView for modern JavaScript support.

Deck/session storage stays in the app's WebView storage. Android backup is disabled. Card-name batches go to the public website resolver at `https://david-walsh.pages.dev/api/simulator-cards`, which retrieves definitions from Scryfall. The resolver permits the app’s `https://appassets.androidplatform.net` origin. Artwork loads from Scryfall separately. No API key or AI backend is required; simulation state and reports are not uploaded. Clearing app data removes local decks and sessions.

A debug APK is for sideload testing. Device/emulator interaction, system WebView compatibility, rotation, storage persistence, touch gestures and Scryfall import should be checked before a release. The bounded simulator is not a complete MTG rules engine.

The commander update is version `0.1.2`, version code `3`. Its APK build, v2 signature, min SDK 26/target SDK 35 manifest and bundled-source parity were verified. Install the updated APK to receive the commander interface; a website deployment does not update an older app’s bundled files.


## 0.1.3 guided-play candidate

Version code 4 (Android package `dev.morrow.decklab`) bundles the shared site engine, seven-mana Ovika fixture correction, guided land/casting/stack actions, Undo and three bounded named interaction adapters. The CI debug APK is reproducibly built and SHA-256-compared to the source engine. Until a real Android device/browser input walkthrough and current website download replacement are verified, the installed 0.1.2 APK remains the older version. No store release is claimed.

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
