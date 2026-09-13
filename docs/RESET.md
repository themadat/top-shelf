# Reset a copied template

The one-word `reset` workflow turns a copy of App Template into a clean foundation for a different product. It keeps the reusable local-first application shell and removes the current SVG icon-library product. This is a source transformation performed by an agent, not a browser preference reset or a shell script.

The refined pre-launch shell at version `0.0.1.1` is the semantic baseline. Do not revert the repository to an old commit: later reusable fixes to Settings, sync, storage, PWA behavior, accessibility, and responsive layout must survive.

## Required preflight

1. Run `git status --short`, inspect the current path, and inspect `git remote -v`.
2. Continue only in the intended copied repository. Treat a directory named `app-template`, an `origin` ending in `themadat/app-template`, or an unchanged **App Template** identity as a canonical-target warning. If any remain, require explicit confirmation that this exact checkout should be transformed and obtain the new identity first.
3. Require a clean working tree unless every pending change is explicitly part of the reset. Do not discard or overwrite unrelated work.
4. Ask for the new application name before editing. If the reset request already names the app, repeat that name and obtain confirmation; never silently choose the final display name from the directory or remote. Use the confirmed name to derive and autofill the short name, filesystem-safe slug, page titles, manifest names, backup filenames, sync filenames, storage namespace, and other identity-bearing copy. Ask a follow-up only when a derived value would be ambiguous or unsafe.
5. Ask the user to attach or identify the new application icon before editing. Require one high-quality square SVG or PNG source, plus separate light/dark artwork only when the user wants appearance-specific variants. Confirm how a single source should be adapted, then replace the header icon, favicon, install icons, touch icons, maskable icons, splash artwork, and editable icon sources. A reset must not ship the App Template placeholder artwork.
6. Resolve the one-sentence description and repository/support URL from the request and non-template remote. Ask only for values that remain ambiguous after the name and repository are known.
7. Record the files that will be deleted before deleting them. Use exact paths; never use an unresolved broad glob or touch `.git`.

## Keep

- The static, dependency-free HTML/CSS/JavaScript architecture.
- The application header and semantic blank main workspace.
- The single plain-text Notes modal and its local autosave behavior.
- Vertical Settings navigation and the Appearance, Help, What’s New, Roadmap, Shortcuts, and Developer sections. What’s New and Roadmap remain separate.
- Theme selection, button presentation, text scale, contextual hints, focus handling, keyboard infrastructure, safe-area support, reduced-motion support, and responsive layout.
- Combined local/GitHub status, recovery copies, JSON export/import, and optional GitHub Sync with secrets kept outside exported state.
- PWA registration, offline shell, update notice, manifests, install assets, and the GitHub Pages Actions workflow.
- `assets/js/icons.js` and every symbol needed by the retained interface. This small inline interface-symbol set is shell infrastructure, not the icon-library product, and must be self-contained before the generated catalog is removed.
- Reusable utilities and components in `assets/js/core/`, pruned to the state and behavior the starter shell still uses.
- `docs/GIT-SETUP.md`, with separate personal- and work-laptop terminal Git/SSH setup and placeholders updated when the new repository target is known.
- The `reset`, `wish`, `plan`, `start`, and `cut` workflow contracts.

## Remove

- `assets/js/icon-library-part-1.js` through `assets/js/icon-library-part-4.js` and `assets/js/icon-library.js`.
- `build/compile-icon-library.mjs` and `build/icon-library-overrides.json`. Remove the empty `build/` directory if nothing reusable remains.
- Icon-library scripts and preload/cache entries from `index.html` and `sw.js`.
- The catalog rail, weight selector, cards, empty/loading states, metadata and details dialogs, override export controls, and icon-specific Developer controls from `index.html`.
- Catalog loading, search, category, source, type, weight, editing, override, copy, rail-resizing, pagination, and icon-specific shortcut code from `assets/js/app.js`.
- Icon-library state defaults, normalization, migrations, backup fields, and sync payload fields from `assets/js/core/state.js` and related core files. A new app does not inherit compatibility obligations for the template’s icon metadata.
- Catalog-only CSS after confirming that no retained shell component uses it.
- Catalog hints, Help topics, release history, Roadmap items, shortcut entries, feature flags, and other configuration content.
- Icon compiler, taxonomy, source-folder, canonical-weight, generated-file, catalog-count, icon-editing, and icon-specific testing prose throughout README, docs, agent context, and sample data.
- Obsolete wish/plan documents from the previous product line.

