# Data and Persistence Reference

## Local preferences and data contracts

Identity/build settings live in config.js. Storage key topShelf.state.v5 migrates topShelf.state.v4; local schema 7. Full backups use top-shelf-backup. Content sync uses top-shelf-app-data v6/schema 10 and accepts earlier v1–v5 cloud envelopes. Keep namespace compatibility. TV uses a new envelope version so earlier clients reject TV-bearing data.

Device-local ui fields (full backups, excluded from content sync): tv (sort/direction/widths/filter/query); movieSorts by all/wishlist/watched; movieColumnWidths with separate maps per tab; pivotColumnWidths; pivotLocalSettings; pivotSubsectionSorts. Old flat movie widths migrate to independent copies. Old workspace.pivotSettings is a fallback until locally overridden; scoring baseline/weight remain shared. Reset preferences clears local overrides.

GitHub target is fixed: themadat/app-data/main/data/top-shelf.json. Imports cannot redirect it. Never write that separate repo without explicit authorization. Tokens are browser-only and excluded from config, exports, diagnostics and content sync. Provisioning instructions: docs/RESET.md. Never request tokens in chat. Keep origin git@github.com:themadat/top-shelf.git; machine SSH setup belongs in user configuration.

Sync repairs baselineHash only when baselineTarget and nonempty baselineSha match the freshly fetched remote blob. Different revisions still require normal conflict handling. No timestamp-winner guessing. Recovery precedes destructive replacements/batches; concurrent edits must not be overwritten.

Notes buffers typing 300ms before normalization; flush on blur/close/hidden/page exit, cancel pending drafts on state replacement. Movie/pivot/subgenre views ignore edit-document redraws. Notes fills desktop height minus 2rem and is full-screen on mobile.


## TV

`workspace.tvShows` stores shows independently of movies. Each show has a local id and optional unique TMDB TV id; deleted shows keep a minimal tombstone. Earlier backups migrate to an empty TV collection. Backups/recovery/sync include shows, nested seasons/episodes and personal fields. Merge disjoint shows; differing copies of the same show (including deletion) require an explicit choice. Duplicate TMDB identities are rejected, never silently merged. Check timestamps and UI preferences are excluded from cloud content; last-checked dates are local snapshots, not activity guarantees.

Show ratings are nullable integers 0–5; seasons/episodes use nullable integers 1–10. Zero is a real show score. Season/episode 1 means Did not Finish; it never sets the show's viewing status. Rating an episode 2–10 marks it watched, 1 clears watched; clearing a rating preserves the watched checkbox. Season and episode averages remain separate, include rated DNF, exclude blanks and season 0 (specials), and show rated/saved coverage. Removed provider entries retain personal scores, are labelled as retained, and stay in averages until reconciled. Mode changes never delete ratings.

TMDB series metadata refreshes explicitly; episode lists load per season on demand. Stable provider IDs take precedence over numbers when retaining personal fields. Never save raw provider payloads or credentials. Draft saves reject concurrent show changes. Batch refresh takes recovery first, applies to all linked shows independent of filters, skips concurrently changed/open shows, saves partial progress, and stops on API failure or user cancellation. Show refresh preserves downloaded episode lists; each season has its own refresh button. No background polling.

Limits: 2,000 shows, 500 seasons/show, 5,000 episodes/season and 30,000 loaded episodes/show; TV input and full backup imports are each capped at 5 MiB. Episode rendering is paged in groups of 50. Keep personal statuses separate from conservatively mapped provider status; conflicting/missing status is Unknown.

`seasonRanking` is a separate plain-text, best-to-worst list (20,000 characters), preserved by normalization, backup, sync, and provider refresh. Exact titles Dexter and The Wire receive the supplied starting rankings only when the field is absent; an explicitly empty field stays empty. Update all app copies before syncing this field, since older clients do not preserve it.

The September 2026 one-time TV notes cleanup runs on the existing local library at startup. It requires a successful recovery snapshot before clearing TV notes, and records a separate local-storage completion marker before mutation so recovery or later notes are never automatically cleared again on that browser. Movies and the main Notes pad are untouched. The marker is local, not synced; later imports are not cleared.

### Additive TV imports

TV → Import Shows accepts `{format: "top-shelf-tv-import", version: 1, shows: [...]}`. Each row requires a title, nullable integer rating (0–5), and valid viewing status. Optional fields: notes, numeric TMDB TV ID, and seriesStatus (Active/Unknown for unlinked source data). The preview allows excluding rows. A title match without a TMDB ID may receive the imported ID and activity marker while every personal field and nested rating remains unchanged. Other existing titles/IDs and deterministic import-ID tombstones are skipped. Duplicate input identities are rejected. Import validates the complete result and rejects a stale TV snapshot. Because it only adds shows or missing provider IDs and cannot replace personal fields, it does not duplicate the full library into recovery storage. The mutation is saved synchronously and rolled back in memory if persistence fails. Repeating an import does not duplicate shows.

Imported Active is stored as the explicit `providerStatus: "Imported: Active"` marker, including when a reviewed TMDB ID is supplied. Display it as source-supplied activity with no fabricated fetch date. The first successful TMDB details refresh replaces that marker with fetched series metadata. This uses an already preserved string field, so no schema migration is needed. Other unverified activity stays Unknown. Services from personal source lists may be preserved in Notes; they are not current availability claims. Personal import files belong in the ignored `import-preparation/` directory, never app assets.
