# WISH-001 — TV Library

## Resume

Status: Implementation complete and verified. Local release 1.0.0.4 is prepared; no commit or push. No implementation work remains. The user can request commit/deployment when ready.

Validation: 109 automated tests plus desktop, dark, 390/320px mobile, offline reload/edit/reload, mocked TMDB lookup/refresh/cancel/concurrent edits, full backup/import/migration and deletion/recovery browser checks. Live authenticated TMDB was not exercised; API tests use representative mocked responses. Preview server stopped after checks.

Implementation notes: show/season scores use labelled buttons; episode scores use compact labelled selects. Episode lists render in pages of 50. Show-level refresh preserves downloaded episode lists; refresh episodes inside each season. Provider entries removed from responses are retained and labelled for review. No background polling or new-episode alerts in this release.

## Decisions and defaults

- Use the existing TV shelf for a compact, searchable show table.
- Separate **My Status** (Watching, Caught Up, Completed, Stopped) from **Series Status** (Active, Ended, Canceled, Upcoming, Unknown). Neither changes the other. Completed is the user's declaration, not inferred from the provider.
- Each show has a preferred **Rate By: Show / Season / Episode**, default Show. This changes which rating controls are prominent; switching never deletes previously entered ratings.
- Use the detailed supplied **0–5** scale for show ratings, including 0 = Terrible, despite the opening “1–5” wording. Blank is unrated, not zero. Use whole-number buttons with labels.
- Confirmed season scale: the same 1–10 scale and labels as episodes.
- Confirmed overall score: manually entered show rating remains independent. Display separate season and episode averages on the 1–10 scale, each with the number rated. Do not blend the two averages or convert them into a show rating.
- Ratings are personal and stored locally/synced through the app; no TMDB account rating writes.

| Show | Meaning | Season / Episode | Meaning |
|---|---|---|---|
| 5 | Legendary | 10 | Best of the Best |
| 4 | Elite | 9 | Phenomenal |
| 3 | Above Average | 8 | Great |
| 2 | Average | 7 | Good |
| 1 | Below Average | 6 | Average |
| 0 | Terrible | 5 | Meh |
| | | 4 | Bad |
| | | 3 | Horrible |
| | | 2 | Wtf did I just watch |
| | | 1 | Did not Finish |

Season/episode 1 is a real saved DNF rating; it does not mark the entire show Stopped. Exclude unrated episodes from averages. Include rated DNF episodes and label coverage clearly. Special episodes (season 0) stay separate and are excluded from the regular-episode aggregate by default.

## Experience

**Toolbar:** viewing-state filters, search, Add Show, Refresh Show Data. Refresh applies to all saved shows with TMDB IDs, independent of the visible filter; show scope and progress explicitly.

**Table:** Rating, Show, My Status, Series Status, Rate By, Seasons, Last Watched, Notes. Title opens a detail modal; rating/status permit quick edits. Last Watched is an optional season/episode position, not a claim that all preceding episodes were watched. Show-only users need not log individual episodes. Defaults: alphabetical; local sort and column widths persist independently from Movies.

**Detail modal:** show metadata and overall rating at top; seasons below. Show mode keeps season/episode details collapsed. Season mode displays 1–10 season scores. Episode mode opens season episode tables with number, title, air date, watched state and 1–10 rating. Saving an episode rating >1 may mark that episode watched; 1 records DNF. Unrated watched episodes are allowed. No episode plots shown by default to reduce spoilers.

Keep personal statuses explicit. Refreshing newly announced episodes may show “new episodes available,” but must not silently change Completed, Caught Up, Stopped, personal ratings or last-watched position.

## Auto-fetch design

Reuse the existing browser TMDB token and authenticated request helper. Rename the credential section to **TMDB Lookup Settings** so both shelves share it. No new account, backend, runtime dependency or LLM calls.

1. Search title or enter TMDB TV ID; explicitly choose among matches. Show original title/year to distinguish remakes.
2. Fetch series details after selection: name, overview, first/last air dates, genres, networks, companies, season summaries, provider status and production flag when supplied.
3. Fetch a season's episode list only when opened for detailed tracking. Avoid one request per episode; the season endpoint supplies episode summaries.
4. Save compact mapped metadata for offline use. Do not store raw responses, cast photos or large unused payloads.
5. Explicit per-show or batch refresh updates provider-owned metadata only. Show “Last checked” and preserve old data on errors. No timer polling in the first release.

