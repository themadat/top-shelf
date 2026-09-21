# Agent handoff

Read AGENTS.md, this handoff, and context/WISHES.md before working. Preserve existing/manual edits. Run git status --short at session start. If work is in flight, inspect recent commits, the current diff, and its plan’s Resume block.

Top Shelf is a collection of personal rating lists across movies, TV, books, podcasts, restaurants, scotches, and future domains. Movies and TV are the initial direction. Version 0.0.1.12 implements Movies with Wishlist/Watched state, TMDB lookup, editing, deletion, search, filters, sorting, and real movie counts. Other shelves are starter views. Supplied artwork, numeric navigation (1–8), and remembered ui.selectedShelf remain. The app accents are teal #008080 and coral #ff7f50; old default colors migrate while custom colors survive.

Movie fields: id (local), tmdbId, title, releaseDate, how, other, genres, productionCompanies, directors, actors (top ten), collections, status, availableDate, priority, notes, watchedDate, historicalRating, rating, review. Wishlist extras are optional; Watched requires a rating; review is optional; an empty watchedDate means unknown. Optional historicalRating stores 100!, YES, MEH, NO, or RUN and determines the numeric score 5, 4, 3, 2, or 1. Ratings accept decimals 0–5 with a dark red(0)→green(5) scale; priorities are integers 1–5 with a light green(1)→red(5) scale. Preserve optional prior-state fields when switching. One active movie per TMDB ID; deletion stores {id, deleted:true} after recovery. No inferred timestamp winner for conflicts.

assets/js/core/movies.js owns validation/normalization and TMDB mapping; core/tmdb.js owns credential separation and abortable timed fetches; movies-ui.js owns the list/editor. TMDB metadata is fetched by chosen search result or ID, with credits appended. Tokens are never in config or state. The supplied credential passed live verification but users must configure their own browser using Add movie → Movie lookup settings. The official logo and attribution are included.

Retained shell: app icon/theme and hold-for-Developer controls, name/version/Beta badges, centered search across Notes and support, one blank-on-first-run plain-text Notes modal, vertical Settings, appearance/backup/reset, dedicated Data Sync with JSON preview, generic Help, release history, Roadmap with the spreadsheet backlog, Shortcuts, and Developer diagnostics. Local persistence/recovery, JSON portability, optional GitHub Sync, accessible shared components, PWA updates, and offline assets remain.

Identity and configuration live in assets/js/config.js. Storage uses topShelf.state.v5 with topShelf.state.v4 as a migration source; other keys use topShelf, the cache uses top-shelf-shell, the manifest id is ./top-shelf, full backups use top-shelf-backup, and content sync uses top-shelf-app-data v4/schema v8. Local state schema v5 retains legacy record/document compatibility without exposing their old interfaces. Cloud schema v8 excludes device settings, credentials, timestamps, and empty collections. Only the previous Top Shelf namespace is migrated. v1–v3 cloud envelopes remain readable and compact into v4; old builds reject new cloud data. Update all copies to 0.0.1.4 before syncing movies.

GitHub Sync is enabled and fixed to themadat/app-data/main/data/top-shelf.json. Imports cannot redirect it. The local target is configured; external file existence, a narrowly scoped token, and real Test/Save plus upload/download verification remain pending user setup. Follow the links and checklist in docs/RESET.md; never request a token in chat. Do not write to the separate app-data repository without explicit authorization.

All interface SVGs are self-contained in assets/js/icons.js. The supplied star-and-shelf artwork is assets/icons/top-shelf.svg; light/dark assets share it, with 70% foreground scaling for maskable crops. Preserve every icon/touch/install/splash variant when updating artwork.

## Invariants

- Keep static, dependency-free runtime code and ordinary static hosting.
- Keep a single Notes modal and Settings Roadmap. Do not add Records, multiple notes, rich-text editing, or an app-space Roadmap without an explicit request.
- Preserve accessible native controls, focus restoration, safe URLs, escaped user text, responsive safe areas, and reduced motion.
- Use inline SVG interface symbols; the helper must resolve every retained consumer independently.
- GitHub Pages uses the checked-in Actions workflow only; do not also enable branch deployment.
- Keep origin git@github.com:themadat/top-shelf.git. Machine-specific SSH selection belongs in user Git/SSH configuration, as described in docs/GIT-SETUP.md.
- Versions are major.minor.patch.build. Keep the full version equal across identity, build id, dated release, HTML/manifest queries, service-worker cache/asset version, and deployment workflow name. The next ordinary application update is 0.0.1.23.

## Workflows

### `reset`

