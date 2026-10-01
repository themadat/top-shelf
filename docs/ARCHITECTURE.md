# Architecture

Top Shelf is a static, dependency-free, local-first application. Movies, TV, Books and Podcasts have dedicated libraries; the other domain tabs retain starter views.

- `index.html` provides the header, centered search, Notes, Settings, dialogs, live regions, and asset references.
- `assets/css/app.css` owns shell styles; `assets/css/movies.css` holds movie/pivot styles and loads second to preserve the cascade.
- `assets/js/config.js` centralizes identity, build, limits, storage keys, fixed GitHub target, feature flags, Help, the current release, and Roadmap. `release-history.js` appends older release entries after config loads.
- `assets/js/icons.js` contains the self-contained inline interface symbols and mount/set helpers.
- `assets/js/app.js` wires rendering, appearance, search, keyboard actions, Settings, and Notes.
- `assets/js/core/movies.js` validates movie data and maps TMDB metadata. `core/tmdb.js` performs authenticated, abortable requests with timeouts and separate credential storage. `movies-ui.js` implements list/editor behavior; `movie-columns.js`, `movie-batches.js` and `movie-tools.js` own resizing, batch updates and export/bulk tools respectively. Load these before movies-ui.js.
- `assets/js/core/state.js` normalizes local state and backups and centralizes sync payloads, hashes, validation, application, and conflict-safe merges.
- Other core modules provide safe text/URL utilities, components, browser storage/recovery, portability, GitHub Sync, and PWA registration.
- `sw.js` caches the offline shell. Both manifests and the checked-in artwork support installation.

Persistence, schemas, migration, credential boundaries and conflict rules are documented once in [DATA-CONTRACTS.md](DATA-CONTRACTS.md).

The runtime requires no account for local use. Optional GitHub Sync and explicit TMDB lookups perform authenticated requests. Future product work should add the smallest useful model and UI without introducing speculative infrastructure.

`core/pivots.js` derives watched-only aggregates without modifying movie records; `pivots-ui.js` provides the Movies dashboard and locally persisted display controls. See [PIVOTS.md](PIVOTS.md) for calculation and interaction rules.

Podcasts separates the model (`core/podcasts.js`), table importer (`core/podcasts-import.js`), public discovery/feed readers (`core/podcast-catalog.js`, `core/podcast-feed.js`), and list/editor/import interfaces. See [PODCASTS.md](PODCASTS.md) for provider boundaries and import safeguards.
