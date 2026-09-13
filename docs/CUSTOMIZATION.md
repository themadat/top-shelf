# Customization

## Start from a clean foundation

After copying this repository for a different application, say `reset` in Codex. The workflow first asks you to confirm the new app name and provide a square app-icon source. It autofills the name and derived identity wherever appropriate, regenerates the header icon, favicon, install/touch/maskable icons, and splash assets, then removes the icon-library product and generated catalog while preserving the reusable app shell and infrastructure at `0.0.1.1`. It also bakes every symbol used by the retained base UI into a small self-contained catalog before deleting the product catalog. The complete keep/remove/rewrite contract and acceptance checks are in [`RESET.md`](RESET.md).

Reset is intentionally broad. Run it in the copied repository, not the canonical template checkout. It does not rewrite history, change the remote, commit, push, or deploy.

For one-time terminal Git and SSH setup on separate personal and work Macs, use [`GIT-SETUP.md`](GIT-SETUP.md).

## Rename the application

Change `identity` in `assets/js/config.js`, then mirror user-visible fallback metadata in `index.html`, `manifest.webmanifest`, and `manifest-dark.webmanifest`. Update repository and support URLs before publishing.

## Replace demonstration data

- Edit `demoDocuments()` in `assets/js/core/state.js` for the first-run note.
- Edit `roadmap` and `releases` in `assets/js/config.js`.
- Keep stable ids and valid ISO dates.
- Do not ship secrets, personal data, or domain-specific source-application content.

## Update the icon catalog

Edit SVG template literals or standalone SVG files in their source apps, then run `node build/compile-icon-library.mjs` from this repository. The default scan discovers every non-hidden sibling directory beside `app-template`, including `mctree-mchome`, plus the focused backup sources including All 1 Ultralight, All 3 Light, All 5 Medium, All 7 Bold, and All 9 Black; pass explicit directories as command arguments to use a narrower group. Files from All 1 Ultralight, All 3 Light, All 5 Medium, All 7 Bold, and All 9 Black are stored as native Ultra, Light, Medium, Bold, and Black variants on matching symbols rather than duplicate catalog entries. The compiler also maps 50 app-facing symbol names to their verified native counterparts, completing every selectable weight without creating duplicate cards. Commit the regenerated `assets/js/icon-library-part-1.js` through `icon-library-part-4.js` and the small `assets/js/icon-library.js` assembler; together they contain the SVGs, multi-category assignments, semantic tags, aliases, and source metadata, so every app copied from the template retains the complete catalog without Node or a runtime build. Commit `build/icon-library-overrides.json` when exported name/type/group/filter-source changes or explicit exclusions should remain hard-coded across later rebuilds.

The compiler accepts every complete SVG template literal ending with `</svg>` and a closing backtick, fixed SF Symbol markup embedded in source HTML, and standalone `.svg` files up to 256 KB. It removes XML wrappers, rejects scripts, event handlers, foreign objects, JavaScript or external URLs, dynamic template fragments, and generated `dist/` bundles, then deduplicates normalized artwork, coalesces same-name SF Symbols while retaining source references, labels each result as SF Symbol or Custom, removes the imported `Svgrepo Com` label suffix, assigns every retained icon to at least one category, and expands common concepts into searchable tags. Root categories use `section: "meaning"` by default or `section: "appearance"` for visual treatments. Geography is the parent for Countries, Regions, Mapping, and Places; source folders and metadata distinguish geographic areas from mapping tools and physical destinations. Text Formatting nests under Editing, Connectivity joins Devices, and source paths classify game artwork. Legacy Locations, Maps, and Maps & Travel IDs migrate automatically. Keep new top-level categories to roughly 20 icons or 1% of the catalog unless the concept is unusually distinct and high-intent; prefer a nested category for smaller precise sets. Badge subtype detection and the existing SVG Converter source rules remain source-aware after deduplication. Edit `ICON_CATEGORIES`, source-aware rules, and `TAG_GROUPS` when a copied app needs additional neutral taxonomy.

