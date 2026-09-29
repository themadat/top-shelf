# Wish Ledger

Developer backlog only; excluded from app data/backups. Read for named wish workflows, not routine fixes.

Next ID: `WISH-003`

## Active

- **WISH-002 — Books Library, Wishlist and Pivots** — **Active**. Priority: next requested feature; effort: large. Replace the Books starter with manual/Open Library entry, reading year, personal/provider ratings, ownership and formats, fiction/nonfiction, genres, short review, longer notes, prioritized wishlist, and author/genre/read-year pivots. Affects Books modules, shell, persistence/recovery/sync, offline assets and tests. Acceptance: every requested field survives offline edits and backup/sync round trips; lookup is optional and cannot overwrite personal data; wishlist priority and pivots work with missing metadata. Static/no-key lookup and legacy compatibility are constraints. Implemented with 0–5 half-point ratings, one year read and separate Audiobook/Audible indicators; [plan and verification](WISH-002-books-PLAN.md). Implementation complete; awaiting a requested release cut.

## Completed

- **WISH-001 — TV Library and Flexible Ratings**: closed in the 2.0.0 release cut. Independent TV library, TMDB metadata, layered ratings/notes, filters/pivots, offline editing and safe persistence. [Closeout](WISH-001-tv-tab-PLAN.md). Release cut is local; commit/deployment remain separate.

## New wish

Record ID/title, status (Proposed/Planned/Active/Completed/Parked), priority, effort, affected modules, behavior, observable acceptance criteria, constraints and unresolved decisions. Add a plan link only after planning. Increment Next ID; retain completed entries as short links, with public release prose in `assets/js/release-history.js`.
