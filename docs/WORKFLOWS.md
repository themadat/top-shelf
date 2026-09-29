# Optional Workflows

Read only for an explicitly named workflow; do not advance stages implicitly. Default safeguards and verification are in [AGENTS.md](../AGENTS.md).

| Request | Action |
|---|---|
| wish | Read `context/WISHES.md`; assign the next ID, scope and acceptance criteria. Mark Proposed; no implementation. |
| plan | Investigate the wish; write a plan with Resume first, decisions, file map, verification and open questions. Mark Planned. |
| start | Implement the approved plan and maintain its Resume. |
| continue | Inspect status/diff and the active plan; finish the next incomplete step. |
| cut | Finalize the release, close completed wishes, refresh stale references and verify release coverage. |
| reset | Obtain app name/icon, follow `docs/RESET.md`, and verify this is a copied app—not the canonical checkout. Never silently change Git history/remotes. |

## Release command

```sh
node scripts/release.mjs --title "Release title" --summary "User-facing result"
```

Add `--version 2.0.0` for a named promotion or `--dry-run` to preview. Versions use `major.minor.patch.build`; a promotion starts at build 1, otherwise only build increments. The script updates all version surfaces and release history, never commits or pushes.

Current version: `assets/js/config.js`. Historical release entries: `assets/js/release-history.js`. Do not duplicate next-version fields in docs. See [TESTING.md](TESTING.md) for release checks.
