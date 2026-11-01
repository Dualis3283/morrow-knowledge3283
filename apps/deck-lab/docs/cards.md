# Card import — 0.1.2

The Android app sends batches of card names to the public card-data resolver at `https://david-walsh.pages.dev/api/simulator-cards`. The resolver retrieves full card definitions from Scryfall. It does not receive the deck's title, simulation state or test reports. No Scryfall API key or AI model is required. Card artwork loads separately from Scryfall's image hosts.

The browser sends at most 75 unique names in each batch and reuses cached matches before requesting more names. The Android lookup has a 60-second request/body timeout. The resolver uses Scryfall's collection endpoint, with narrowly scoped searches when an exact card-face alias needs discovery. A canonical card name or an exact face name must match; fuzzy replacements are rejected. Direct Scryfall GET lookup remains a library fallback, but the Android interface uses the website resolver.

## Accepted text

Imports accept names alone, `4 Card`, `4x Card`, `4xCard`, `Card x4`, common printing/foil annotations and CSV/TSV exports with explicit name and quantity columns. Headings can be plain or bracketed: `Commander`/`[COMMANDER]`, `Deck`/`Mainboard`, `Sideboard`, and type headings such as `[CREATURES]`, `[INSTANTS]` and `[LANDS]`. Type headings return subsequent cards to the main deck. Add a main/type heading after the commander section before listing the library.

Maybeboard/companion sections are retained as sideboard. `SB:` prefixes mark individual sideboard lines. Comment lines are ignored, while `//` inside split and double-faced card names is preserved. Duplicate names in the same section merge; entries in different sections remain separate. Quantities, individual lines and the total import size are validated before requests are sent.

`expandDeck` includes only main-deck entries. Commanders and sideboards remain in saved data and are never silently shuffled into the library or opening hand. The selected commander is displayed in a separate panel beside the hand. Playmat controls support ordinary/front-face command-zone casting with commander tax and a configurable return-on-death policy; complete Commander abilities, alternate-face casting and commander damage still need manual handling. The automatic batch policy does not cast command-zone commanders.

## Reports, pauses and retries

The import report accounts for every nonblank source line. It shows the requested and normalized name, matched card, status, HTTP/error code and any lookup explanation. Section headings appear as ignored format lines rather than card requests. Failed names and names still pending after a timeout or rate limit are distinguished. Pending does not mean Scryfall found no such card.

A provider cooldown is retained in local storage and honored for its stated duration. Retry waits for that deadline; cancel stops the waiting/request flow. Successful matches are cached, so retry can resume without repeating resolved names. Connection failures, incomplete responses and rate limits leave an honest partial report instead of marking the remaining deck complete.

The report can be copied as JSON. Saving a partial deck explicitly saves only resolved cards and preserves its source text, diagnostics, statistics and omissions. **Import issues** reopens that saved report for correction and retry. Editing the text or deck name invalidates the previous save result until the updated input is resolved.

## Local data and artwork

Resolved names and full card definitions are cached in `morrow.deck-simulator.cards.v1` for 30 days, with up to 500 stored alias entries. The app continues with an in-memory cache if device storage is unavailable. The cache includes both faces' image URLs and artist attribution; it is not an offline card-image archive. The inspector's face switch previews artwork and rules text, without claiming automated transform mechanics.

Official Scryfall metadata retrieved on 1 November 2026 is embedded in two 60-card teaching decks. Their 40 basic lands keep the supported reference-card pool small; these are interface examples, not deckbuilding recommendations or personal deck reconstructions.

Decks, table state and simulation reports remain on the phone. Copying a report shares it only where the user chooses to paste it. Card lookup is the network service used by the importer; simulations run locally without uploading game or report data.