Reset only an explicitly requested copied checkout, following docs/RESET.md completely. Confirm identity/icon from the request; inspect path, remote, and cleanliness. Preserve the reusable shell, bake its symbols before removing product data, replace artwork and identity throughout, reset the blank state and documentation, and set 0.0.1.1. Reset alone never changes Git history, remotes, repositories, commits, pushes, or deployment. Keep the user-facing GitHub file/token setup checklist when sync is enabled.

### `wish`

Record an idea in `context/WISHES.md` without planning or implementing it.

- Check for duplicates and use the next `WISH-###` id.
- Capture behavior, rationale, priority, effort, acceptance criteria, constraints, affected files, and material open questions.
- Set the status to `Proposed`.

### `plan`

Investigate a wish without implementing it.

- Create or revise `context/WISH-###-slug-PLAN.md`.
- Put a `## Resume` section first, followed by decisions, scope, non-goals, file map, accessibility/responsive considerations, tests, and open questions.
- Link it from the wish and set the status to `Planned`.
- Do not change runtime files, build ids, or cache ids.

### `start`

Implement an approved plan.

- Read the wish and plan, set the wish to `Active`, and keep the Resume section current.
- Add only the architecture the real feature needs. Do not reintroduce the former Records interface, rich-text editor, or a speculative framework.
- Use `major.minor.patch.build` versions. For every completed application update, increment the fourth `build` component. When the user chooses a new major, minor, or patch value, reset `build` to `1` unless they specify it. Keep `identity.buildId` equal to the full version, add or update the matching dated release entry, update the build queries in `index.html`, update `CACHE_NAME` plus `ASSET_VERSION` in `sw.js`, and update the version in `.github/workflows/deploy-pages.yml`'s workflow `name` together.
- Verify the affected desktop, mobile, accessibility, and offline behavior.

### `cut`

Finalize an active line as a release.

- Confirm the semantic version and update `identity.version`.
- Confirm the major, minor, and patch values, set the fourth build component to `1` unless another value is requested, and use that full version for the build and service-worker cache ids.
- Update the manifests and README when public identity or behavior changed.
- Mark the wish `Shipped`, record its version/date, and archive its plan when useful.
- Run the complete verification baseline below.

Do not silently move from one lifecycle stage to another.

## Repository and verification

See docs/ARCHITECTURE.md for the file map and data contracts, docs/COMPONENTS.md for retained UI, docs/CUSTOMIZATION.md for changes, and docs/TESTING.md for the verification baseline. Syntax-check every runtime script, run dependency-free tests, parse manifests, validate local asset paths and symbols, and run git diff --check. Verify desktop/mobile Notes, Settings, search, appearance, backup/recovery, sync presentation, focus, reduced motion, and offline/update workflows. Stop local servers before the final response.

## End of turn

After file changes, give one concise outcome/verification summary followed by exactly one copy-paste command that stages only task files, commits with the exact subject shape `Version - Text`, and pushes the current branch. Use `git add .` when `git status --short` confirms all changes belong to the task; otherwise name the task files explicitly. Do not run it unless explicitly requested.

Movie reference content: Settings → Info (below Data Sync, using the supplied infoSquare symbol) contains original spreadsheet name/description, personal favorites, rating mapping, and manual links. Roadmap preserves two unimplemented spreadsheet backlog items. What’s New keeps the 2023–2024 spreadsheet history separate from Top Shelf releases.

Movies → Pivots computes eight tables from every non-deleted watched movie, independent of movie-list search/filters. core/pivots.js owns grouping/sorting; pivots-ui.js owns the dashboard. Counts are per distinct membership per movie; historical ratings use mapped scores. Missing values get explicit groups. Years switch release/watched date. Per-table minimum count and sorting are saved in workspace.pivotSettings and synced. Actors use the existing saved top-ten cast.

The top bar includes combined storage/cloud-sync status and an Update button. Update checks for a new worker, saves current data, and force-refreshes; ready updates change its icon to red without an availability pop-up. Settings → Notifications controls What’s New dismissal from 1–300 seconds (default 20), stored in local preferences and full backups, excluded from content sync.

Spreadsheet import preparation: original `Movies - Movies.csv` and `import-preparation/` are personal files ignored by Git. The generated 0.0.1.9 backup contains 739 movies (638 watched, 101 wishlist); one invalid-ID Community row is held separately. It uses the existing full replacement import, with blank Notes/default preferences; do not imply it merges current browser data. Reviews are optional and numeric ratings accept 0–5; update all clients before syncing such data.

0.0.1.10: Movies uses a full-width compact table with sticky column headers/title and a combined sticky toolbar (view, state, shown-count search, equal-width sort, Add Movie). Header/toolbar sizes are observed to adapt sticky positions. Shift–Control–Option–R clicks the top-bar Update control outside dialogs, including from main-page inputs. Interface headings/labels use Title Case; saved movie text is preserved.

