# Morrow Deck Lab — Android prototype

The app is a private, local deck-testing workbench for short 8–12 round experiments. One round means one turn for each player. The purpose is to inspect opening hands, mulligans, land drops, castable spells, interaction and conditional damage, then change a deck and repeat with the same seed.

## Interaction model

Decks are pasted as text, resolved through the website’s Scryfall batch resolver and stored on the device. Card definitions and physical card instances are separate. Zones include the library, hand, battlefield, graveyard, exile and stack. Card images are sourced from Scryfall and need network access unless already cached by the device.

Tapping opens explicit card actions. Swipes provide shortcuts; buttons provide the same actions for accessibility. Unsupported card effects are handled by the person using the playmat. Life adjustments, +1/+1 counters, coin flips and dice are logged. A saved local session can be resumed.

The selected commander has a divided panel beside the hand and is not counted as a hand card. Ordinary/front-face casting from command pays the displayed tax, which tracks prior casts from that zone only. A logged return-on-death policy defaults to returning it to its owner's command zone and can be disabled for graveyard lines. Complex Commander abilities, alternate casts, commander damage and complete replacement choices remain outside automation; batch/opponent policy does not cast command-zone commanders.

The Android application bundles its interface and simulation code. Only batches of card names go to the website resolver for Scryfall lookup. Game state and simulation reports stay on the device; there is no simulation server, account, model inference or GitHub/Composio credential in the app. Composio is used during development to inspect the user's authorized source repositories.

## Automated testing boundary

Scryfall supplies card characteristics and Oracle text, not executable Magic rules. General deck import does not imply general rules automation. A coverage report distinguishes supported, partially supported and manual cards. Scripted results depend on the supported card profiles and opponent policy; they are not win probabilities or rules certification.

Threat scoring uses only public battlefield information. It gives a small prior to mana value and legendary status, then weights combat pressure, repeatable engines and visible synergy. Reasons accompany the score. Counter/token multiplier recognition can inform a target decision even when the multiplier's rules effect needs manual handling; recognition is not execution.

## Visual source

The black base, warm restrained gold, serif display type and clean interface type follow Morrow's visual direction and the website's Commander Wheel. The Compleated Loyalty playmat artwork is reused from the user's website. The inspected artwork has no zone-placement labels; the app's zone arrangement is a new interpretation of the requested layout and remains subject to the user's review.

## Subsequent development

- Validate on the user's Android phone, including touch gestures, large text, landscape and TalkBack.
- Add explicit card/effect adapters for the actual imported decks, prioritized from their coverage reports.
- Expand combat/priority support only with rules-based regression fixtures.
- Compare simulation traces with manually played opening sequences before drawing deck-strength conclusions.
- Expand Commander abilities, alternate casting and complete replacement/trigger choices with explicit rules fixtures.
- Prepare a release signing key and distribution workflow after device review.
