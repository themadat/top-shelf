# Wish Ledger

Developer backlog only; excluded from app data/backups. Read for named wish workflows, not routine fixes.

Next ID: `WISH-004`

## Active

- **WISH-003 — Podcast Library and Metadata** — **Active**. Priority: next requested feature; effort: large. Replace the Podcasts starter with name, show activity, personal Listening/Stopped status, S/M/L/XL episode length, release frequency, categories/subcategories, membership availability and annual cost, and website. Optional Podcast Index discovery and RSS enrichment; every field remains manually editable offline. Affects Podcasts modules, shell, persistence/recovery/sync, offline assets and tests. Acceptance: requested fields persist through offline edits and backup/sync round trips; estimates and unknowns are explicit; refresh preserves personal choices; membership pricing records currency and its basis. Static/no-backend operation and legacy compatibility are constraints. [Plan, research and open decisions](WISH-003-podcasts-PLAN.md). Implementation includes the supplied-table importer, reviewed catalog links in an ignored personal import file, and local feed enrichment. Implementation and verification complete (155 tests, focused browser regression and full prepared-file import/reload); awaiting a requested release cut.

- **WISH-002 — Books Library, Wishlist and Pivots** — **Active**. Priority: next requested feature; effort: large. Replace the Books starter with manual/Open Library entry, reading year, personal/provider ratings, ownership and formats, fiction/nonfiction, genres, short review, longer notes, prioritized wishlist, and author/genre/read-year pivots. Affects Books modules, shell, persistence/recovery/sync, offline assets and tests. Acceptance: every requested field survives offline edits and backup/sync round trips; lookup is optional and cannot overwrite personal data; wishlist priority and pivots work with missing metadata. Static/no-key lookup and legacy compatibility are constraints. Implemented with 0–5 half-point ratings, one year read and separate Audiobook/Audible indicators; [plan and verification](WISH-002-books-PLAN.md). Implementation complete; awaiting a requested release cut.

## Completed

- **WISH-001 — TV Library and Flexible Ratings**: closed in the 2.0.0 release cut. Independent TV library, TMDB metadata, layered ratings/notes, filters/pivots, offline editing and safe persistence. [Closeout](WISH-001-tv-tab-PLAN.md). Release cut is local; commit/deployment remain separate.

## New wish

Record ID/title, status (Proposed/Planned/Active/Completed/Parked), priority, effort, affected modules, behavior, observable acceptance criteria, constraints and unresolved decisions. Add a plan link only after planning. Increment Next ID; retain completed entries as short links, with public release prose in `assets/js/release-history.js`.
