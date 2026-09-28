# Task Reference Index

Read only the reference relevant to the change. This file is an index, not required startup reading.

| Task | Primary code | Reference |
|---|---|---|
| Identity/current release | assets/js/config.js | docs/WORKFLOWS.md (release only) |
| Shell, Notes, settings | assets/js/app.js, assets/css/app.css | docs/DATA-CONTRACTS.md (persistence only) |
| Movie table/editor | assets/js/movies-ui.js, assets/js/core/movies.js, assets/css/movies.css | docs/MOVIES.md |
| TV table/editor/ratings | assets/js/tv-ui.js, assets/js/tv-editor.js, assets/js/core/tv.js, assets/css/tv.css | docs/DATA-CONTRACTS.md (TV) |
| Movie widths | assets/js/movie-columns.js | docs/DATA-CONTRACTS.md |
| Wishlist batch checks | assets/js/movie-batches.js, assets/js/core/tmdb.js | docs/MOVIES.md, docs/STREAMING-RULES.md |
| Export/copy and bulk pivots | assets/js/movie-tools.js | docs/MOVIES.md |
| Pivots | assets/js/pivots-ui.js, assets/js/core/pivots.js, assets/css/movies.css | docs/PIVOTS.md |
| Subgenre review | assets/js/subgenres-ui.js, assets/js/core/subgenres.js | docs/MOVIES.md |
| Storage, backup, sync | assets/js/core/{state,storage,sync,portability}.js | docs/DATA-CONTRACTS.md |
| Offline/update | assets/js/core/pwa.js, sw.js | docs/TESTING.md |
| SVG icon | assets/js/icons.js (search specific symbol only) | — |
| Old releases | assets/js/release-history.js | Git history |
| Wish/plan/start/cut/reset | — | docs/WORKFLOWS.md, then named workflow files |

Use `node scripts/check.mjs` for automated checks. No mandatory per-build handoff updates. Keep stable contracts in the topic docs; labels, colors and spacing usually need code changes only.
