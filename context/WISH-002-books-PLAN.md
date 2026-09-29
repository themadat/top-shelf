# WISH-002 — Books Library, Wishlist and Pivots

## Resume

- Status: **Active — implemented and verified; awaiting a release cut**. No implementation steps remain.
- Next action only if requested: cut a release using `scripts/release.mjs` and run release coverage. Commit/push remain separate actions.
- Books now has manual/Open Library entry, all requested personal fields, prioritized wishlist, and author/genre/year-read pivots. Current contracts: [BOOKS.md](../docs/BOOKS.md) and [DATA-CONTRACTS.md](../docs/DATA-CONTRACTS.md).
- Local schema is 8; cloud envelope is v7/schema 11. TV-bearing v6 and all previously supported formats remain readable; older clients reject new payloads.
- Verification: 129 automated tests; isolated desktop/390/320px light/dark; live Open Library title/author/ISBN/rating/refresh; draft/concurrency/failed-write protection; offline save/reload; delete recovery; legacy/backup/cloud-model round trips. Authenticated GitHub and live multi-device sync were not exercised.
- No app-version bump, release cut, commit, push or cloud-data write has been performed.

## Outcome and decisions

Turn Books into a local-first personal library with All Books, Read, Wishlist, and Pivots views. Add books manually or by optional catalog search. Saved entries and personal writing remain usable offline. Use the existing visual language, SVG catalog, keyboard behavior and mobile patterns.

| Field | Proposed behavior |
| --- | --- |
| Book name | Required, editable title. Optional subtitle and cover from lookup. |
| Author | Multiple authors supported; display names editable; retain provider author IDs when known. |
| Year read | Optional four-digit completion year, independent of publication year. Unknown stays blank. Initially one completion year per book. |
| My rating | Optional 0–5, half-point increments; zero is a valid score and blank means unrated. |
| Database average | Read-only provider score out of 5, rating count, source link and fetch date when available. Never substitute this for My rating. Missing data shows “Not available.” |
| Ownership | Owned / Not owned / Unknown, independent of reading status and format. |
| Format | Multiple selections: Print, Ebook, Audiobook. These describe the user's copy/reading formats, not catalog availability. |
| Audible | Separate “Listened via Audible” indication; selecting it also selects Audiobook. Other audiobooks are supported. No Audible account integration. |
| Fiction/nonfiction | Fiction / Nonfiction / Unknown; explicit user correction always allowed. |
| Genres | Multiple editable genres; offer curated suggestions from catalog subjects, not every subject/place/person as a genre. |
| Short review | Optional plain-text short review, shown as a compact list excerpt. |
| Longer notes | Separate multiline plain-text field in the book editor; preserve line breaks. Does not replace the app's Notes page. |
| Reading status | Want to Read / Reading / Read / Stopped. The Read view contains completed books; Wishlist contains Want to Read. All Books includes every nondeleted entry. |
| Wishlist priority | Optional 1–5, with 1 highest, matching Movies. Order priority ascending, blanks last, then title. Retain value when moving out of Wishlist. |

List columns expose title/authors, year read, personal rating, provider rating, ownership, format/Audible, fiction/nonfiction, genres and review; wishlist emphasizes priority. Longer notes open in the editor. Search title/authors/genres/review/notes, and filter by status, ownership, format and fiction/nonfiction. Keep sorting, widths, filters and current view device-local. On small screens, keep primary content and editor controls usable without page overflow.

“Mark read” opens the editor for optional year, rating and review; do not invent a completion year for historical books. Title is sufficient for manual entry. Reading status, ownership and formats must not silently imply one another except the explicit Audible-to-Audiobook relation.

## Catalog recommendation and research

Research checked 2026-09-29:

