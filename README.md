# App Template

A static, local-first SVG icon library with no required build step, runtime dependency, backend, account, or sign-in. Search the compiled catalog and select any icon to copy its complete inline SVG for another app.

The template starts on the pre-launch `0.0.1` line at version `0.0.1.74` (`major.minor.patch.build`). Routine updates increment the fourth number.

The included product surface is intentionally focused:

- Sticky application header with version, Beta, centered icon search, Notes, and Settings controls.
- Full-width responsive catalog of 7,231 deduplicated SVG icons gathered from the configured local sources, including 7,152 source files for each native Ultra, Light, Medium, Bold, and Black set.
- Compact 132–140px Symbol/Custom cards sized for uninterrupted 20-character names beside a sticky, horizontally resizable filter rail with a persistent Ultra/Light/Medium/Bold/Black SF Symbol weight selector with 1/3/5/7/9 shortcuts and categories split into **What it is** and **How it looks**. A selects All, while C clears search plus every active category, type, source, and developer label-length filter. Semantic destinations include Recreation with Games and Sport children, Transportation with an Automotive child, Geography with Countries, Regions, Mapping, and Places children, Development, Energy & Power, Entertainment & Media, Indices, Celebrations & Awards, Clothing & Personal Items, Education & Science, Home & Appliances, Apps & Branding, Devices & Connectivity, nested Text Formatting, and Nature with Animals & Plants and Weather children. The alphabetized appearance set includes Arrows with Chevron, Chevron Arrow, Triangle, and Triangle Arrow children, plus Badged, Building, Circled, Dashed & Dotted, Layered & Stacked, Rays & Sparkles, Shapes, Slashed, and Squared. The catalog also provides semantic search tags, persistent collapsible branches, editable names/types/groups/filter sources, right-click group removal with Undo, compact override export, source details, module shortcuts, 500-icon batches, and one-click SVG copying.
- Single plain-text Notes modal that starts empty and autosaves locally.
- Replaceable Roadmap inside Settings with search, state/priority/target/effort filters, live result count, reset, and sorting.
- Icon-led vertical Settings navigation with application-wide text scaling, a matched square/A Button Style symbol set, symbol-led Hints controls, full-screen mobile scrolling, compact fixed-target GitHub setup, separate collapsible release history and Roadmap views, searchable Help, and a shortcut reference below Roadmap.
- Optional GitHub Contents API synchronization with explicit conflict choices and manual JSON backup/restore.
- Contextual hints, toast and live announcements, keyboard shortcuts, including V/X What’s New banner actions and a visible 30-second auto-dismiss countdown, shortcut-hint mode, and hidden Developer Mode with minimum-label-length filtering.
- Installable offline PWA shell with light/dark assets and a bottom new-version toast with R/X Force Refresh and Close shortcuts.

## Run locally

From the repository folder:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. Use a local server instead of opening `index.html` directly so the service worker and PWA behavior can run.

## Start a new application

Copy or duplicate this repository, open the copy in Codex, and say `reset`. The workflow asks you to confirm the app name and provide a high-quality square SVG or PNG app icon before it edits anything. It derives and autofills the short name, slug, page and manifest titles, download/sync names, storage namespace, and other identity-bearing copy from the confirmed name.

Reset keeps the reusable local-first shell, Notes, vertical Settings pages, Appearance, Help, What’s New, Roadmap, Shortcuts, storage/recovery, JSON portability, optional GitHub Sync, PWA/offline support, accessibility, responsive behavior, and Pages workflow. Before deleting the roughly 93 MB icon-library catalog, it bakes every SVG needed by the top bar, search, Notes, Settings, GitHub Sync, dialogs, toasts, and PWA controls into the small self-contained interface catalog. It replaces every app-icon/favicon/install/splash variant with the supplied artwork, leaves a blank starter workspace, creates fresh Help and release content, empties the Roadmap and wish ledger, isolates browser storage under the new app identity, rewrites the README and documentation, and starts the copied app at `0.0.1.1`.

The reset does not rewrite Git history, change remotes, commit, push, or deploy. It refuses to transform the canonical template checkout without explicit confirmation. See [`docs/RESET.md`](docs/RESET.md) for the exact contract and acceptance checklist.

## Project structure

