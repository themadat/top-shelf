# Architecture

Top Shelf is a static, dependency-free, local-first application. The Movies workspace implements Wishlist and Watched lists; the other seven domain tabs retain starter views.

- `index.html` provides the header, centered search, Notes, Settings, dialogs, live regions, and asset references.
- `assets/css/app.css` owns themes, components, responsive layouts, safe areas, focus, and reduced motion.
- `assets/js/config.js` centralizes identity, build, limits, storage keys, fixed GitHub target, feature flags, Help, releases, and Roadmap.
- `assets/js/icons.js` contains the self-contained inline interface symbols and mount/set helpers.
- `assets/js/app.js` wires rendering, appearance, search, keyboard actions, Settings, and Notes.
- `assets/js/core/movies.js` validates movie data and maps TMDB metadata. `core/tmdb.js` performs authenticated, abortable requests with timeouts and separate credential storage. `movies-ui.js` implements list and editor behavior.
- `assets/js/core/state.js` normalizes local state and backups and centralizes sync payloads, hashes, validation, application, and conflict-safe merges.
- Other core modules provide safe text/URL utilities, components, browser storage/recovery, portability, GitHub Sync, and PWA registration.
- `sw.js` caches the offline shell. Both manifests and the checked-in artwork support installation.

Local persistence and full backups use schema v5. Compatibility record/document fields remain readable but expose no Records or multi-note interface. Notes are displayed as plain text; normalization retains the compatible single-document representation. Fresh Notes are blank. Cloud data uses the `top-shelf-app-data` v3 envelope with schema v7; empty content is `{}`. Movies, deletion markers, Notes, and nonempty legacy records sync, while device preferences, timestamps, credentials, and UI state do not. Full backups use `top-shelf-backup`. Prior schema v4 state and v1/v2 cloud data migrate. Storage moves to topShelf.state.v5; custom theme colors are retained while the old defaults become teal and coral. Movie merges reject differing records and deletion conflicts; they never choose from timestamps.

Storage, secrets, recovery, service-worker cache prefixes, manifest identity, and the GitHub path belong to Top Shelf. Imports cannot redirect the fixed GitHub target. Credentials are stored separately in browser-local or tab-only storage and never exported. Replacements require recovery; differing content is never resolved from general save timestamps.

The runtime requires no account for local use. Optional GitHub Sync and explicit TMDB lookups perform authenticated requests. Future product work should add the smallest useful model and UI without introducing speculative infrastructure.

`core/pivots.js` derives watched-only aggregates without modifying movie records; `pivots-ui.js` provides the Movies dashboard and session-only display controls. Neither changes the backup or sync contract.
