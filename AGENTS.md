# Top Shelf

Static, local-first HTML/CSS/JavaScript; no build step, runtime dependencies, backend or sign-in.

## Work

- Start with `git status --short`; preserve unrelated edits. Use `rg` and narrow reads, not whole-file dumps.
- Read only the relevant topic doc. `context/LLM_HANDOFF.md` is an optional index, not startup reading. Reuse instructions already read; avoid repeating history or successful tool output.
- For explicit wish/plan/start/continue/cut/reset requests, follow `docs/WORKFLOWS.md`. Never infer a destructive reset.

## Preserve

- Movies/TV and their pivots, starter shelves, plain-text Notes, Settings Roadmap, offline editing, recovery and optional GitHub Sync. Keep legacy data readable; do not revive removed Records or rich-text/multi-note interfaces without a request.
- Escape user text, validate URLs, label controls, retain visible focus and use the SVG catalog. Preserve mobile usability and local preferences.
- Recovery precedes destructive changes. Reject concurrent changes; never choose sync winners by timestamp. Exclude credentials from source, logs, backups and sync.
- Keep modules focused and runtime dependency-free. Personal imports belong in ignored `import-preparation/`. Deploy through the checked-in GitHub Pages workflow.

## Finish

- Run `node scripts/check.mjs` and focused browser checks; use `docs/TESTING.md` for release coverage. Stop preview servers.
- Batch related edits. Cut releases with `node scripts/release.mjs` (see `--help`); no manual version bookkeeping or documentation-only bumps.
- Document contracts and safeguards, not every cosmetic edit. Keep current behavior in topic docs and history in Git/release-history.js.
- Summarize outcome, verification and limitations briefly. Include one copy-ready final command staging only task files, committing as `Version - Text`, and pushing to `origin main`. Execute commit/push only when explicitly requested.