```text
index.html                     Application shell, icon-library page, Notes, and dialogs
.github/workflows/deploy-pages.yml  Version-labelled GitHub Pages runs and notifications
assets/css/app.css             Theme, layout, components, and responsive behavior
assets/js/config.js            Identity, versions, theme defaults, help, releases, and roadmap
assets/js/icons.js             Inline SF Symbol SVG catalog
assets/js/icon-library-part-*.js  Generated icon data split below GitHub’s large-file warning threshold
assets/js/icon-library.js      Small assembler for the generated catalog parts
assets/js/app.js               Application rendering, actions, and keyboard wiring
assets/js/core/state.js        Defaults, normalization, migrations, validation, and merge
assets/js/core/storage.js      Local persistence, secret storage, and recovery copies
assets/js/core/components.js   Dialogs, popovers, menus, toasts, and loading UI
assets/js/core/portability.js  JSON export, validation preview, and import
assets/js/core/sync.js         Optional GitHub synchronization state machine
assets/js/core/pwa.js          PWA assets, update notices, and device detection
assets/icons/                  Editable and generated application assets
build/compile-icon-library.mjs Dependency-free development-time icon scanner/compiler
build/icon-library-overrides.json Compiler-consumed permanent name/group/source overrides
manifest*.webmanifest          Light and dark install metadata
sw.js                          Offline shell and update cache
docs/                          Architecture, customization, reset, Git/SSH, and test guides
context/                       Agent reset, wish, plan, start, and cut workflows
```

## Rebuild the SVG icon catalog

The committed `assets/js/icon-library-part-*.js` data files and `assets/js/icon-library.js` assembler are sufficient at runtime; rebuilding them is an optional development task. By default, the compiler discovers and scans every non-hidden sibling directory beside `app-template`, including `mctree-mchome`. It deliberately excludes the broad `!backups:data` parent, while adding its configured `icons/app-input/Objects & Tools`, `norway:sweden`, `indicies`, `Rest`, `All 1 Ultralight`, `All 3 Light`, `All 5 Medium`, `All 7 Bold`, and `All 9 Black` children as focused sources. The All 1 Ultralight, All 3 Light, All 5 Medium, All 7 Bold, and All 9 Black folders are the canonical native weight artwork: matching symbols gain exact per-weight geometry without duplicate cards, while genuinely new names are added normally. Fifty app-facing symbol names map to their verified app-input counterparts across all five canonical weights so legacy app artwork never substitutes for folder-sourced geometry. It also retains the existing compiled catalog so icons do not disappear merely because an earlier source folder moved out of the active scan; use `excludedIconIds` for intentional removal. It captures every complete SVG template literal that closes with `</svg>` and a backtick, fixed SF Symbol markup embedded in source HTML, and standalone `.svg` files. It rejects dynamic, executable, or externally referenced SVG content, skips generated `dist/` directories and standalone canvases larger than 256 KB, deduplicates matching artwork, coalesces repeated SF Symbol names, classifies results as SF Symbols or Custom, assigns one or more reusable categories, generates semantic search tags, removes the imported `Svgrepo Com` suffix from display labels, and preserves aliases plus source metadata. Source-aware rules place country outlines and country-specific geographic icons in Geography → Countries; continents, states, provinces, territories, other administrative outlines, and world/globe views in Geography → Regions; map pins, routes, navigation symbols, compass/direction symbols, map layers, and controls in Geography → Mapping; and buildings, landmarks, monuments, points of interest, parks, airports, transit stations, and other destinations in Geography → Places. Rest inputs reuse existing categories by meaning, with Automotive nested under Transportation and distinct Development and Energy & Power destinations where the prior taxonomy lacked an accurate home. Text Formatting inputs remain under Editing, Connectivity inputs in Devices & Connectivity, game artwork in Recreation → Games, sports in Recreation → Sport, and Norway & Sweden source records in Commerce. Requested sources retain repository provenance; an exact permanent override may intentionally remove an inferred category while preserving that provenance. Every retained icon still maps into at least one semantic category and receives searchable name, category, and synonym tags. People is restricted to symbols whose metadata describes a person or body part. Arrow metadata drives the Chevron, Triangle, Chevron Arrow, and Triangle Arrow appearance branches; Building-shaped artwork receives the Building appearance filter. Existing Actions, Locations, Maps, Maps & Travel, Games, Sports & Recreation, and Norway & Sweden stored values migrate into the current taxonomy. The other curated SVG Converter folders retain their dedicated categories after deduplication unless an exact permanent override changes membership. Badged exports 39 primary choices, including `Badge` for a plain badge with no suffix; its Shapes branch contains Shield and Triangle, while Exclamation Mark contains Circle and Triangle. Circle, Multiple, and Slash remain searchable but are not direct Badge filters. Name metadata also drives Building, Squared, Circled, and Slashed. Other stays visible directly beneath All even when its count is zero.

Explicit dashed/dotted and layer/stack name tokens drive the Dashed & Dotted and Layered & Stacked appearance filters. Their matching override entries retain those objective visual memberships when other categories are manually curated.

The aggregate `svg-converter/app-input/!All/` roll-up is also skipped because its copies would add redundant aliases and provenance without adding unique artwork.

