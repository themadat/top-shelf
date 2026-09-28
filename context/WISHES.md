# Wish ledger

This is the durable, developer-facing backlog used by the `wish`, `plan`, `start`, and `cut` workflows. It is not application state and is never included in user backups.

Next id: `WISH-002`

## Active wishes

### WISH-001 — TV Library and Flexible Ratings

- Status: Active — implementation complete and verified; local release prepared
- Priority: User requested
- Effort: Large
- Target: Unscheduled
- Plan: [TV Tab Plan](WISH-001-tv-tab-PLAN.md)
- Released: —
- Affected modules: TV model/UI, TMDB, state/backups/sync, shell navigation, offline assets.

Behavior: List watched TV shows, separate Completed/Stopped viewing state from series activity, and support show-, season- or episode-level ratings. Fetch metadata through TMDB.

Acceptance: Preserve exact rating scales, never overwrite personal data during refresh, retain scores when switching rating mode, support offline editing and safe backup/sync migration.

Confirmed: show ratings are 0–5; season and episode ratings are 1–10. Overall show rating remains manual with separate calculated averages.

## Entry template

```md
### WISH-### — Short title

- Status: Proposed | Planned | Active | Shipped | Parked
- Priority: P0 | P1 | P2 | P3
- Effort: Small | Medium | Large | X-large
- Target: Unscheduled | Patch | Minor | Major | x.y.z
- Plan: — | context/WISH-###-slug-PLAN.md
- Released: — | x.y.z on YYYY-MM-DD
- Affected modules: ...

Behavior:
Describe what a user can do and the expected result.

Rationale:
Explain the problem or opportunity without prescribing unnecessary implementation.

Acceptance criteria:

- Observable outcome one.
- Observable outcome two.

Constraints and assumptions:

- Compatibility, accessibility, offline, privacy, or architecture constraints.

Open questions:

- Only questions that materially affect scope or design.
```

When adding a wish, replace `Next id` with the following unused number. Keep shipped entries for a compact historical index; detailed public release prose belongs in `assets/js/config.js`, not here.
