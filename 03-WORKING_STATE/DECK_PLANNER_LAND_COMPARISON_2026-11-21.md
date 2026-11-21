# Deck Planner land comparison · 21 November 2026

## Context and evidence

Players looking for an early blue/black source had to translate a mana question into a separate catalogue search. The Land Finder correction in [site PR 68](https://github.com/Dualis3283/david-walsh-site/pull/68) established same-face colour matching. The Planner already retained identified commander colours, the submitted list and freeform project notes. The catalogue already supplied rules text, mana options, entry classifications and printing links.

## Interpretation and decision

Reuse the same Land Finder inside the open Planner project. Recognised commander colours initialise editable search filters. Unknown commander identity opens an unrestricted catalogue. Match current cards against catalogue names and faces and exclude sideboards from the main deck. Keep existing and proposed evidence together. Saving appends the two card names, source links, mana and entry summaries and the player's optional reason to the project notes. Closing the comparison preserves the list.

A separate dashboard, automatic swaps and inferred improvements to casting probability would add unsupported claims. The comparison describes available options. Timing, additional costs and playstyle still matter.

## Verification and learning

The archived Scarab God deck exercised blue/black filtering and comparison with Swamp. The browser saved a reason for considering Underground Sea, reloaded the project and verified the decklist and prior notes. The example exercises the filter and makes no price or purchase recommendation. Coverage included 320, 390 and 1440 pixel viewports. Separate checks covered unknown identity, sideboard exclusion, missing catalogue matches, cancelling, touch, keyboard and the local offline package.

The first mobile review exposed a narrow evidence column beside the card image. Moving the comparison across the full result width improved readability. A separate export regression exposed browser setup in code also used by project serialization tests. Moving that setup beside the existing UI listeners restored all nine project regression tests. The offline runner permits the local Finder frame only on the Planner route.

## Transfer to other projects

For the Simulator, pair a selected card with its actual turn event and preserve round position on return. In the HAR and Console Inspector, retain the surrounding events while tracing a correlation ID. Distinguish a nearby timestamp from a shared identifier and an untimed console line from a timestamped event. Judge both tools by whether the user can return to the same investigation and explain the evidence behind the selection.

## Release and rollback

The website main and production refs matched `65a0d9d42d96a2232c5e83a02405aaf241394ce6`. The public Planner HTML, Finder HTML and JavaScript, and calculator stylesheet matched the reviewed release. A second Chromium pass exercised the public URL at all three widths, recovered the saved comparison after a reload and preserved the decklist. Reviewer verification is complete. Owner confirmation remains open.

Revert the site merge through normal Site QA and promotion if necessary. Comparison notes use the existing project format and remain readable after rollback.

[Website implementation](https://github.com/Dualis3283/david-walsh-site/pull/69) · [Pull-request Site QA](https://github.com/Dualis3283/david-walsh-site/actions/runs/44946460634) · [Main Site QA](https://github.com/Dualis3283/david-walsh-site/actions/runs/44946949587) · [Production promotion](https://github.com/Dualis3283/david-walsh-site/actions/runs/44947517712)
