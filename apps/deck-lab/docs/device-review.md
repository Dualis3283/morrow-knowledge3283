# Android device review

Build and browser checks cannot establish that touch interaction works well on the user's own phone. Use this short walkthrough after installing the debug APK.

1. Open the sample decks without a network connection. The bundled interface and sample card definitions should load. Card artwork requires network access if it is not cached.
2. Start an opening hand, mulligan once, select the required bottom cards and keep. Confirm hand and library counts.
3. Play a land, cast an affordable card, inspect the stack and resolve it. Check that mana colors, tapped lands and the second-land restriction behave as described.
4. Swipe a hand card upward and a battlefield card rightward. Compare with the corresponding explicit buttons. Confirm horizontal hand scrolling remains usable.
5. Declare attackers, inspect the defender's blockers, assign combat and check life totals and graveyards. Read the combat scope notice for unsupported keywords.
6. Adjust life, add a +1/+1 counter, flip a coin and roll a die. Leave and reopen the app to check the saved state.
7. Resolve a pasted deck through the website resolver and Scryfall. Confirm bracketed headings stay out of card requests, each card has a resolved/failed/pending report entry, copied reports preserve those details, retry uses cached matches, and double-faced images can be inspected. Inspect the coverage report before running a test.
8. Run 8, 10 and 12 rounds with a fixed seed. Repeat an identical test, then change one deck. Record which differences result from the deck change and which mechanics are outside coverage.
9. Try portrait and landscape, large system font size and TalkBack. Confirm card actions and navigation can be reached without gestures.

For the dated Ovika/Karn fixtures, compare the imported names with the source text before using them. Their presence as examples does not assert full automation support or that they represent the user's current decks.
