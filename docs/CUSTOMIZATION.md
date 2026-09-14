# Customize Top Shelf

Start with `assets/js/config.js`: app identity and repository links, assets, theme defaults, limits, feature switches, Help, releases, and Roadmap live there. Movies is implemented; other domains await scoped feature requests. Preserve the movie state/backup/sync contract when extending it.

Keep the runtime static and dependency-free. Extend `mainContent` with semantic, accessible components. Keep Notes and Settings infrastructure intact. Add shared interface symbols to `assets/js/icons.js` and use its helper instead of emoji or font glyphs.

The canonical editable app artwork is `assets/icons/top-shelf.svg`. Regenerate every referenced SVG/PNG, favicon, touch, install, maskable, and splash variant when replacing it. Normal icon sizes are 192 and 512 pixels, touch icons 180 pixels, and splash PNGs 1170 pixels square. Maskable artwork must fit inside the central safe circle; current foreground is scaled to 70%.

Every completed app update advances the fourth component of `major.minor.patch.build`. An explicit major/minor/patch change resets build to 1. Keep identity.version, identity.buildId, dated releases, HTML/manifest asset queries, service-worker cache and asset versions, and the deployment workflow name synchronized. The next ordinary update is 0.0.1.4. Wish/plan/instruction-only edits do not bump the app.

Use distinct app-specific storage and sync identifiers when making a future copy; follow `docs/RESET.md`. Do not change remotes, publish, or commit without an explicit request. Keep the `reset`, `wish`, `plan`, `start`, and `cut` lifecycle boundaries in `context/LLM_HANDOFF.md`.