Series status is a labelled snapshot, not a guarantee. Map recognized provider status values conservatively (returning/in-production → Active, ended → Ended, canceled → Canceled, planned/pilot → Upcoming); unexpected/missing/conflicting values → Unknown. Preserve the provider's raw status for inspection. Verify actual payloads/status values during implementation. Do not infer cancellation from missing future dates or `in_production:false` alone.

Batch refresh: recovery first, sequential/bounded requests, Stop/abort, 401/429/network feedback, partial successes saved, concurrent edits protected. No-token/offline feedback must leave manual/offline editing usable. Permit manual show entry without a TMDB match; linking later must preserve ratings and require explicit identity confirmation.

## Model and persistence

New `workspace.tvShows`, separate from movies. One active TV record per TMDB TV ID; movie IDs may overlap TV IDs without collision. Manual entries have a local ID and nullable TMDB ID.

Each show holds identity/compact metadata, raw series status/production flag, fetched date, personal viewing status, preferred rating mode, nullable overall rating, notes, optional last-watched position, and sparse season/episode records. Persist stable TMDB season/episode IDs when available plus their numbers. Refresh matches by ID first, handles renumbering without losing scores, and retains missing/removed rated entries for explicit reconciliation. Avoid resetting personal values when a provider field disappears.

Season and episode ratings remain separately addressable; only loaded seasons need full episode metadata. Preserve downloaded metadata offline and don't fetch unopened seasons. Validate nested collection limits and total import size for long-running series.

Add TV to full backups, recovery, cloud content, fingerprints, previews, shelf counts and merge validation. Use show-level conflict detection initially: disjoint shows merge; differing edits within the same show require choosing/reviewing a copy. Never silently choose by timestamp. Deletion tombstones preserve conflict detection.

Bump local schema and cloud format/schema during implementation so older clients reject TV-bearing data rather than silently discard it. Old backups/cloud migrate with an empty TV collection and preserve Movies, Notes, credentials and preferences. UI search, sorting and column widths are local-only; personal ratings and metadata sync. Fetch timestamps should not alone create cloud-content conflicts.

## Implementation sequence / files

1. `assets/js/core/tv.js` + focused tests: normalization, scales, aggregates, identity and refresh merge.
2. `core/state.js`, config limits, portability/sync previews: migration and TV data round trips, rejection by older formats.
3. `core/tmdb.js`: reuse private request path; add TV search/details/season functions without changing movie responses.
4. `assets/js/tv-ui.js`, `tv-editor.js`, `assets/css/tv.css`, index.html: table, editing, season/episode navigation, fetch states.
5. `app.js`: activate TV workspace/shelf counts and search integration. Keep keyboard shortcuts scoped to the active shelf.
6. sw.js and script ordering: cache new assets. Run checks and focused browser validation, then use release.mjs when ready to ship.

Keep UI files focused. Extract a genuinely shared helper only when both Movies and TV need it; do not build a generic media framework first.

## Accessibility and validation

- Visible numeric values and exact rating labels; color supplements text. Clearing a rating is explicit.
- Label controls, preserve keyboard focus, support dialog Escape and touch scrolling. Collapsible seasons work without dragging or hover.
- Desktop and 390/320px layouts; long titles and large episode lists remain usable. No huge all-seasons DOM rendering.
- Tests: 0 vs null; rating bounds; DNF; partial averages; mode switching; independent statuses; specials; duplicate IDs; renumbered/removed episodes; stale/aborted fetches; refresh preserving user edits; migrations; backup/cloud round trips and conflicts.
- Browser checks: add/search/manual entry; each rating mode; completed/stopped/active combinations; season load; refresh failure; offline edit/reload; unrelated movie and Notes behavior.

## Scope boundaries

No streaming predictions, calendars/notifications, background monitoring, rewatches, custom episode ordering, bulk TV import or TV pivots in this first implementation. These can follow after the library and rating workflows work well.

## Confirmed preferences

- Seasons use the episode 1–10 scale and labels.
- Overall show rating is manual and separate; show calculated season/episode averages alongside it.
- No blocking questions remain. Treat the user's explicit 0 = Terrible label as part of the show scale.

## API references

Official TMDB docs checked for planning:
- [TV search](https://developer.themoviedb.org/reference/search-tv)
- [Series details](https://developer.themoviedb.org/reference/tv-series-details)
- [Season details and episode list](https://developer.themoviedb.org/reference/tv-season-details)
- [Episode details](https://developer.themoviedb.org/reference/tv-episode-details)
