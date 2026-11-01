# Morrow Deck Lab — 0.1.1

An Android prototype for importing Magic decks, practicing opening sequences on a touch playmat, and comparing short, repeatable deck tests. The black-and-gold interface uses the user's existing Compleated Loyalty playmat artwork.

## Use the app

Public downloads:

- [Android debug APK](https://github.com/Dualis3283/morrow-knowledge3283/blob/main/apps/deck-lab/downloads/morrow-deck-lab-debug.apk?raw=true)
- [Source ZIP](https://github.com/Dualis3283/morrow-knowledge3283/blob/main/apps/deck-lab/downloads/source.zip?raw=true)
- [Playmat preview](https://github.com/Dualis3283/morrow-knowledge3283/blob/main/apps/deck-lab/downloads/playmat-preview.png?raw=true)

Install the debug APK on Android 8.0 or later with an updated Android System WebView. The repository keeps published binaries in `downloads/`; building the source produces `artifacts/morrow-deck-lab-debug.apk`. The source ZIP excludes the published downloads and local toolchain caches. A physical-device review remains necessary; this is a prototype, not a Play Store release.

Start with the bundled Emerald and Azure teaching decks, or open **Decks**, paste a deck list, and choose **Find cards on Scryfall**. Version 0.1.1 looks up card names in batches through the website resolver and Scryfall, then caches full card definitions locally. Bracketed headings such as `[COMMANDER]`, `[CREATURES]` and `[LANDS]` are recognized. A per-line report distinguishes failed names from pending requests, shows cooldowns and supports cached retries. Reports can be copied; saving a partial import explicitly preserves its omissions. Commander and sideboard sections are retained separately from the shuffled main deck.

The dated **Ovika** and **Karn** import helpers load the exact lists extracted from the existing simulator sources. They are dated fixtures, not a claim that these are the user's current decks. Their complex effects need substantial manual handling in this prototype.

On the playmat:

- Keep an opening hand or take London mulligans, selecting cards to put on the bottom.
- Tap cards for actions. Swipe a hand card up to prepare/play it; swipe a battlefield card right to tap it. Explicit buttons provide the same actions.
- Play lands, pay supported mana costs, put spells on the stack and resolve them.
- Declare attackers, assign one blocker per attacker, and resolve supported combat.
- Adjust life, add/remove +1/+1 counters, flip a coin or roll dice.
- Use explicit manual zone moves for effects outside the model. Commanders have a separate manual command zone.
- Resume the saved table after reopening the app.

**Results** runs 100 seeded tests over 8, 10 or 12 rounds. Each round includes one turn per player. Repeat the same seed to compare changes under the same policy. Reports show damage, mulligans, missed land drops, casts, life, coverage and per-round observations. Results can be copied as JSON.

## What automation means

This is a bounded scripted opponent, with no AI backend. It uses known card adapters, ordinary mana costs, supported creature bodies and selected combat keywords. Threat scores explain public battlefield factors such as power, mana value, legendary status, repeatable engines and visible counter/token synergies. The target scorer does not inspect the opposing hand.

Scryfall data is not executable Magic rules. Unknown card effects remain manual and are skipped during automated casting. Commander casting/tax/damage, complex triggers, tokens, replacement effects, general priority windows, alternate costs, multiple blockers and multiplayer are not fully implemented. Coverage and omissions accompany results. Recognizing an ability as a threat does not execute that ability.

Tests end at the round limit, lethal damage or an attempted draw from an empty library. Summary means include all runs; a round's means include only runs that reached it, with the observed count shown. Results describe this policy and supported scenario, not competitive win probability.

The teaching decks intentionally use 40 basic lands to keep their supported card pool small. They demonstrate the interface and are not mana-base recommendations.

## Run and build

For a browser preview, install Python 3 and run:

```sh
npm start
```

Open `http://localhost:4173`. The bundled interface and simulation engine need no npm runtime packages. Samples and cached card metadata work offline; uncached card images and new imports need Internet access. Card lookup uses the public website resolver. A localhost preview may be denied by its origin policy; use the published website or Android app for live imports.

With a full JDK 17 or later, build Android using:

```sh
bash scripts/build-android.sh
```

The script provisions the Android SDK locally on first use and accepts the standard SDK licenses. See [Android build notes](docs/android.md) for toolchain versions and Android Studio use. Build tooling, SDKs, credentials and signing keys are not included in the source archive. No release signing or publishing is configured.

For the JavaScript checks, use Node 24:

```sh
npm test
```

Browser integration checks in `tests/browser-smoke.py`, `tests/browser-mobile.py` and `tests/browser-live-import.py` use Python Playwright, Chromium and curl. The latter forwards real HTTPS requests through curl's verified environment trust store because the managed workspace proxy CA is absent from Chromium's temporary certificate store; it does not disable TLS verification or substitute card fixtures. Those walkthroughs record the original 0.1.0 browser baseline. The updated native JavaScript suite passed 61 tests for 0.1.1, and its rebuilt APK passed version, signature and packaged-asset checks. See [validation evidence](docs/validation.md) for the distinction between current checks and historical browser/device evidence.

## Source and review

- [Public app source](https://github.com/Dualis3283/morrow-knowledge3283/tree/main/apps/deck-lab): Android wrapper, interface, engine, tests and instructions.
- [Engine behavior and limits](docs/engine.md): supported costs/combat, manual controls, threat scoring and statistics.
- [Importer behavior](docs/cards.md): deck formats, batch resolver, diagnostics, caching and image attribution.
- [Device walkthrough](docs/device-review.md): checks to perform on the user's phone.

The original Python simulations are preserved as reference sources in GitHub. This app carries forward their seeded-testing approach using a newly written JavaScript engine; it does not claim identical rules, policies or random sequences.

Card data and artwork are provided by Scryfall. Magic: The Gathering and card artwork are © Wizards of the Coast; card artists are credited in the inspector. The user's playmat artwork and website references remain their existing assets. This public package contains the app source, approved playmat artwork and documentation. Website source remains in its separate repository.
