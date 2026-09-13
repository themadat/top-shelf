# Reset a copied application

This workflow transforms an explicitly requested copy into a new local-first foundation at 0.0.1.1. Preserve current shell fixes; do not revert Git history. Reset does not invent a new product model or implement its first feature.

## Preflight

1. Read AGENTS.md, context/LLM_HANDOFF.md, and context/WISHES.md; run git status --short and inspect the path and origin. Require a clean tree unless all edits belong to the reset. Preserve unrelated/manual edits.
2. Verify this is the intended copy. A canonical source path or remote requires explicit authorization before transformation. Obtain the new app name, square SVG/PNG source, description, and repository URL; use values already explicitly supplied by the user. Explain how one source will be used for appearance variants.
3. Derive name, short name, slug, titles, download filenames, storage/secret/recovery keys, manifest identity, cache prefix, and sync file from that identity.
4. Inventory exact deletion paths before deleting. Never touch .git or use unresolved broad deletion globs.

## Preserve and remove

Keep the static header, centered search, blank semantic main surface, single plain-text Notes modal, vertical Settings, appearance, Help, What’s New, empty Roadmap, Shortcuts, Developer diagnostics, hints, keyboard/focus infrastructure, responsive safe areas, recovery, JSON portability, optional sync, PWA/offline support, application assets, and deployment workflow.

Remove the prior product’s generated data, build tools, markup/dialogs, runtime behavior, state fields, shortcuts, hints, unused CSS, cache entries, tests, examples, and product prose. Before deleting any source of interface artwork, inventory every HTML data-symbol, icons.markup/set call, component action, and configuration symbol. Bake the exact retained SVG markup into assets/js/icons.js, then remove any product-data fallback. Verify every dynamic and static symbol resolves.

Keep generic compatibility fields only when the retained state, backup, or sync contract needs them. Do not restore removed multi-note or rich-text interfaces. Remove obsolete wish plans and reset context/WISHES.md to the empty WISH-001 ledger.

## Rewrite

Set all identity/build/release/HTML/manifest/cache/workflow versions to 0.0.1.1. Replace all public identity, repository/support links, filenames, browser storage namespaces, manifest id, cache prefix, and sync format/path. New copies must not read another app’s browser storage, credentials, or cloud file.

Replace the editable app SVG/PNG and every header, favicon, light/dark install, maskable, 180px touch, and SVG/1170px PNG splash variant. Keep maskable foreground within the central safe circle. Preserve supplied artwork and adapt appearance only as requested. Validate every asset reference and inspect representative sizes.

Start Notes blank, Roadmap empty with a useful empty state, and What’s New with exactly one dated initial release. Help and shortcuts must describe only retained behavior. Rewrite README, architecture, components, customization, testing, two-laptop Git setup, AGENTS.md, and handoff around the new identity. Preserve reset/wish/plan/start/cut workflows. Do not silently advance lifecycle stages.

## GitHub Sync setup

For Top Shelf, the fixed target is `themadat/app-data/main/data/top-shelf.json`:

1. Open [app-data/data](https://github.com/themadat/app-data/tree/main/data), create `top-shelf.json` on main with `{}`, and commit it. A future copy must derive its own unique file.
2. Keep config.cloudSync fixed to the owner/repository/branch/path and read-only in Settings.
3. Open [fine-grained tokens](https://github.com/settings/personal-access-tokens). Name a token for the app, resource owner themadat, **Only select repositories → app-data**, **Contents → Read and write**.
4. Paste the token only in Settings → Data Sync, select whether to remember it, then Test and Save. Never put credentials in chat, source, data files, backups, diagnostics, or logs.
5. Configure each browser separately; use Sync Now and verify a Notes upload/download round trip. Do not mark connection setup complete until the target/file, successful Test, and round trip are verified.

The external data file and token are user-facing setup steps. Configure the target locally and guide verification. Do not mutate app-data on the user’s behalf without an explicit request. Top Shelf’s reset configures the local target; real connection verification is pending.

## Acceptance

- No removed product identifiers or files remain in runtime, docs, tests, or examples; no unintentional file exceeds 20 MB.
- All identity, version, cache, storage, manifests, downloads, and sync surfaces agree.
- All app-artwork variants use the supplied source and every retained interface symbol resolves without product data.
- Notes is blank, Roadmap empty, releases contain only 0.0.1.1, Help/shortcuts are accurate, and the wish ledger starts at WISH-001.
- Syntax-check all JavaScript, run surviving tests, parse manifests, validate referenced paths, and run git diff --check.
- Serve locally and exercise desktop/mobile startup, no console errors/overflow, Notes autosave/reload, every Settings page, appearance, empty states, search, shortcuts/hints, backup/import/recovery, sync states, PWA registration/update/offline, visible focus, and reduced motion.
- Stop preview servers and review status/deletions. Report verified results and any external setup still pending.

Reset never changes branches, history, remotes, GitHub repositories, Pages settings, commits, pushes, or deployment without a separate request. Reset is the sole versioning exception; later completed app changes increment build normally.
