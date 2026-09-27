# Top Shelf

Static, local-first HTML/CSS/JavaScript. No build step, runtime dependencies, backend or sign-in.

## Work efficiently

- Start with `git status --short`; preserve existing edits. Search with `rg`, then read narrow relevant ranges. Do not dump SVG paths or entire large files.
- Read topic docs only as needed; `context/LLM_HANDOFF.md` is the file/reference index. Do not routinely read the handoff, wish ledger, release history, reset guide or unrelated contracts.
- Reuse instructions already read in this task. Keep tool output to failures and concise summaries. Use a fresh task for unrelated work; keep follow-up fixes together.
- For an explicit wish/plan/start/continue/cut/reset request, read `docs/WORKFLOWS.md`. Never infer a destructive reset.

## Preserve

- Movies and pivots, starter shelves, one plain-text Notes modal, Settings Roadmap, local recovery and optional GitHub Sync. Legacy data remains readable. Do not restore removed Records or multi-note/rich-text interfaces without a request.
- Escape user text; use safe URLs, labelled controls, visible focus and the shared SVG catalog. Preserve mobile/offline usability and custom preferences.
- Never expose credentials or include them in backups/sync. Recovery precedes destructive changes. Do not overwrite concurrent edits or pick conflict winners by timestamp.
- Keep the app static and runtime dependency-free. Prefer focused modules over minified code or broad rewrites. GitHub Pages uses the checked-in Actions workflow.

## Finish

- Run `node scripts/check.mjs`; add focused browser checks for affected behavior. Full desktop/mobile/offline checks belong to releases or relevant infrastructure changes. Stop preview servers.
- Batch small changes into releases. Use `node scripts/release.mjs` when ready to ship; see `--help`. No manual multi-file version bookkeeping or next-version text in docs. Documentation/tooling-only edits do not require a version bump.
- Update docs only for contracts, safeguards or non-obvious behavior—not every cosmetic change.
- Summarize the result, verification and real limitations briefly. Commit/push only if explicitly requested. A copy-ready commit command is optional; if supplied, stage only task files and use `Version - Text`.
