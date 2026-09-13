# Agent handoff

Read AGENTS.md, this handoff, and context/WISHES.md before working. Preserve existing/manual edits. Run git status --short at session start. If work is in flight, inspect recent commits, the current diff, and its plan’s Resume block.

Top Shelf is a collection of personal rating lists across movies, TV, books, podcasts, restaurants, scotches, and future domains. Movies and TV are the initial direction. Version 0.0.1.2 adds My Stuff-style top-bar navigation for Movies, TV, Books, Podcasts, Music, Restaurants, Food, and Scotches, using the supplied inline artwork. Tabs show zero counts and starter views; list entry/scoring is not implemented. Number keys 1–8 switch shelves outside editable controls/dialogs; Left/Right/Home/End work within navigation. ui.selectedShelf is normalized, persists locally, and stays out of cloud content. The header keeps navigation and search together on wide screens and uses a horizontally scrolling shelf row on narrow screens.

Retained shell: app icon/theme and hold-for-Developer controls, name/version/Beta badges, centered search across Notes and support, one blank-on-first-run plain-text Notes modal, vertical Settings, appearance/backup/reset, dedicated Data Sync with JSON preview, generic Help, release history, empty Roadmap, Shortcuts, and Developer diagnostics. Local persistence/recovery, JSON portability, optional GitHub Sync, accessible shared components, PWA updates, and offline assets remain.

Identity and configuration live in assets/js/config.js. Storage keys use topShelf, the cache uses top-shelf-shell, the manifest id is ./top-shelf, full backups use top-shelf-backup, and content sync uses top-shelf-app-data v1. Local state schema v4 retains legacy record/document compatibility without exposing their old interfaces. Cloud schema v5 excludes device settings, credentials, timestamps, and empty collections. New app data never loads old browser namespaces.

GitHub Sync is enabled and fixed to themadat/app-data/main/data/top-shelf.json. Imports cannot redirect it. The local target is configured; external file existence, a narrowly scoped token, and real Test/Save plus upload/download verification remain pending user setup. Follow the links and checklist in docs/RESET.md; never request a token in chat. Do not write to the separate app-data repository without explicit authorization.

All interface SVGs are self-contained in assets/js/icons.js. The supplied star-and-shelf artwork is assets/icons/top-shelf.svg; light/dark assets share it, with 70% foreground scaling for maskable crops. Preserve every icon/touch/install/splash variant when updating artwork.

## Invariants

- Keep static, dependency-free runtime code and ordinary static hosting.
- Keep a single Notes modal and Settings Roadmap. Do not add Records, multiple notes, rich-text editing, or an app-space Roadmap without an explicit request.
- Preserve accessible native controls, focus restoration, safe URLs, escaped user text, responsive safe areas, and reduced motion.
- Use inline SVG interface symbols; the helper must resolve every retained consumer independently.
- GitHub Pages uses the checked-in Actions workflow only; do not also enable branch deployment.
- Keep origin git@github.com:themadat/top-shelf.git. Machine-specific SSH selection belongs in user Git/SSH configuration, as described in docs/GIT-SETUP.md.
- Versions are major.minor.patch.build. Keep the full version equal across identity, build id, dated release, HTML/manifest queries, service-worker cache/asset version, and deployment workflow name. The next ordinary application update is 0.0.1.3.

## Workflows

### `reset`

Reset only an explicitly requested copied checkout, following docs/RESET.md completely. Confirm identity/icon from the request; inspect path, remote, and cleanliness. Preserve the reusable shell, bake its symbols before removing product data, replace artwork and identity throughout, reset the blank state and documentation, and set 0.0.1.1. Reset alone never changes Git history, remotes, repositories, commits, pushes, or deployment. Keep the user-facing GitHub file/token setup checklist when sync is enabled.

### `wish`

Record an idea in `context/WISHES.md` without planning or implementing it.

- Check for duplicates and use the next `WISH-###` id.
- Capture behavior, rationale, priority, effort, acceptance criteria, constraints, affected files, and material open questions.
- Set the status to `Proposed`.

### `plan`

Investigate a wish without implementing it.

- Create or revise `context/WISH-###-slug-PLAN.md`.
- Put a `## Resume` section first, followed by decisions, scope, non-goals, file map, accessibility/responsive considerations, tests, and open questions.
- Link it from the wish and set the status to `Planned`.
- Do not change runtime files, build ids, or cache ids.

### `start`

Implement an approved plan.

- Read the wish and plan, set the wish to `Active`, and keep the Resume section current.
- Add only the architecture the real feature needs. Do not reintroduce the former Records interface, rich-text editor, or a speculative framework.
- Use `major.minor.patch.build` versions. For every completed application update, increment the fourth `build` component. When the user chooses a new major, minor, or patch value, reset `build` to `1` unless they specify it. Keep `identity.buildId` equal to the full version, add or update the matching dated release entry, update the build queries in `index.html`, update `CACHE_NAME` plus `ASSET_VERSION` in `sw.js`, and update the version in `.github/workflows/deploy-pages.yml`'s workflow `name` together.
- Verify the affected desktop, mobile, accessibility, and offline behavior.

### `cut`

Finalize an active line as a release.

- Confirm the semantic version and update `identity.version`.
- Confirm the major, minor, and patch values, set the fourth build component to `1` unless another value is requested, and use that full version for the build and service-worker cache ids.
- Update the manifests and README when public identity or behavior changed.
- Mark the wish `Shipped`, record its version/date, and archive its plan when useful.
- Run the complete verification baseline below.

Do not silently move from one lifecycle stage to another.

## Repository and verification

See docs/ARCHITECTURE.md for the file map and data contracts, docs/COMPONENTS.md for retained UI, docs/CUSTOMIZATION.md for changes, and docs/TESTING.md for the verification baseline. Syntax-check every runtime script, run dependency-free tests, parse manifests, validate local asset paths and symbols, and run git diff --check. Verify desktop/mobile Notes, Settings, search, appearance, backup/recovery, sync presentation, focus, reduced motion, and offline/update workflows. Stop local servers before the final response.

## End of turn

After file changes, give one concise outcome/verification summary followed by exactly one copy-paste command that stages only task files, commits with the exact subject shape `Version - Text`, and pushes the current branch. Use `git add .` when `git status --short` confirms all changes belong to the task; otherwise name the task files explicitly. Do not run it unless explicitly requested.
