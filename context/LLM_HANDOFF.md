# Top Shelf — Current Handoff

Read this file, AGENTS.md and context/WISHES.md at session start. Search for relevant code before reading whole files. Historical releases remain in assets/js/config.js and Git; do not append per-build history here.

## Product and invariants

Top Shelf 1.0.0.1 is a static, local-first HTML/CSS/JavaScript app with no build step, runtime dependency, backend or sign-in. Movies is implemented; the other seven shelves are starter views. Keep one plain-text Notes modal, Settings Roadmap, local recovery and optional GitHub Sync. Do not restore Records, multi-note editing or rich-text UI without an explicit request. Legacy data remains readable.

Use semantic HTML, labelled controls, escaped text, safe URLs, visible focus and shared SVG symbols. Preserve keyboard shortcuts, mobile safe areas, reduced motion and offline behavior. Interface headings use Title Case. Default accents are teal #008080 and coral #ff7f50; preserve custom preferences.

## File map — read only what the task needs

| Concern | Files |
|---|---|
| Identity, versions, releases, defaults, help | assets/js/config.js |
| Markup and styles | index.html, assets/css/app.css |
| Notes, settings, shell, shortcuts | assets/js/app.js |
| Movie normalization, sorting, colors, aliases | assets/js/core/movies.js |
| Movie table, editor, resizing, batch checks, exports | assets/js/movies-ui.js |
| Pivot calculations and dashboard | assets/js/core/pivots.js, assets/js/pivots-ui.js |
| Subgenre review/import | assets/js/core/subgenres.js, assets/js/subgenres-ui.js |
| TMDB and bundled streaming rules | assets/js/core/tmdb.js, assets/js/core/streaming-rules.js |
| State/schema, persistence, sync, portability | assets/js/core/{state,storage,sync,portability}.js |
| Shared dialogs, icons, PWA | assets/js/core/components.js, assets/js/icons.js, assets/js/core/pwa.js, sw.js |

SVG geometry in icons.js is large: search by symbol name, avoid reading the whole catalog. Tests are dependency-free Node tests. docs/ARCHITECTURE.md, COMPONENTS.md, CUSTOMIZATION.md and TESTING.md provide task-specific detail.

## Movie behavior

One active movie per TMDB ID. Deletion is `{id, deleted:true}` after recovery. Watched requires a rating; reviews and watched dates are optional. Preserve Wishlist fields when switching state.

Fields: id, tmdbId, title, releaseDate, status, how, other, genres, productionCompanies, directors, actors (top ten), collections, starredCollections/Actors/Directors/Companies, subgenreReviewed, incompleteOverride, availableDate, priority, notes, watchedDate, historicalRating, rating, review, optional tmdbAverage.

- Personal rating 0–5 accepts decimals. Legacy 100!/YES/MEH/NO/RUN maps to 5/4/3/2/1. Priority is integer 1–5, with 1 highest.
- Wishlist alone shows sortable Ave beside Priority. TMDB vote_average stays on 0–10; missing/no votes displays neutral. Bands: <4 purple, 4–<5 red, 5–<6 orange, 6–<7 yellow, 7–<8 yellow-green, 8–<9 green, 9–10 dark green. Values below 3 share the bottom band; numeric values are unchanged.
- Inline score, review/notes, How, Date and Other editing: Enter saves, Shift+Enter adds newline, Escape cancels. Priority selects its current text. Title opens full editor.
- Table Date means availableDate for Wishlist, watchedDate for Watched. Native empty editor dates show --/--/----. Priority editor uses toggles.
- Incomplete matches missing releaseDate/genres/actors/directors/companies unless incompleteOverride is set. Search and state filters intersect.
- How aliases/order/colors are in core/movies.js. Preserve personal text, estimate suffixes and unresolved `* ` markers. Sort by highest-priority provider, then text; blanks last. Only Wishlist rows have provider colors, including in All.
- Settings Info offers Movie Names (one title per line), all movie details as analysis JSON, and distinct How values. All ignore filters and exclude deleted records. Clipboard failure selects text for manual copying.

## Pivots

Watched movies only, independent of movie-list filters. Order: Ratings, Years, Genres, Other, Collections, Actors, Directors, Companies. Years defaults to watched year; unknown is ????. Ratings keeps Numeric/Legacy subsections. Other has Others/Subgenres/Collections/Actors/Directors/Companies sections, with independent sorts and a fixed section order. Main Other sort resets subsection overrides.

Per-panel category search is session-only. Counts/averages use all matching movies, not just displayed rows. Minimum filters groups. Score = (count × average + weight × baseline)/(count + weight), defaults baseline 3 and weight 5. Sort using unrounded values. Stars apply to current saved members; new movies are not automatically starred.

Compact accent subsection headers. First-column separators support dragging, arrows, double-click/Enter fitting visible names. Subsections share their panel's width. Numeric columns reserve 30px Count and 40px Average/Score. Panel width = name width + 116px. Panels wrap on narrow screens.