Do not remove the application icon assets, PWA icons, or the interface SVG symbol helper merely because their names contain “icon.” They serve the retained shell.

## Rewrite the starter state

- Set `identity.version` and `identity.buildId` to `0.0.1.1`.
- Set the same `0.0.1.1` value in every `index.html` build query, `CACHE_NAME`, `ASSET_VERSION`, and the fixed workflow `name` in `.github/workflows/deploy-pages.yml`.
- Apply the confirmed name and derived short name/slug everywhere identity appears: `assets/js/config.js`, document titles and visible fallback labels in `index.html`, both manifests, PWA metadata, backup/download filenames and metadata, GitHub Sync filenames, storage keys, Help/release copy, README/docs, repository links, and support links. Search for the former name, short name, slug, and template placeholders afterward; do not rely on a hand-maintained file list alone.
- Replace the supplied app artwork throughout `assets/icons/`: editable light/dark/gray sources, `app-icon-light.svg`, `app-icon-dark.svg`, `favicon.svg`, 192px and 512px install icons, maskable icons, 180px touch icons, and light/dark SVG and 1170px PNG splash assets. Preserve the supplied artwork rather than carrying forward the template geometry, keep important content inside the central 80% for maskable crops, and update every HTML/config/manifest/service-worker reference if a filename changes.
- Give the new application distinct local-storage, secret-storage, recovery, install, and GitHub Sync identifiers derived from its slug. Do not load the template’s existing browser data into the new app.
- Leave Notes blank on first run.
- Replace releases with one dated `0.0.1.1` entry describing the new application foundation. This is the entire initial What’s New history.
- Set Roadmap data to an empty array. The retained Roadmap UI must show an accurate empty state rather than demonstration items.
- Replace Help with concise topics that describe only retained behavior: getting started, Notes, appearance, backup/restore, optional GitHub Sync, install/offline updates, privacy, and shortcuts. Omit a topic when its corresponding feature is removed.
- Rebuild the visible shortcut list from the retained controls only. Remove catalog commands such as category, clear-filter, first-result, details, load-more, and weight keys.
- Reset `context/WISHES.md` to its empty ledger structure with `Next id: WISH-001`. Delete old `context/WISH-*-PLAN.md` files.
- Rewrite `README.md`, `docs/ARCHITECTURE.md`, `docs/COMPONENTS.md`, `docs/CUSTOMIZATION.md`, `docs/TESTING.md`, `docs/GIT-SETUP.md`, `AGENTS.md`, and the product description/invariants in `context/LLM_HANDOFF.md` around the new identity and actual retained surface. Keep this reset contract available for later copies, but remove historical icon-product details from it once their exact filenames no longer exist.
- Replace icon-specific sample backups with generic starter examples or remove them together with every reference.

## Provision the app data file and token

Complete these GitHub Sync steps for every reset that retains the optional sync module:

