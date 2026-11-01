# Validation — 1 November 2026

Version: 0.1.0, Android package `dev.morrow.decklab`.

| Check | Observed result |
| --- | --- |
| JavaScript importer/engine suite | 33/33 passed under Node 24, using test isolation disabled for this managed workspace. |
| Independent engine cases | 12 cases included in the suite: card conservation, mulligan bottom counts, colorless vs generic mana, source reuse, stack timing, summoning sickness, strike steps, trample, zone-state reset, round bounds and unsupported effects. |
| Browser practice walkthrough | Passed mulligan selection, illegal second land rejection, stack entry/resolution, summoning-sick attack rejection, later combat, life change, coin/die, persistence/resume and repeated identical 100-run results. No page exceptions. |
| Real Scryfall import | Resolved Forest, Grizzly Bears and both faces of Delver of Secrets from live GET responses. Preserved one intentionally unresolved line through partial save. Loaded real card images and switched the inspector to Insectile Aberration. No page exceptions. |
| Mobile interaction | Passed at 320px, 390px and 844px without document horizontal overflow. Real Chrome touch events verified swipe-up land play and swipe-right permanent tapping. Keyboard tab arrows/Home and dialog Escape passed. |
| Android package | `assembleDebug` succeeded using AGP 8.9.1, Gradle 8.11.1, JDK 21.0.13+9, compile/target SDK 35 and min SDK 26. |
| APK inspection | APK Signature Scheme v2 verifies. Manifest requests only INTERNET. Every packaged `assets/web/` file matches the final web source by SHA-256. |
| Original Python sources | Both reran successfully from temporary copies; source digests match their manifest and regenerated duel JSON matches the archived summary. Reproducibility does not establish MTG rules correctness. |

The workspace browser does not trust the managed HTTPS proxy's CA in its temporary certificate store. The live import/image walkthrough forwards real browser requests through curl, which verifies TLS using the environment's trusted CA. No synthetic card fixtures, disabled TLS checks or changes to the app's transport are used in that walkthrough.

No Android emulator or physical phone was used. Android WebView/device behavior, orientation, system accessibility, large text and native app lifecycle still require device review. Browser viewport and touch-event tests are evidence about the web interface, not substitutes for that device review.

The implemented model remains deliberately bounded: card coverage and skipped effects must accompany conclusions. Automated results for the complex original Commander decks are not comparable to the existing fixed Python matchup model and are not claimed as realistic full-game outcomes.
