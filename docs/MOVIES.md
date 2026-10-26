# Movies Reference

Read only for movie, streaming or subgenre changes.

## Movie behavior

One active movie per TMDB ID. Deletion is `{id, deleted:true}` after recovery. Watched requires a rating; reviews and watched dates are optional. Preserve Wishlist fields when switching state.

Fields: id, tmdbId, title, releaseDate, status, how, other, genres, productionCompanies, directors, actors (top ten), collections, starredCollections/Actors/Directors/Companies, subgenreReviewed, incompleteOverride, availableDate, priority, notes, watchedDate, historicalRating, rating, review, optional tmdbAverage.

- Personal rating 0–5 accepts decimals. Legacy 100!/YES/MEH/NO/RUN maps to 5/4/3/2/1. Priority is integer 1–5, with 1 highest.
- Wishlist alone shows sortable Ave beside Priority. TMDB vote_average stays on 0–10; missing/no votes displays neutral. Bands: <4 purple, 4–<5 red, 5–<6 orange, 6–<7 yellow, 7–<8 yellow-green, 8–<9 green, 9–10 dark green. Values below 3 share the bottom band; numeric values are unchanged.
- Inline score, review/notes, How, Date and Other editing: Enter saves, Shift+Enter adds newline, Escape cancels. Priority selects its current text. Title opens full editor.
- The shipped movie editor scripts and page controls must be released together. Static checks reject missing literal editor control IDs; browser regression opens saved and newly added movies through actual list-title clicks, edits them, reloads, and reopens them.
- Table Date means availableDate for Wishlist, watchedDate for Watched. Native empty editor dates show --/--/----. Priority editor uses toggles.
- Incomplete matches missing releaseDate/genres/actors/directors/companies unless incompleteOverride is set. Search and state filters intersect.
- How aliases/order/colors are in core/movies.js. Preserve personal text, estimate suffixes and unresolved `* ` markers. Sort by highest-priority provider, then text; blanks last. Only Wishlist rows have provider colors, including in All.
- Settings Info offers Movie Names (one title per line), all movie details as analysis JSON, and distinct How values. All ignore filters and exclude deleted records. Clipboard failure selects text for manual copying.


## TMDB and review workflows

TMDB search requires explicit result selection. Details append credits. Settings → Data Sync → TMDB Lookup Settings holds masked token presence, with device/tab retention. Raw details/provider JSON is session-only, escaped, collapsible; US starts open, other countries/rent/buy closed. Abort stale lookups on close/switch. User edits win over asynchronous results.

The movie editor shows linked TMDB genres immediately above Subgenres without opening Details, immediately after linking/refreshing and when reopening a saved movie. The review checkbox shares the genre text row. Unlinked drafts show a link prompt; linked movies without genres show an explicit empty value. State and Exclude from Incomplete share the title/ID lookup row, wrapping on narrow screens. These provider genres remain separate from personal subgenres.

Update How explicitly checks every Wishlist movie, ignoring list filters. Live US flatrate/free/ads beats generic rules; rental/purchase is excluded. Bundled September 2026 rules: docs/STREAMING-RULES.md. Source-backed titleOverrides (currently empty) support official subscription dates/rights/distributor precedence. Sequential windows and ranges remain distinct; no estimate writes Available Date. US theatrical dates use earliest type3 then type2, never digital. Generic releaseDate only rejects old catalog. Unknown/conflicting/old titles retain existing How with one spaced star; empty stays empty. No repeated automated web research; unresolved titles get manual research links.

Update Ratings fetches all Wishlist scores with recovery, abort, stale-edit guards and partial-save error reporting. It changes only tmdbAverage. Editor lookups also populate it; merely opening a populated editor does not refresh existing How.

Movie normalization standardizes subgenre tags to `Subgenre: Name`, normalizes name casing, repeated whitespace and dash spacing, corrects Homesian to Holmesian, and deduplicates subgenres without changing review status or unrelated Other text. A full legacy Other field whose expanded prefixes would exceed 4,000 characters retains its text; vocabulary and pivots still normalize the displayed names. Personal ratings, legacy labels, tmdbAverage, and How are included in content sync and its change fingerprint.

Movie and Bulk Pivots editors offer a shared checkbox picker from active movies plus built-in Holmesian, with selection-only controls; neither editor offers new-subgenre entry. Movie edits separate ordinary Other Pivots from selected subgenres, then compose the existing `other` field on save; no schema change. Subgenres remain `Subgenre: Name` tags for old clients, backups and sync. Combined Other text and selections must fit 4,000 characters. A checkbox removes a subgenre from a movie without changing review status. Bulk selections append after the existing preview/recovery/stale checks; ordinary pivots stay intact. Legacy inline/bulk typed prefixes still work and normalize through the same model. Vocabulary derives from active movies plus built-in Holmesian. Existing library is not reopened for Holmesian; user classifies it manually. Old pre-review movies migrate reviewed; new movies default pending. Request exports contain pending IDs, metadata and vocabulary, no personal notes. Results use top-shelf-subgenre-results v1. Preview normalizes known names but rejects unknown names, bad/duplicate IDs, oversize or changed batches. Apply appends unique tags with recovery; uncertain/omitted remain pending. Already-reviewed movies require reopening before import additions.