## Local preferences and data contracts

Identity/build settings live in config.js. Storage key topShelf.state.v5 migrates topShelf.state.v4; local schema 6. Full backups use top-shelf-backup. Content sync uses top-shelf-app-data v5/schema 9 and accepts earlier v1–v4 cloud envelopes. Keep namespace compatibility. Optional fields added after schema 9 require all clients to update so older clients do not drop them.

Device-local ui fields (full backups, excluded from content sync): movieSorts by all/wishlist/watched; movieColumnWidths with separate maps per tab; pivotColumnWidths; pivotLocalSettings; pivotSubsectionSorts. Old flat movie widths migrate to independent copies. Old workspace.pivotSettings is a fallback until locally overridden; scoring baseline/weight remain shared. Reset preferences clears local overrides.

GitHub target is fixed: themadat/app-data/main/data/top-shelf.json. Imports cannot redirect it. Never write that separate repo without explicit authorization. Tokens are browser-only and excluded from config, exports, diagnostics and content sync. Provisioning instructions: docs/RESET.md. Never request tokens in chat. Keep origin git@github.com:themadat/top-shelf.git; machine SSH setup belongs in user configuration.

Sync repairs baselineHash only when baselineTarget and nonempty baselineSha match the freshly fetched remote blob. Different revisions still require normal conflict handling. No timestamp-winner guessing. Recovery precedes destructive replacements/batches; concurrent edits must not be overwritten.

Notes buffers typing 300ms before normalization; flush on blur/close/hidden/page exit, cancel pending drafts on state replacement. Movie/pivot/subgenre views ignore edit-document redraws. Notes fills desktop height minus 2rem and is full-screen on mobile.

## TMDB and review workflows

TMDB search requires explicit result selection. Details append credits. Settings → Movie Lookup Settings holds masked token presence, with device/tab retention. Raw details/provider JSON is session-only, escaped, collapsible; US starts open, other countries/rent/buy closed. Abort stale lookups on close/switch. User edits win over asynchronous results.

Update How explicitly checks every Wishlist movie, ignoring list filters. Live US flatrate/free/ads beats generic rules; rental/purchase is excluded. Bundled September 2026 rules: docs/STREAMING-RULES.md. Source-backed titleOverrides (currently empty) support official subscription dates/rights/distributor precedence. Sequential windows and ranges remain distinct; no estimate writes Available Date. US theatrical dates use earliest type3 then type2, never digital. Generic releaseDate only rejects old catalog. Unknown/conflicting/old titles retain existing How with one spaced star; empty stays empty. No repeated automated web research; unresolved titles get manual research links.

Update Ratings fetches all Wishlist scores with recovery, abort, stale-edit guards and partial-save error reporting. It changes only tmdbAverage. Editor lookups also populate it; merely opening a populated editor does not refresh existing How.

Subgenre tags are `Subgenre: Name` in Other. Vocabulary derives from active movies plus built-in Homesian. Existing library is not reopened for Homesian; user classifies it manually. Old pre-review movies migrate reviewed; new movies default pending. Request exports contain pending IDs, metadata and vocabulary, no personal notes. Results use top-shelf-subgenre-results v1. Preview rejects unknown names, bad/duplicate IDs, oversize or changed batches. Apply appends unique tags with recovery; uncertain/omitted remain pending. Already-reviewed movies require reopening before import additions.

## Workflows and releases

User shorthands do not imply the next lifecycle stage:
- wish: record Proposed in WISHES.md, no implementation.
- plan: investigate and write WISH-###-slug-PLAN.md with Resume first; mark Planned, no runtime edits.
- start: implement approved plan, keep Resume current, bump build and verify.
- cut: finalize release, update version surfaces/README, close wish and run full checks.
- reset: destructive copied-app workflow only. Obtain app name and replacement icon first; follow docs/RESET.md, verify target checkout and reset to 0.0.1.1. Never silently reset canonical source or alter Git history/remotes.

Versions are major.minor.patch.build. Explicit major/minor/patch promotions reset build to 1; normal updates increment build. Next ordinary version: 1.0.0.2. Keep identity.version/buildId, dated release entry, index/manifest queries, SW cache/asset version and deploy-pages workflow name identical. Docs-only changes do not bump versions. Preserve all artwork/install variants. GitHub Pages uses Actions, not branch deployment.

Verify proportionally: all JS syntax, node --test tests/*.test.mjs, manifest JSON, asset/symbol references, git diff --check and affected desktop/mobile/offline flows. Stop preview servers. No live GitHub writes or token-based tests unless authorized. Preserve existing edits. End with outcome/checks and exactly one staging/commit/push command, subject `Version - Text`; do not execute without request. Stage only task files, or `git add .` when every change belongs to completed requests.