The in-app editor writes sanitized name/type/group/filter-source overrides into local state. Name and Type are available directly in Icon details; the complete editor adds groups and the repository-filter source without discarding the compiled original-source list. **Export overrides** downloads a plain JSON array containing `iconId`, `label`, `categories`, plus optional `kind` and `source` values when they differ from the compiled metadata. Attach it to a future request, merge its entries into the committed override file, or replace `build/icon-library-overrides.json` with it and rebuild the catalog. The compiler accepts both this simple array and the wrapped `app-template-icon-library-overrides` format. The wrapped format may include `excludedIconIds` to permanently omit unwanted extractions, and an entry may use `exactCategories: true` when its exported memberships must replace inferred child categories exactly. Unknown icon IDs are reported as missing, invalid file formats fail the compiler, and unrecognized category, type, or source IDs are discarded. Every recognized child group gains its required ancestors automatically.

The aggregate `svg-converter/app-input/!All/` roll-up is intentionally skipped because its copies add redundant aliases and provenance without unique artwork.

## Appearance

Base theme variables live at the top of `assets/css/app.css`, with fallback colors in `config.themeDefaults`. Settings exposes color mode, button presentation, and one application-wide text scale; it intentionally omits individual color editors, preset themes, and a manual motion override. Reduced motion follows the device preference.

## GitHub Sync target

Set `config.cloudSync.owner`, `repo`, `branch`, and `path` in `assets/js/config.js` for the copied application. Settings presents those values together as compact read-only metadata, with links on the repository and exact data-file path, and asks the user only for a fine-grained token. State normalization reapplies the configured target so a backup, import, or older saved state cannot silently redirect synchronization.

For a reset that retains sync, use owner `themadat`, repository `app-data`, branch `main`, and a unique `data/<app-slug>.json` path. Create the file from the [`app-data/data` folder](https://github.com/themadat/app-data/tree/main/data). Create or manage the app’s token from [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens), select only the `app-data` repository, and grant only **Contents: Read and write**. Tokens are configured per browser/device and must never be committed or placed in the shared JSON file. The complete setup and verification sequence is in [`RESET.md`](RESET.md#provision-the-app-data-file-and-token).

## Keyboard shortcuts

Add a visible entry to `SHORTCUTS` in `assets/js/app.js`, add `data-shortcut` to the related control when a hint is useful, and handle the key in `handleGlobalKeydown()`. Ignore shortcuts in editable controls and always retain a visible, keyboard-operable action.

## Add a record type or module

1. Define a narrow default and normalizer in `assets/js/core/state.js`.
2. Add migration handling before changing stored shapes.
3. Add a semantic module surface and navigation control in `index.html`.
4. Add render and event functions in `assets/js/app.js`.
5. Add responsive and reduced-motion styles.
6. Include the collection in export/sync payloads only if users manage it.
7. Document and test empty, loading, disabled, offline, and error states that apply.

Avoid generic abstractions until a second real module needs the same behavior.

## Remove optional modules

- Roadmap: remove its Settings tab/panel and event/render code, then set `features.roadmap` to `false`. Release history can remain without planned/wishlist views.
- GitHub Sync: remove `core/sync.js`, its script tag, settings/status markup, related event wiring, and its `sw.js` cache entry. Keep JSON backup/restore.
- Developer tools: set `features.developerTools` to `false` and remove the Developer panel if it will never be used.
- Contextual hints: set `features.hints` to `false` and remove hint/settings markup if desired.
- Notes: remove its top-bar control, modal, and event code. Retain legacy document migration fields until old backups no longer need support.
- Icon library: remove `icon-library-part-*.js`, `icon-library.js`, their script and service-worker entries, the main-page catalog markup/styles, and the related render/copy/filter code in `app.js`. Replace the `main` landmark with the new application interface.

## Publish a version

Versions use `major.minor.patch.build`. Increment the fourth component for every completed application update. If a major, minor, or patch value changes, reset the build component to `1` unless another value is required. Add the newest release card first, show its date beside its version in the release log, keep `buildId` equal to the full version, update manifest text if public metadata changed, update the build queries in `index.html`, set the matching `CACHE_NAME` and `ASSET_VERSION` in `sw.js`, and keep the version in `.github/workflows/deploy-pages.yml`'s workflow `name` identical so GitHub Mobile notifications show the build. Use the commit subject `Version - Text`, then run the complete checklist in `docs/TESTING.md`.

## Icons and PWA assets

Follow the size and export instructions in the README. Keep the service worker asset list synchronized with renamed files and verify light, dark, maskable, touch, favicon, and splash variants.
