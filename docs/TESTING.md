# Verification

Run `node scripts/check.mjs` from the repository root. It covers dependency-free tests, JS syntax, versions/manifests/assets/icons, offline shell coverage and diff checks; success prints one summary.

Use focused browser checks for ordinary changes. Release cuts additionally cover the matrix below in an isolated profile. Start a preview with `python3 -m http.server 8000`; stop it afterward. Mock GitHub/TMDB requests unless live authenticated testing was explicitly requested. Never include credentials or personal imports in fixtures/screenshots/source.

| Area | Release checks |
|---|---|
| Shell | Desktop and 390/320px mobile; light/dark; no console errors or page overflow; visible focus, shortcuts, dialogs and Settings. |
| Movies | Wishlist/Watched edit and reload, zero/half/historical ratings, optional dates/reviews, sorting/filter counts, column widths, pivot search/minimum/sorting. |
| TV | List/Filters/Pivots; show/season/half-point episode scores; episode notes; compact/detail toggle; resizing, auto-height notes, editor 90% dimensions; persistence after reload. |
| Books | Manual/catalog entry, every personal field, single-line Author, clear selected toggle/format states, eBook/format pills, YES/NO ownership labels, adjustable row height, table filling the viewport after What's New closes, sticky header, live column resizing and saved width, wider editor with Rating/Priority and Status/Year/Publication Date rows, title lookup stopping at a colon, icon-only Mark Read, switching a linked book directly to a different match while keeping personal edits, edition date/publisher/pages and subjects, batch Open Library refresh with recovery/stale/stop checks, wishlist priority, # rating/priority display, two-decimal Ave pills and Year notes marker, multi-author/genre/year pivots, zero/unrated ratings, missing provider metadata, refresh overrides, late responses, duplicate match rejection, failed writes, stale drafts, delete recovery, import preview and ID lookup with ambiguous/failed/stopped matches, repeat import linking existing unlinked books without replacing personal details, backup/cloud round trips and desktop/390/320px offline edit/reload. |
| Podcasts | Supplied Markdown/TSV and prepared JSON import, footer omission, Listening/Stopped mapping, annual USD values, membership-only entries, source Last/Time preservation, duplicate catalog skips, repeated import linking without personal overwrites, editable candidate search, stop/late responses, feed estimates and manual values, invalid/oversized XML, credentials excluded, stale drafts/previews, failed writes, recovery deletion, backup/sync and desktop/390/320px offline editing. |
| Notes | H1–H3 headings and nested collapse/expand (including loose text and wrapped blocks) without data loss, empty-heading Backspace and Enter-to-body behavior, Cmd/Ctrl formatting shortcuts and toolbar state, bold, italic and safe link formatting, link URL hover/open, autosave, blur/close flush, reload, draft cancellation after state replacement. |
| Data | Full backup round trip, legacy migration, additive TV/Books imports, stale-preview rejection, recovery before replacement, credentials excluded. |
| Storage pressure | Full localStorage: cloud restore saves IndexedDB recovery, removes only superseded recovery, survives reload; oversized replacement keeps live/stored state. Recovery restore and Erase All cover both stores. |
| Network/offline | Service worker controls page; offline reload/edit/save/reload; no stale TMDB response application; abort/401/429 feedback; assets cached under current build. |
| Sync | Mocked restore/merge/upload, conflict choices, local preferences retained, concurrent edits protected, failed persistence never reports success. |

With Playwright available, run `node tests/notes-editor.browser.cjs` against the local preview on port 8000 (or set `NOTES_TEST_URL`). It uses a fresh Chromium profile with synthetic Notes and covers folding, heading editing, formatting shortcuts, safe links, undo/redo, persistence and responsive widths.

Topic regressions belong with their change, not in a growing per-version checklist. Streaming and provider boundaries are in `docs/STREAMING-RULES.md`; subgenre, bulk-pivot and legacy-rating contracts are in `docs/MOVIES.md`. Automated tests preserve detailed cases; historical verification is available in Git.

Live multi-device GitHub verification remains a separate setup step (README). A local release cut never authorizes committing, pushing or modifying the cloud data repository.

Podcast browser regression: `node tests/podcasts.browser.cjs` against the local preview (or `PODCAST_TEST_URL`). It uses synthetic data and mocked public catalog/RSS responses in a fresh Chromium profile.
