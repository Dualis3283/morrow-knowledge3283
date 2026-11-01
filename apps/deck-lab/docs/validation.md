# Validation — 1 November 2026

Current source: **0.1.1**, version code `2`, Android package `dev.morrow.decklab`.

The 0.1.1 importer adds bracketed headings, cached batch resolution through the website, per-line diagnostics, provider cooldowns, pending-versus-not-found distinctions and copyable import reports. Card names reach the resolver and Scryfall; simulations and their reports stay on the device.

## Current 0.1.1 checks

| Check | Observed result |
| --- | --- |
| Native JavaScript suite | 61 tests passed. |
| Android rebuild | Debug APK rebuilt with version name `0.1.1`, version code `2`, min SDK 26 and target SDK 35. |
| APK inspection | Signature verifies; every packaged web asset matches the updated native source. |
| Companion website suite | 95 tests passed. This is separate evidence for the web version, not Android device execution. |

## Original 0.1.0 browser and engine baseline

The following historical table records the original release. Its browser walkthroughs remain useful evidence, but do not establish a fresh 0.1.1 physical-device review.

| Check | Observed result |
| --- | --- |
| JavaScript importer/engine suite | 61/61 passed under Node 24, using test isolation disabled for this managed workspace. |
| Independent engine cases | 12 cases included in the suite: card conservation, mulligan bottom counts, colorless vs generic mana, source reuse, stack timing, summoning sickness, strike steps, trample, zone-state reset, round bounds and unsupported effects. |
| Browser practice walkthrough | Passed mulligan selection, illegal second land rejection, stack entry/resolution, summoning-sick attack rejection, later combat, life change, coin/die, persistence/resume and repeated identical 100-run results. No page exceptions. |
| Original live Scryfall import | Resolved Forest, Grizzly Bears and both faces of Delver of Secrets from live GET responses. Preserved one intentionally unresolved line through partial save. Loaded real card images and switched the inspector to Insectile Aberration. No page exceptions. |
| Mobile interaction | Passed at 320px, 390px and 844px without document horizontal overflow. Real Chrome touch events verified swipe-up land play and swipe-right permanent tapping. Keyboard tab arrows/Home and dialog Escape passed. |
| Android package | `assembleDebug` succeeded using AGP 8.9.1, Gradle 8.11.1, JDK 21.0.13+9, compile/target SDK 35 and min SDK 26. |
| APK inspection | APK Signature Scheme v2 verifies. Manifest requests only INTERNET. Every packaged `assets/web/` file matched the 0.1.0 release source by SHA-256. |
| Original Python sources | Both reran successfully from temporary copies; source digests match their manifest and regenerated duel JSON matches the archived summary. Reproducibility does not establish MTG rules correctness. |

The workspace browser does not trust the managed HTTPS proxy's CA in its temporary certificate store. The live import/image walkthrough forwards real browser requests through curl, which verifies TLS using the environment's trusted CA. No synthetic card fixtures, disabled TLS checks or changes to the app's transport are used in that walkthrough.

No Android emulator or physical phone was used. Android WebView/device behavior, orientation, system accessibility, large text and native app lifecycle still require device review. Browser viewport and touch-event tests are evidence about the web interface, not substitutes for that device review.

The implemented model remains deliberately bounded: card coverage and skipped effects must accompany conclusions. Automated results for the complex original Commander decks are not comparable to the existing fixed Python matchup model and are not claimed as realistic full-game outcomes.

## Importer update 0.1.1

The update recognizes bracketed Commander and card-type sections, uses the website’s full-metadata Scryfall batch resolver and displays per-line import diagnostics. Native importer/engine tests pass (61 cases). Website integration checks pass (95 unit/worker cases plus browser import, partial-save, cooldown-cancel and deterministic simulation checks at 320px, 390px and 1440px). Direct Scryfall collection responses accounted for every unique name in the privately supplied 100-card reproduction. The private list is not included in this source package.

The 0.1.1 APK build and v2 signature verify; min SDK 26, target SDK 35, version code 2, with INTERNET as its only requested permission. All packaged web files match this version’s source. The original physical-device limitation still applies.
