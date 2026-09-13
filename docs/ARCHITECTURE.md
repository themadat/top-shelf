# Architecture

Top Shelf is a static, dependency-free, local-first application. Its blank main workspace is reserved for the future rating-list product, starting with movies and TV.

- `index.html` provides the header, centered search, Notes, Settings, dialogs, live regions, and asset references.
- `assets/css/app.css` owns themes, components, responsive layouts, safe areas, focus, and reduced motion.
- `assets/js/config.js` centralizes identity, build, limits, storage keys, fixed GitHub target, feature flags, Help, releases, and Roadmap.
- `assets/js/icons.js` contains the self-contained inline interface symbols and mount/set helpers.
- `assets/js/app.js` wires rendering, appearance, search, keyboard actions, Settings, and Notes.
- `assets/js/core/state.js` normalizes local state and backups and centralizes sync payloads, hashes, validation, application, and conflict-safe merges.
- Other core modules provide safe text/URL utilities, components, browser storage/recovery, portability, GitHub Sync, and PWA registration.
- `sw.js` caches the offline shell. Both manifests and the checked-in artwork support installation.

Local persistence and full backups use schema v4. Compatibility record/document fields remain readable but expose no Records or multi-note interface. Notes are displayed as plain text; normalization retains the compatible single-document representation. Fresh Notes are blank. Cloud data uses the `top-shelf-app-data` v1 envelope with schema v5; empty content is `{}`. Notes and nonempty legacy records sync, while device preferences, timestamps, credentials, and UI state do not. Full backups use `top-shelf-backup`.

Storage, secrets, recovery, service-worker cache prefixes, manifest identity, and the GitHub path belong to Top Shelf. Imports cannot redirect the fixed GitHub target. Credentials are stored separately in browser-local or tab-only storage and never exported. Replacements require recovery; differing content is never resolved from general save timestamps.

The runtime requires no account for local use. Only optional GitHub Sync performs authenticated data requests. Future product work should add the smallest useful model and UI without introducing speculative infrastructure.
