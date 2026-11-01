# Card import

`cards.mjs` uses the public Scryfall `GET /cards/named?exact=…` endpoint, without an API key. Unique card names are requested sequentially at most once per 130 ms. Each request and its JSON body have a 20 second timeout. HTTP 429 is retried at most twice with a bounded `Retry-After` wait. Cancel stops further requests and prevents a partial import from being returned as complete.

Imports accept names alone, `4 Card`, `4x Card`, `4xCard`, `Card x4`, and Arena printing suffixes such as `(M10) 178` with whitespace before the collector number. `Deck`/`Mainboard`, `Commander` and `Sideboard` headings are retained as sections. Maybeboard is treated as sideboard. `SB:` prefixes mark an individual sideboard line. Comment lines starting `#`, `//` or `;` are skipped, and inline `#` comments are ignored. `//` inside a card name is preserved for double-faced and split cards. Duplicate names in the same section merge; entries in different sections stay separate.

`expandDeck` includes mainboard entries only. Commanders and sideboards remain visible in saved deck data and are never silently shuffled into the main library. The current game engine does not automatically cast commanders from the command zone. The UI should disclose that limitation when commander entries exist.

Resolved names and metadata are cached in `morrow.cards.v1` in localStorage for 30 days (up to 500 unique names). The application continues if device storage is blocked or full; its in-memory cache still works. This is a card-data cache; card images load separately from Scryfall when connected. Images and artist attribution for both card faces are retained. Each unresolved card is named in the error list; no fuzzy replacement is chosen automatically.

Official Scryfall card metadata retrieved on 1 November 2026, including printing images and artist credits, is embedded in the samples. Two bundled 60 card teaching decks exercise the supported small card set with no network requirement for their rules and stats. The 40 basic land count is intentional to keep the reference-card set small; the lists are teaching fixtures, not deckbuilding recommendations or copies of the user's Ovika/Karn lists. Import a full real list for useful draw/land-drop analysis.

Verification: `node tests/cards.test.mjs` covers parser syntax and section boundaries, DFC names, invalid quantities, deck expansion, sample counts/copy limits, exact GET requests, per-card errors, cache reuse, progress, face images/artist fields, cancellation and 429 retries.
