# Optional Repository Workflows

Read only when a named workflow is requested. Do not advance stages implicitly.

- **wish**: read context/WISHES.md, use the next ID, capture scope and acceptance criteria, mark Proposed. No implementation.
- **plan**: investigate a wish, write context/WISH-###-slug-PLAN.md with Resume first, decisions, scope, file map, accessibility, tests and open questions. Mark Planned; no runtime edits.
- **start**: implement the approved plan; maintain Resume and verify the affected behavior.
- **continue**: inspect status, diff, recent commits and any active plan's Resume; finish the next incomplete step. No new tracking system.
- **cut**: finalize the current release, close the wish, update version surfaces and run release checks.
- **reset**: destructive copied-app workflow only. Obtain app name and replacement icon first. Follow docs/RESET.md and verify the checkout is not the canonical source. Reset to 0.0.1.1; never silently alter Git history or remotes.

## Releases

Versions use major.minor.patch.build. A named major/minor/patch release resets build to 1; otherwise increment build. Batch small changes until the user requests release/deployment/commit or the task is ready to ship. Do not bump solely for documentation or tooling.

Run `node scripts/release.mjs --title "Short title" --summary "User-facing result"` to increment build, or add `--version 1.1.0` for an explicit promotion. It updates all version surfaces and adds a release entry; it never commits or pushes. Release history is in assets/js/release-history.js; current release is in config.js. Do not maintain a second next-version field in docs.

Run `node scripts/check.mjs`. For releases or changes to the shell, storage, service worker or responsive layout, also verify relevant desktop/mobile/offline paths. Ordinary edits need only focused browser checks. Stop preview servers.

Commit/push only on explicit request. Preserve unrelated edits and stage only task files. When a commit command is useful, use subject `Version - Text`; it is not mandatory after every response.
