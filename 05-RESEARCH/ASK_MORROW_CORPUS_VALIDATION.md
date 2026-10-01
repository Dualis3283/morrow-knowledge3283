# Ask Morrow Corpus v1.0-eval — Validation Record

**Validation date:** 1 October 2026  
**Manifest status:** frozen for evaluation  
**Chat endpoint:** not implemented

## Exact source validation

Validated against:
- Morrow commit `9b416f8b19b6ce77adf8ca46bd915330271f3209`;
- website commit `2f8f3cfac166225849445779a059a05431eca8da`.

Resolved successfully:
- **7 / 7** included Morrow knowledge files;
- **9 / 9** included website pages;
- **2 / 2** navigation-only creative pages.

Total pinned paths checked: **18 / 18**.

Each included source has an exact blob SHA in:

`06-SOURCES/ASK_MORROW_CORPUS_V1.json`

## Privacy validation

The 11 checked website pages (9 included + memoir + poetry navigation-only) were checked at the pinned website commit for:

- direct email addresses;
- `mailto:` links;
- `tel:` links;
- Eircode-like values;
- removed “based in Ireland” wording;
- removed PlayStation-account-origin wording;
- JSON-LD `sameAs` correlation.

Result:

**0 positive signals across all checked pages.**

Memoir and poetry remain navigation-only **despite** passing the direct scan. This is data minimisation, not a claim that the published creative text is unsafe.

## Staleness / scope decisions

Explicitly excluded from v1 retrieval:
- working state;
- decision log;
- workflow/measurement research;
- source registry;
- archive;
- website deployment/operations record;
- mixed/stale project register;
- Ask Morrow implementation-planning document.

Reason:
these sources are either operational, historical, internally oriented, stale-risky or unnecessary to answer visitor questions.

The exclusion is intentional. Public-safe does not automatically mean useful retrieval context.

## Retrieval minimisation

v1 contains:
- **7** Morrow method/project knowledge files;
- **9** website retrieval pages.

It does not crawl:
- external LinkedIn/Spotify/YouTube/Amazon profiles;
- private connected sources;
- raw Git history;
- downloadable PDFs;
- memoir/poetry body text.

## Validation conclusion

**Corpus v1.0-eval is internally consistent with the Publication Privacy Standard and is ready for evaluation-set design.**

This does not approve a public chatbot deployment. The next gate is the fixed evaluation set, followed by a staging-only read-only prototype.