For taxonomy changes, use roughly 20 icons or 1% of the catalog as a top-level-category starting point. Smaller categories are justified when they represent a distinct, high-intent lookup such as Food & Drink, or when they are nested under a broader parent; avoid creating a top-level filter for a handful of incidental matches.

Run it after adding or changing source symbols:

```sh
node build/compile-icon-library.mjs
```

To scan a different group of local repositories, pass their directories explicitly:

```sh
node build/compile-icon-library.mjs /path/to/first-app /path/to/second-app
```

The compiler rewrites `assets/js/icon-library-part-1.js` through `icon-library-part-4.js` plus the small `assets/js/icon-library.js` assembler and reads optional permanent metadata changes from `build/icon-library-overrides.json`. Embedded SVG stylesheet selectors are scoped to their source artwork so a catalog icon cannot restyle application controls. Pass explicit directory arguments when you want a narrower scan than the default sibling-directory discovery. After rebuilding, advance the app build version and test tag/name search, multi-word queries, nested categories, A-to-All and C-to-clear shortcuts, pointer and keyboard rail resizing plus width persistence, SVG rendering, stylesheet isolation, absence of same-name SF Symbol duplicates, Enter-to-results focus, module shortcuts, type/source filters, compact previews, metadata editing, update-file export, details, clipboard copying, and offline loading. The generated files are committed, so apps copied from this template have the complete catalog without Node or a runtime build.

## Edit icon metadata

Open an icon’s information button to edit its **Name** and **Type** directly while viewing provenance. Select the displayed icon name to open the complete metadata editor for Name, Type, groups, and the source used by repository filtering; the original repository, file, path, and source-symbol list remains unchanged in Icon details. When a category is selected, right-click an icon to remove it from that group; the confirmation toast provides Undo. Category branches can be collapsed independently and remember that state. These overrides autosave locally, participate in JSON backup and GitHub Sync, and survive **Reset preferences**. An edit that would leave an icon without a group is placed in Interface. **Reset icon** restores only that icon’s compiled metadata.

Select **Export overrides** in the editor or Developer Mode—or use the Export overrides action in the save toast—to create `app-template-icon-overrides-YYYY-MM-DD.json`. Attach that file in a future request and ask for it to be hard-coded. The compact file is a plain array containing `iconId`, `label`, `categories`, plus `kind` and `source` only when those values differ from the compiled metadata; it can also replace `build/icon-library-overrides.json` directly because the compiler accepts both the simple array and wrapped format. The wrapped format may include `excludedIconIds` when a bad extraction must remain absent from later rebuilds, and permanent entries may use `exactCategories: true` when exported memberships must replace inferred source or child categories exactly. Each entry uses the stable generated icon id, so changed metadata still applies on later catalog rebuilds. After a catalog update bakes an entry in, the app removes that matching entry from its local pending overrides automatically, so the next export contains only later edits. The file contains no SVG content, tokens, or other secrets.

## Update the application icons

Editable sources and generated install assets are in `assets/icons/`. Keep the existing filenames unless you also update every reference in `index.html`, both manifests, `assets/js/config.js`, and `sw.js`.

1. Replace the six editable source files named `App Icon Template Light.svg`, `App Icon Template Light.png`, `App Icon Template Dark.svg`, `App Icon Template Dark.png`, `App Icon Template Gray.svg`, and `App Icon Template Gray.png`.
2. Copy the light and dark SVG sources to `app-icon-light.svg` and `app-icon-dark.svg`; give every construction path the same width and opacity so the grid, X, and concentric circles remain equally visible at 42px. Copy the gray SVG source to `favicon.svg`; keep its Safari-gray background fully opaque and edge to edge, use saturated neon-blue strokes, match the center horizontal and vertical bars to the X weight, and retain the grid and concentric circles without square outlines. Keep important install-icon artwork inside the central 80% for maskable crops.
3. Export the light icon to:

   - `icon-192.png` at 192 × 192
   - `icon-512.png` at 512 × 512
   - `icon-512-maskable.png` at 512 × 512
   - `apple-touch-icon.png` at 180 × 180

4. Export the dark icon to:

   - `icon-192-dark.png` at 192 × 192
   - `icon-512-dark.png` at 512 × 512
   - `icon-512-maskable-dark.png` at 512 × 512
   - `apple-touch-icon-dark.png` at 180 × 180

5. Replace `splash-light.svg` and `splash-dark.svg`, then export `splash-light.png` and `splash-dark.png` at 1170 × 1170.
6. Advance the fourth component of the app version, use the same full version as the build identifier, add the matching release entry, update the build queries in `index.html`, update both `CACHE_NAME` and `ASSET_VERSION` in `sw.js`, and update the version in the workflow `name` inside `.github/workflows/deploy-pages.yml` so installed copies and deployment notifications identify the same build.

Example Inkscape exports:

