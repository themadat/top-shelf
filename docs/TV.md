# TV Contracts

Current behavior; the original wish plan is historical. Shared storage and cloud rules: [DATA-CONTRACTS.md](DATA-CONTRACTS.md).

## Data and ratings

- `workspace.tvShows`: local IDs plus optional unique TMDB TV IDs; minimal tombstones for deletion. Duplicate provider identities are rejected. Backups/recovery/sync include nested seasons/episodes; disjoint shows merge, differing copies require an explicit choice.
- My Status: Want to Watch, Watching, Caught Up, Completed, Stopped. Independent of conservatively mapped provider activity (Active/Ended/Canceled/Upcoming/Unknown). Conflicting metadata is Unknown; never infer completion or cancellation.
- Show scores: nullable integers 0–5. Season scores: nullable integers 1–10. Episode scores: nullable half-points 1–10. Labels live in `core/tv.js`; zero is a real show score, blank means unrated.
- Episode score >1 sets watched; 1 means Did not Finish and clears watched; clearing a score retains watched. Show score stays manual. Separate season/episode averages include DNF, exclude blanks and season 0. The editor also labels an aggregate including specials.
- Episode/season notes and `seasonRanking` are plain text, capped at 20,000 characters each. Escape in UI, preserve in refresh/backup/sync. Legacy `mode`, air dates and watched flags remain readable although their controls/columns were removed.
- Limits: 2,000 shows; 500 seasons/show; 5,000 episodes/season; 30,000 loaded episodes/show; TV/full imports ≤5 MiB. Render episodes in pages of 50.

## Views and widths

- TV List has a Filters disclosure. TV Pivots has Type/Genres/Networks cards independent of list filters. Count each show once per group; average only rated shows, including zero. Adjusted scores use rated count and the movie formula (baseline 3, weight 5).
- Non-rating list sorts break ties by descending personal rating, unrated last, then title. Table resize transfers width to/from the right neighbor; left columns stay fixed. Last-column resizing changes table width.
- TV preferences are device-local. Pivot widths persist per card/column; searches/minimums/sorts are session-local. Episode widths are shared across seasons: persist Episode and #, let Notes fill the remainder. Resizing Notes adjusts Episode width.
- The editor uses 90% of viewport width/height. Show details start collapsed in either view. Fully rated saved episodes with known counts covered open compactly with seasons expanded. Notes grow to fit text; names/scores center vertically. View changes preserve drafts.

## TMDB and imports

Explicit show/season refresh only; no polling. Preserve personal data and downloaded episodes. Match stable provider IDs before numbers; retain missing provider entries as orphaned for review, including their ratings in averages. Batch refresh takes recovery, processes all linked shows regardless of list filters, skips edited/changed shows, and saves partial progress. Draft saves reject concurrent changes. Do not store raw provider payloads or credentials.

TV → Import Shows accepts `{format: "top-shelf-tv-import", version: 1, shows: [...]}`. Rows require title, nullable show rating and valid personal status; optional fields include notes, TMDB ID, nested seasons/episodes and source seriesStatus Active/Unknown. Preview validates the whole result and allows row selection. Apply rejects stale previews and rolls back failed persistence.

Existing title matches can gain a missing TMDB ID. Detailed imports fill missing seasons/episodes and blank ratings/notes; never replace populated personal values. Match episode IDs/titles before numbers and reject conflicting numbered titles. Skip repeated unchanged details, duplicate identities and prior import tombstones. Since this is additive, it does not create a full-library recovery copy. Source Active uses `providerStatus: "Imported: Active"` until provider refresh. Personal files stay in ignored `import-preparation/`, not runtime assets.

## One-time data behavior

- Dexter/The Wire seed supplied season rankings only when `seasonRanking` is absent; explicitly empty remains empty.
- Sherlock seeds 13 supplied episode scores into missing values once. `sherlockRatingsAdded` protects later edits/clears; season 0 holds The Abominable Bride. Season averages are calculated, not personal season scores.
- The September 29 TV-note reset is independent of September 28: startup recovery first, local completion marker before replacement, TV show notes only. New notes, recovery restores and later imports are not cleared again. Failed persistence keeps the library and removes the marker for retry. Keep this marker stable unless another reset is explicitly requested.

Update all app copies before syncing added fields or half-point episode scores; older clients may reject or discard unsupported data.
