# Handoff / Reference Index

No active implementation plan. WISH-001 is complete; its plan is a historical closeout. Start with Git status, not this file. Current version and release notes live in `assets/js/config.js` and `assets/js/release-history.js`; this index does not track per-build state.

| Working on | Read code | Contract/reference |
|---|---|---|
| Shell, Notes, settings | `assets/js/app.js`, `assets/css/app.css` | `docs/DATA-CONTRACTS.md` |
| Movies, table/editor | `assets/js/movies-ui.js`, `core/movies.js`, `movie-columns.js` | `docs/MOVIES.md` |
| TV list, filters, network pills | `assets/js/tv-ui.js`, `assets/css/tv.css` | `docs/TV.md` |
| TV editor, ratings, notes | `assets/js/tv-editor.js`, `core/tv.js` | `docs/TV.md` |
| TV import | `assets/js/tv-import-ui.js`, `core/tv-import.js` | `docs/TV.md` |
| TV pivot cards | `assets/js/tv-pivots-ui.js` | `docs/TV.md` |
| Movie pivots | `assets/js/pivots-ui.js`, `core/pivots.js` | `docs/PIVOTS.md` |
| Wishlist batches/streaming | `assets/js/movie-batches.js`, `core/tmdb.js` | `docs/STREAMING-RULES.md` |
| Movie exports/subgenres | `assets/js/movie-tools.js`, `subgenres-ui.js`, `core/subgenres.js` | `docs/MOVIES.md` |
| Persistence/cloud | `assets/js/core/{state,storage,sync,portability}.js` | `docs/DATA-CONTRACTS.md` |
| Offline/update/release | `assets/js/core/pwa.js`, `sw.js`, `scripts/release.mjs` | `docs/TESTING.md`, `docs/WORKFLOWS.md` |
| Icons | Search the specific symbol in `assets/js/icons.js` | Shared SVG catalog; no full-file reads |

Paths abbreviated as `core/...` are under `assets/js/`. Read only the row relevant to the task. Personal prepared imports remain local in ignored `import-preparation/`; never publish their contents. Update all app copies before syncing newer TV fields.