```sh
inkscape assets/icons/app-icon-light.svg --export-filename=assets/icons/icon-512.png --export-width=512 --export-height=512
inkscape assets/icons/app-icon-dark.svg --export-filename=assets/icons/icon-512-dark.png --export-width=512 --export-height=512
```

Verify the favicon, launcher icon, maskable crop, and splash artwork in both appearances.

## Set up terminal Git access

Use [`docs/GIT-SETUP.md`](docs/GIT-SETUP.md) for a portable Git setup across personal and work computers. Keep the repository’s standard GitHub remote URL and select the correct account through each computer’s local SSH/Git configuration. The guide covers existing personal/work profiles, narrowly scoped account routing, first-time keys, and dry-run push verification. Terminal SSH access is separate from the app’s optional browser-based GitHub Sync token.

## Configure optional in-app GitHub Sync

Set the application repository in `config.identity.repository` and the fixed sync target in `config.cloudSync` inside `assets/js/config.js`, then open **Settings → Data Sync** and provide a fine-grained personal access token limited to that repository with **Contents: Read and write** permission. The GitHub heading links to the application repository. Owner, linked sync repository, branch, and linked JSON file path appear together on one read-only metadata line so saved or imported application state cannot redirect synchronization.

New apps created with `reset` use a unique JSON file in [`themadat/app-data/data`](https://github.com/themadat/app-data/tree/main/data). Create the app-scoped credential from [GitHub’s fine-grained token settings](https://github.com/settings/personal-access-tokens), select only the `app-data` repository, and grant **Contents: Read and write**. The reset checklist records the exact file, target, token, and first-sync verification sequence.

The token stays in browser storage on that device and is never included in exports or diagnostics. Settings keeps the saved token masked in its password field and labels whether it is stored on the device or only for the browser tab. Save stores it directly; a successful Test also stores the verified token according to the Remember choice, while a failed test does not persist a newly entered token. Background sync checks do not overwrite token or Remember-choice edits that are still in progress. The Sync button checks local and remote state before choosing upload, download, merge, or conflict handling. JSON export/import remains the fallback.

GitHub Sync contains only saved Notes and custom icon metadata (plus any nonempty legacy record content). A fresh template uploads an empty `data` object in a small versioned envelope. Appearance, filters, sidebar layout, open Settings tabs, release notices, credentials, and save timestamps remain local and never make content pending. Downloads preserve device settings. Full JSON backups still include them.

Existing whole-state cloud files are read compatibly. The next **Sync Now** rewrites a matching old file into the compact format; background checks never upload. Refresh both computers to **0.0.1.67** or later before syncing; older builds reject the new envelope instead of treating it as empty data. When both copies differ, choose upload or download; merge is available only for matching or separate items and keeps content present in either copy.

## Host as a static site

Upload the repository contents without changing their relative paths. Use HTTPS in production so service-worker and install features are available. Keep `sw.js` at the application root because its location defines the offline scope.

For GitHub Pages, use **Settings → Pages → GitHub Actions** as the only publishing source. The checked-in `deploy-pages.yml` workflow publishes the repository root after each push to `main`. Its dynamic run title uses the required `Version - Text` commit subject in the Actions interface, while its fixed workflow `name` includes the current application version because GitHub Mobile displays that field in deployment notifications. Advance the version in that workflow name with every application build. Do not enable **Deploy from a branch** at the same time; two publishing paths create duplicate deployments and notifications for the same commit.

The service worker checks the network first for same-origin application files, and `index.html` gives build-stamped URLs to the application assets. An ordinary browser refresh therefore retrieves a consistent current set of HTML, CSS, and JavaScript when online, then falls back to the cached shell when offline. When a waiting worker is ready, a persistent **New version available** toast appears at the bottom. Its clockwise-arrow action force-activates that worker and reloads with a cache-busting URL, including in the installed PWA. While the toast is visible, <kbd>R</kbd> runs Force Refresh and <kbd>X</kbd> closes the notice; both also work with Shift–Control–Option.

## Agent workflow

`AGENTS.md` and `context/LLM_HANDOFF.md` define the repository workflow:

- `reset`: turn a copied repository into a clean `0.0.1.1` application foundation.
- `wish`: record an idea only.
- `plan`: investigate and document it only.
- `start`: implement an approved plan.
- `cut`: finalize a release.

After a completed change, agents provide one copy-paste command that stages only relevant files, creates a commit in the form `Version - Text` (for example, `0.0.1.74 - Add Data Sync settings and JSON preview`), and pushes the current branch. This version-prefixed subject labels the GitHub Pages run in Actions; the synchronized version in the workflow `name` labels its GitHub Mobile notification. When every working-tree change belongs to the update, the command uses `git add .`; if unrelated changes exist, it names only the relevant files. Agents do not run it unless explicitly asked.
