# Customize Top Shelf

Start with `assets/js/config.js`: app identity and repository links, assets, theme defaults, limits, feature switches, Help, releases, and Roadmap live there. Movies is implemented; other domains await scoped feature requests. Preserve the movie state/backup/sync contract when extending it.

Keep the runtime static and dependency-free. Extend `mainContent` with semantic, accessible components. Keep Notes and Settings infrastructure intact. Add shared interface symbols to `assets/js/icons.js` and use its helper instead of emoji or font glyphs.

The canonical editable app artwork is `assets/icons/top-shelf.svg`. Regenerate every referenced SVG/PNG, favicon, touch, install, maskable, and splash variant when replacing it. Normal icon sizes are 192 and 512 pixels, touch icons 180 pixels, and splash PNGs 1170 pixels square. Maskable artwork must fit inside the central safe circle; current foreground is scaled to 70%.

Batch related edits and use `node scripts/release.mjs` when ready to ship. It updates all version surfaces and preserves release history. See [WORKFLOWS.md](WORKFLOWS.md); documentation/tooling-only edits do not require a release.

Use distinct app-specific storage and sync identifiers when making a future copy; follow `docs/RESET.md`. Do not change remotes, publish, or commit without an explicit request. Keep the `reset`, `wish`, `plan`, `start`, and `cut` lifecycle boundaries in `docs/WORKFLOWS.md`.
