# Fuzzy surname release v4.1.25

Enables the reviewed surname spelling assistance on both website hosts. Exact names and aliases retain precedence. Unique one-letter corrections are accepted; conflicting corrections and confident wider misspellings use the existing answer choices. Wrong-position wider hints expose no candidate identity. Manager validation is unchanged.

The flag PAGE302_FUZZY_NAMES_ENABLED defaults to true in site-config.js; set it false to roll back the feature without changing game data or scoring. First-name and segmented-name expansion is not part of this release.

Validation: fuzzy helper and eligibility tests (10 passing); desktop/mobile spelling flow; score-submission/retry regression; domain-root and GitHub-subpath build checks; static build; Cloudflare website dry run. Local review loads pack 002 with 11 clubs and 300 records. Real iOS keyboard behavior remains a device check, not a browser-emulation result.

Reproduce the synthetic evaluation with node tools/evaluate-fuzzy-names.cjs. Packs 001–007 produced 21,858 wider-stage cases, 2,385 suggestions, all matching the intended surname; 12 ambiguous cases suppressed and no adversarial reveals in this sample. These are synthetic results, not real-user precision or proof against deliberate probing. Thresholds remain conservative.

Review server: node tools/preview-fuzzy.cjs, then http://127.0.0.1:3025/; baseline uses ?baseline=1. Live API writes are disabled there.