0.0.1.11: Pivot order is Ratings, Years, Genres, Other Pivots, Collections, Actors, Directors, Companies. Count/Average buttons select descending initially and reverse direction on repeat clicks, with inline Min. Other Pivots splits Other on commas/newlines, deduplicates case-insensitively, and excludes generated Original availability note lines. Dense tall tables auto-fit across full width. L/P switch Movie List/Pivots outside editors while on Movies; underlined numeric 1–8 shelf shortcuts remain.

0.0.1.12: Movie table columns are #, Title, Review/Notes, How, Date, Release, Other, Collections, Genres, Actors, Directors, Companies. Date displays watchedDate for Watched and availableDate for Wishlist. No State or Actions columns; title opens the full editor. Scores retain accessible Rating/Priority labels but omit those words visually. Wishlist rows are subtly tinted; review is wide and Other/Collections use intrinsic content width.

0.0.1.13: Click score, Review/Notes, How, Date, or Other Pivots cells to edit with Save/Cancel (Escape cancels). Score accepts numeric or historical ratings, or Wishlist priority. Other Pivots has A–Z list sorting. Pivot cards use content widths and stacked icon/arrow controls, Category sorting, header Min, and Years Group By. Ratings/Years default Category descending; Years defaults Watched with ???? for missing years.

0.0.1.14: Narrow Ratings/Years, compact Group/Count/Average controls and first-line counts. Collection stars are stored per movie as starredCollections and included as whole, deduplicated names in Other Pivots, separately from manual Other text. Stars apply to current saved members (new movies must be starred separately). Refresh all clients before syncing starred collections. Period focuses Search Movies or the Ratings Min control; its search hint is always visible. Inline Enter saves (Shift+Enter inserts a newline); Escape cancels. Missing markers sort last A–Z. Shown count sits right of Search Movies.

0.0.1.15: Removed the visible pivot heading, summary cards, and explanatory paragraphs. Pivot tables start directly below the toolbar; the section retains an accessible name and the empty state.

0.0.1.16: Restored the average formatter still required by pivot rows after the summary removal. Populated pivot UI rendering has regression coverage.

0.0.1.17: Pivot Min, sort key, and direction persist in workspace.pivotSettings, full backups, and cloud v4/schema v8. Cloud v1–v3 remain readable; update all clients before syncing. Conflicting settings for the same pivot require choosing a copy; disjoint pivot settings merge. Missing Other/Collection groups are hidden. Headers use # and x̄ with accessible names; Min is centered, totals right-aligned, and the Ratings Min period hint is inline.

0.0.1.18: Other tags beginning with Subgenre (optional colon) classify the remaining text up to the comma as a subgenre. Genres includes those names with an asterisk. Other Pivots sorts within fixed Others/Subgenres/Collections sections; starred collection names classify matching manual tags as Collections. Pivot height follows remaining viewport space, with reduced toolbar gap. Period shortcut/hint is removed from Pivots; Movie List uses an in-field key hint matching global search.

0.0.1.19: Movie sort key/direction persist per All/Wishlist/Watched in local ui.movieSorts and full backups, excluded from cloud content. Defaults are Rating desc, Priority asc, watched date desc. Every column header sorts displayed values and reverses on repeat click; missing values stay last. A/I/W switch movie states outside text editing/dialogs. Cell text selection and editor focus use stronger contrast.

0.0.1.20: Bulk Pivots in the movie toolbar opens a review/apply dialog. Tags are comma/newline separated; targets are exact case-insensitive titles or TMDB IDs, one per line, across saved states. Unmatched/ambiguous/oversize entries block applying. Existing Other text is retained with new unique tags appended on a new line; duplicate targets/tags are skipped. Revalidate current data before atomic mutation and save recovery first. Existing movie persistence and cloud sync carry the additions.

0.0.1.21: Every pivot has a ∑ score column and Score sort using (count × average + weight × baseline) / (count + weight). Defaults baseline 3, weight 5; toolbar controls allow baseline 0–5 and weight 0–1000 (zero uses the raw average). Shared settings live in workspace.pivotSettings.scoring and sync with existing preference conflict handling. Older clients reject these new preference values; update clients before syncing. Scores sort at full precision; display is two decimals.

0.0.1.22: Bulk Pivot preview leads with a focused error summary and Needs Attention section; NOT FOUND/MULTIPLE MATCHES/CANNOT APPLY labels distinguish unresolved rows. Matched rows collapse while issues exist. Apply stays blocked until resolved.
