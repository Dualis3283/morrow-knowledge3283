# Morrow checkpoint — Website photo-driven layout remediation
Date: 12 October 2026
Status: implemented, regression-tested, independently read back in production.
Authoritative project record: authenticated Notion project record (URL intentionally withheld).

## Context
After Phase 6, the owner provided five photographs of the laptop website. Visible mid-word splits, clipped lettering and overlapping waveform labels were observed despite earlier source-only and document-wide responsive tests. This is a follow-up to accepted site work, not a new development phase or a completed 20th metric workflow.

## Evidence
1. Home headline: at viewport 1280 CSS px, the word Transformation measured approximately 554.1px, wider than its approximately 536px text column. A shared break-word rule allowed the inappropriate split.
2. Morrow card: MORROW measured approximately 350.5px against 309.2px available at 1280; 283.3px against 254.1px at 1024. Overflow was hidden, visibly clipping the logo.
3. World Wave: the collapsed 54px rail contained a 204px fixed shell, and previous/next link text became cramped and vertically broken in the owner's screenshots. Existing semantic aria-labels already carried the complete destination names.
4. Music: the three real release artwork files loaded when scrolled into view (1200px, 1600px, 1200px natural widths). No corrupted artwork or failed fetch was established.
5. First live readback exposed a mobile override retaining a 43px minimum target width. A separate follow-up corrected it to 44px with a regression test.

## Actions and release receipts
- Website CSS: cap hero headline at 5.2rem, avoid breaking words internally, balance lines; cap MORROW card mark at 3.75rem with reduced letter spacing.
- World Wave: readable current-world label/counter, clear previous/next arrow controls and accessible destination labels; retain deliberate navigation-rail swipe rather than intercepting the whole document.
- Minimum touch targets corrected to 44x44px; no changes to Deck Planner, Professional Equalizer, memoir, poems, music artwork, or draft Ask Morrow PR.
- Initial website repair commit: https://github.com/Dualis3283/david-walsh-site/commit/3b8ab07cd8341fefbf233faa0208799f2efd21c5
- Final mobile-width correction and production branch SHA: https://github.com/Dualis3283/david-walsh-site/commit/ad8da03385379ba99e2d896808100a13a4512554
- Local combined editorial source suite: 25/25 pass. Subsequent selected source suite: 20/20 pass.
- At checkpoint, GitHub qa, smoke, promote, Cloudflare staging and Cloudflare production checks on final SHA all completed successfully; main and production matched.
- Final live browser geometry readback at widths 320, 375, 1024 and 1280: both complete text items fit, no page-wide overflow, arrows measured at least 44x44px, links retained correct accessible names and routes. Earlier CSS prototype also tested at 768 and 1440 widths.
- Private site source report: https://github.com/Dualis3283/david-walsh-site/blob/main/docs/PHOTO_LAYOUT_REMEDIATION_2026-10-12.md . Link only; do not mirror private files to public knowledge.

## Findings and lessons
- A page can have no horizontal document scroll yet contain clipped words within overflow:hidden. Test intrinsic string width versus rendered text box width.
- Inspect active and collapsed states and the actual mobile CSS cascade. A desktop 44px declaration can be defeated by a mobile-specific 43px override.
- Camera cropping and lazy-loading states are hypotheses about artwork, not proof that source assets should be replaced.
- Keep commit, test, promotion, provider success and canonical live browser readback as distinct verification receipts.
- Removing visibly duplicated navigation words is acceptable only when accessible destination labels, focus and sufficient hit areas remain.
- Do not confuse photo-driven rework with a completed Phase 6 measurement foundation: 19/20 cases remain coded, chronological gap/denominator rules unresolved; Phase 5 stays intentionally skipped.

## Open follow-up and stopgap
The owner may still perform subjective physical-laptop/phone inspection under different text zoom or scaling. No new defect is asserted until reproducible evidence emerges. Existing site QA gates remain; this checkpoint does not authorise new behavioural telemetry, visitor testing or public AI deployment.
Continue from the website's current project-specific Notion record and fresh Git production readback. Earlier production SHAs remain dated history.

Retrieval tags: website, morrow, photos, responsive, word-clipping, 44px-target, world-wave, accessibility, layout-regression, independent-readback, checkpoint.
