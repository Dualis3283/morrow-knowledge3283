# Morrow linguistic reference library v1

Status: archived open data in an unpublished review draft; restricted materials are links only. See [machine-readable source registry](linguistic-source-registry-v1.json) for exact URLs, terms, provenance, scope, bytes and SHA-256.

Archive tag: `linguistic-reference-2026-11-14-v1` (unpublished; authorised repository access required). Original upstream files can also be downloaded and verified against manifest. Store bulky assets outside the Git tree. Do not include speech or private data in the public corpus by default. No automated fetch or model training is authorised by this registry.

## Attribution and derived data

Glottolog 5.4: Hammarström, Harald & Forkel, Robert & Haspelmath, Martin & Bank, Sebastian. 2026. Glottolog 5.4. Leipzig: Max Planck Institute for Evolutionary Anthropology. https://glottolog.org. CC BY 4.0, https://creativecommons.org/licenses/by/4.0/. Original archive preserved unchanged.

MASSIVE 1.1: Copyright Amazon.com Inc. or affiliates. CC BY 4.0. Cite FitzGerald et al. (2022), https://arxiv.org/abs/2204.08582, and Bastianelli et al. (2020), SLURP, https://aclanthology.org/2020.emnlp-main.588/. Original archive includes upstream license and notice. Derived sample: first test row per intent per locale, retains six fields (id, locale, partition, scenario, intent, utt); excludes worker and judgment metadata; 3,068 rows across 52 locales. CC BY 4.0, same attribution, modified selection/format. Parallel translations are not independent observations; not a natural-dialogue or pragmatic benchmark.

## Limits

Glottolog: 27,275 records (4,879 families, 8,623 languages, 13,773 dialects); no information about a specific speaker's intent. MASSIVE: 859,092 rows counted across 52 locale files in the downloaded 1.1 archive; not a claim about other advertised totals or datasets. Use for model candidate classification evaluation, not cultural stereotypes. SPICE-Ireland, TalkBank, IDEA, eHRAF and PARADISEC have additional restrictions; metadata pointers only. Common Voice audio deferred pending release and privacy review.

The source registry is not a licence guarantee. Recheck permissions for each new use; retrieve only relevant records. Never treat a linguistic/cultural reference as authority about an individual's intent.

## Local lookup

After an authorised download, use the functions in [linguistic_reference.py](../05-RESEARCH/linguistic_reference.py): lookup_language by Glottocode, ISO 639-3 code or exact name; lookup_intent_examples by locale and intent. Both verify bytes and SHA-256 before reading. These functions do not automatically fetch archives or infer personal identity.