- **Recommend Open Library for optional, user-triggered lookup.** Its [Search API](https://openlibrary.org/dev/docs/api/search) supports title/author/ISBN queries, work and edition identity, authors and publication metadata. Pick a result explicitly; retain work ID, optional selected edition ID/ISBN and source URL. A work groups editions, so do not treat each ISBN as a different personal book by default.
- Its [API guidelines](https://openlibrary.org/developers/api) favor low-volume human discovery and response caching. Use explicit search, selected-book details and per-book refresh; throttle unidentified requests to at most one per second, handle 429/backoff, cancel stale requests and avoid automatic whole-library refresh. Browser code cannot rely on setting a custom User-Agent; do not assume the higher identified-client quota. Saved lookup snapshots support offline use.
- Open Library has community work ratings, documented in its [data model](https://docs.openlibrary.org/developers/backend/understanding-the-data-model.html). Treat their availability as optional. Implemented endpoint: `/works/{workId}/ratings.json`. Direct browser access and the average/count response were verified during implementation; coverage remains optional.
- Open Library is an openly usable catalog; its [licensing statement](https://openlibrary.org/developers/licensing) does not assert new proprietary rights, while noting possible existing rights in contributions. Do not describe every cover or description as public domain. Keep source attribution and avoid bulk ingestion.
- **Google Books is a possible later fallback.** Its [volume reference](https://developers.google.com/books/docs/v1/reference/volumes) defines title, authors, categories, averageRating and ratingsCount. Those fields are not a completeness guarantee. It is a separate API offering, not our chosen open catalog. Defer it to avoid adding provider/key/quota complexity to the first version; re-evaluate terms and browser access if needed.

Catalog subjects require conservative genre suggestions. Suggest Fiction or Nonfiction only for clear classifications; otherwise keep Unknown. Database ebook availability must never set personal Ebook or Owned fields. Matching never infers that a book has been read, rated, owned, or heard via Audible.

## Persistence and lookup contract

- Add `workspace.books` with stable local IDs, normalized fields, catalog fetch dates and deletion semantics consistent with current domain models. Keep provider identity separate from local identity. Warn for an existing work ID or selected ISBN; allow reviewed manual resolution, never title-only automatic merging.
- Separate personal fields from the catalog snapshot and track user overrides for editable bibliographic fields. Refresh updates source data and provider ratings; it preserves overrides, reading status/year, ownership/formats, priority, rating, review and notes. Show proposed changes before replacing user-edited metadata.
- Store provider average/count/source/fetched-at only after validating numeric ranges and identity. Missing ratings and failed refreshes preserve the last successful snapshot, with its fetch date; never convert missing ratings to zero or erase personal data. Covers can fall back to a placeholder offline.
- Extend defaults, migration, normalization, full backups, content export/import, hashing, merge, conflict previews, counts, deletion/recovery and erase flows together. Legacy local/backup/cloud data without Books yields an empty library without changing existing content.
- Advance the local schema and sync envelope/schema coherently during implementation. Older clients must reject Books-bearing payloads instead of silently dropping books. Continue accepting all currently supported older cloud envelopes, including TV-bearing v6 data; do not accidentally tie TV acceptance only to the new current version.
- Include book content in sync, but exclude device-local book preferences and transient lookup caches. Persist selected metadata needed offline. No credentials in data/exports/logs.
- Use existing recovery-before-replacement and revision/concurrency checks. Reject saves or metadata responses against an intervening edit/replacement; no timestamp-selected conflict winners. Failed persistence retains both live and saved data and cannot report success.
- Escape personal/provider text, validate external HTTPS URLs and provider IDs, enforce sensible input limits without silently truncating notes, and retain labeled controls/visible focus.

## Pivots

Three local pivot tables: **Authors**, **Genres**, **Year Read**. Default scope is nondeleted Read books, independent of list filters; label this scope. Wishlist/Reading/Stopped entries do not inflate completed-book counts.

- Show book count, rated-book count and average **personal** rating. Blank ratings are excluded from the average; zero is included. An unrated group has no average, not zero.
- Each book counts once per distinct author and genre; multi-author/multi-genre books appear in every applicable group. Overall totals count unique books, not summed group rows.
- Year is completion year, never publication year. Include Unknown year/author/genre groups.
- Normalize whitespace/case for grouping; use provider author identity when available without merging distinct same-name authors. Deduplicate repeated author/genre entries within a book.
- Support group search, minimum book count, category/count/average sorting and clicking a group to inspect its matching books. Preserve pivot preferences locally.

## File map and implementation sequence

1. **Provider feasibility:** browser test title/author/ISBN lookup, selected details and rating response; confirm CORS, null data and throttle behavior. Capture small public fixtures. If ratings are unavailable, retain optional fields/UI fallback and record the limitation; do not add a backend.
2. **Domain/persistence:** new `assets/js/core/books.js`; extend `assets/js/core/state.js`, `storage.js`, `sync.js` and `portability.js` where their current hooks require. Cover Books migration and round trips before UI work.
3. **Lookup:** new `assets/js/core/open-library.js` for bounded requests, response validation, identity matching, metadata mapping and refresh preservation. No runtime dependencies.
4. **Views/editor:** new `assets/js/books-ui.js`, `books-editor.js`, `books-pivots-ui.js` and `assets/css/books.css`; integrate shelf visibility/focus/shortcuts in `assets/js/app.js`, markup/script order in `index.html`, limits/help in `assets/js/config.js`, and catalog icons only as needed in `assets/js/icons.js`.
5. **Offline and regression:** include new local assets in `sw.js`; cover serialization/migration/sync in existing test suites and add focused Books/provider/pivot suites under `tests/`. Reuse current persistence safeguards instead of creating a second storage path.
6. **Contracts and handoff:** add `docs/BOOKS.md` when behavior is implemented; update `docs/DATA-CONTRACTS.md` and focused Books coverage in `docs/TESTING.md`. Maintain this Resume during start/continue work. Use the release script only when a release is requested; no planning-only bump.

## Acceptance and verification

- Create a manual book with every requested field; save, reload, edit offline, reload again and retain exact review/notes text.
- Lookup a title, author and ISBN; select the intended work/edition; handle duplicate candidates, missing authors/genres/ratings/covers, malformed responses, aborts, offline, timeouts and 429 without losing the draft.
- Refresh linked metadata while personal fields and overridden bibliographic fields remain intact; reject a late response after edits, another search, deletion or state replacement.
- Wishlist priority 1 appears first, 5 later, blank last. Moving a wishlist entry to Read retains its identity, notes and ownership and asks for optional reading details.
- Distinguish an owned unread ebook, a borrowed print book, an Audible listen, another-source audiobook and combined formats. Blank year/rating/ownership stay unknown rather than receiving guessed values.
- Verify author/genre/year pivots against a small fixture containing coauthors, duplicate tags, multiple genres, unknown fields, zero and missing ratings, wishlist items and deleted items. Counts and personal averages follow the stated scope.
- Full backup round trip, legacy migration, Books content sync round trip/merge/deletion and unsupported future/older-client envelope rejection. Preserve Movies/TV/Notes/Roadmap and preferences. Mock GitHub; no writes to the cloud data repository.
- Test failed writes, storage pressure, recovery restore, concurrent edits and stale sync previews with Books present. No success on failed persistence.
- Run `node scripts/check.mjs`; focused browser checks at desktop/390/320px, light/dark, keyboard, readable controls, editor text, filters/pivots and service-worker-controlled offline edit/reload. Stop preview servers. Use the release matrix only for a release cut.

## Accepted implementation defaults and limits

- **Rating scale:** 0–5 with half points, aligned with existing shelves; change if the user prefers another scale.
- **Rereads:** one year read per book for the initial update. Multiple completion events and per-reading ratings/formats would require a reading-history model; decide before implementation if needed.
- **Audible wording:** support Audiobook generally plus an explicit Audible indication, treating the request as including Amazon Audible without requiring it for all audio.
- **Owned formats:** one book-level ownership choice plus multiple formats initially; per-format ownership is a later extension unless requested.
- **External average:** best effort from Open Library. Live access verified; do not block manual Books features on sparse/missing provider ratings.

## Verification result

`node scripts/check.mjs` passed with 129 tests plus syntax, versions, manifests, assets, offline coverage, symbols and diff checks, using the bundled Node runtime. Focused browser checks covered all personal fields, wishlist ordering, author/genre/year pivots, search/filtering, dirty-draft cancellation, plain-text escaping, duplicate catalog matches, atomic failed saves, stale saved records and late metadata responses, corrected bibliographic fields, same-name author IDs, resize persistence, mobile layouts, offline edit/reload, recovery-before-delete and Movies/TV navigation. Public Open Library title, author, ISBN, ratings and refresh requests worked directly in the browser. Live authenticated GitHub/multi-device checks remain a deployment verification task.