1. Derive a unique lowercase filename from the confirmed app slug, such as `data/trail-log.json`. Do not reuse another app’s file.
2. Open the [`app-data/data` folder](https://github.com/themadat/app-data/tree/main/data), create that JSON file on `main`, initialize it with `{}`, and commit it. The app’s first upload replaces this starter object with its normalized sync payload.
3. Set `config.cloudSync` to owner `themadat`, repository `app-data`, branch `main`, and the new `data/<app-slug>.json` path. Keep the target config-driven and read-only in Settings.
4. Open [Fine-grained personal access tokens](https://github.com/settings/personal-access-tokens) and create a token named for the app, using `themadat` as the resource owner.
5. Under **Repository access**, choose **Only select repositories** and select only `app-data`.
6. Under **Repository permissions**, set **Contents** to **Read and write**. Do not grant broader permissions merely for application sync.
7. Copy the token when GitHub displays it, paste it into **Settings → Data Sync**, choose whether this browser should remember it, then run **Test** and **Save**. The token is a secret: never place it in the data file, source, documentation, backups, commits, issues, or chat.
8. Configure the token separately in each browser or installed copy that will sync. The same app-scoped token can be entered on both laptops, or separate tokens can be used when independent revocation is preferred.

Do not mark sync setup complete until the fixed target displays `themadat/app-data/main/data/<app-slug>.json`, the file exists, **Test** succeeds, and a first upload/download round trip succeeds.

## Preserve the base interface symbols

Before deleting any generated icon-library file, inventory all remaining symbol consumers: every `data-symbol` value in HTML, every `icons.markup()` and `icons.set()` call in JavaScript, symbols requested by shared components, and symbols referenced by configuration data. Include the top bar, search, Notes, Settings tabs, Appearance choices, Hints restore action, Help, What’s New, Roadmap, Shortcuts, Developer, storage status, GitHub Sync status and actions, backup/restore/reset controls, dialogs, menus, toasts, and the PWA update flow.

Copy the exact SVG markup for that complete retained set into `assets/js/icons.js`. Remove `catalogMarkup`, `CATALOG_SYMBOL_NAMES`, and every lookup into `window.LocalApp.iconLibrary`; the reset shell must never depend on a product catalog that is about to be deleted. Prune only symbols proven unused after the inventory. Keep the symbols inline, sanitized, `currentColor`-driven where appropriate, and accessible through the existing `LocalApp.icons` helper.

Resetting a copied application is the sole versioning exception that may move a version backward. Later completed application changes resume normal four-part versioning at `0.0.1.2`.

## Boundaries

Reset does not rewrite or squash Git history, change branches or remotes, create a GitHub repository, change GitHub Pages settings, commit, push, or deploy. Perform any of those only after a separate explicit request. The `app-data` file and fine-grained token are user-facing checklist items: configure the fixed target locally, direct the user to the supplied GitHub links, verify completion, and never ask the user to paste a token into chat. Do not mutate the separate `app-data` repository on the user’s behalf unless they explicitly request that external write.

Reset also does not invent the new product’s data model or first feature. The output is a blank, working foundation ready for `wish`, `plan`, or a direct scoped implementation request.

## Acceptance checks

1. Search source, runtime, docs, and sample data for the removed filenames and identifiers. No runtime reference to `icon-library`, `iconLibrary`, generated catalog parts, the compiler, catalog categories, canonical weights, catalog-specific shortcuts, or override exports may remain. The only acceptable icon terminology describes application/PWA assets or the retained interface-symbol helper.
2. Confirm that no file larger than 20 MB remains unless the new application intentionally supplied it.
3. Confirm all public identity, storage namespaces, manifests, asset queries, cache ids, release data, and workflow version labels agree with the explicitly confirmed app name and `0.0.1.1`. Search for the old app name, short name, slug, repository placeholders, and template storage prefixes.
4. Confirm the header icon, favicon, light/dark install icons, maskable icons, touch icons, and splash assets all use the supplied artwork and render correctly at their target sizes. No App Template placeholder geometry may remain.
5. Confirm every remaining `data-symbol`, `icons.markup()`, `icons.set()`, component action symbol, and config-provided symbol resolves from the self-contained `assets/js/icons.js` after all generated catalog scripts are absent. Confirm no `catalogMarkup`, `CATALOG_SYMBOL_NAMES`, or `LocalApp.iconLibrary` dependency remains in the interface-symbol helper.
6. If GitHub Sync remains enabled, confirm `config.cloudSync` targets `themadat/app-data/main/data/<app-slug>.json`, that the file exists, and that a token scoped only to `app-data` with **Contents: Read and write** passes Test plus a first sync round trip. Confirm no token appears in tracked files, exported JSON, diagnostics, or logs.
7. Confirm What’s New has exactly one initial release, Roadmap has zero items and a useful empty state, Help contains only accurate retained topics, Notes starts blank, and `context/WISHES.md` starts at `WISH-001`.
8. Run JavaScript syntax checks for every remaining script, parse both manifests, run `git diff --check`, and verify every local path referenced by HTML, manifests, CSS, config, and the service worker exists.
9. Serve the repository locally and test desktop and mobile: startup without console errors, blank main workspace, header, Notes autosave, every Settings page, every retained SVG control, appearance controls, empty Roadmap, release/help search, shortcut hints, backup/import, combined local/GitHub status, PWA registration, update flow, offline reload, visible focus, reduced motion, and no horizontal overflow.
10. Stop the local server. Review `git status --short` and the deletion list before handing off the change.

The reset is complete only when the copied app works independently without loading, documenting, testing, or storing any part of the former icon-library product.
