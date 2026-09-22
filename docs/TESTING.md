# Verification

Run from the repository root with Node and Python available:

```sh
for file in assets/js/*.js assets/js/core/*.js sw.js; do node --check "$file" || exit 1; done
node --test tests/*.test.mjs
node -e "const fs=require('fs'); for (const f of ['manifest.webmanifest','manifest-dark.webmanifest']) JSON.parse(fs.readFileSync(f,'utf8'));"
git diff --check
python3 -m http.server 8000
```

Open localhost:8000 at desktop and mobile sizes. Check startup without console errors, Movies plus the other starter views, centered search, Notes autosave/reload, keyboard search selection, every Settings tab, Help no-match recovery, the movie backlog in Roadmap, release history, appearance controls, hints/shortcuts, Developer Mode, and all interface SVGs. Check focus visibility, dialog focus restoration, touch reachability, reduced motion, and no horizontal overflow.

Export/import a JSON backup, verify recovery before replacement, and confirm credentials are absent from exported data and diagnostics. Exercise offline Notes and reload after the service worker takes control. Check update notices, Force Refresh, fresh online reloads, and cache isolation. Stop the local preview server afterward.

`tests/sync.test.mjs` exercises centralized states, authentication/permission/network failures, fixed targets, compact content, device preference preservation, recovery, conflict decisions, and mocked upload/download behavior. `tests/sync-preview.html` is a development-only sync state gallery. `tests/foundation.test.mjs` checks reset identity, assets, symbols, and state boundaries. Automated sync tests never contact GitHub.

Real GitHub verification remains a separate setup step: create the fixed data file and use an app-data-only token with Contents Read and write in Settings → Data Sync; Test/Save and verify a Notes round trip on a second browser. Never include credentials in test fixtures or source.

## Movies regression checks

The dependency-free tests cover optional/required state fields, whole-number priority, decimal ratings, invalid dates, duplicate IDs, TMDB directors/cast/collection mapping, color scale endpoints, backup/cloud round trips, migration, and deletion conflicts. Browser verification covers live title search and ID lookup, add in both states, Mark watched, escaped text, filters/sort/counts, import preview, recovery, and offline editing/reload. Test at desktop, tablet, and 390/320px phone widths.

Check empty/ambiguous/error responses, 401/429, abort on close or query changes, no stale result application, and hidden credentials in exports. Verify existing notes/settings survive v4 migration. Refresh both devices before testing the movie-capable sync envelope. Do not put a live token in test fixtures, screenshots, or logs.

Historical movie checks: save each of 100!, YES, MEH, NO, RUN with an unknown watch date; verify mapped score, label, backup/sync round trip, and offline reload. Switch to a numeric rating and later supply a known date. Check movie preferences, reference links, and the separate spreadsheet history in Settings.

Pivot checks: validate watched-only scope despite list filters; multi-value membership counts, decimal/historical averages, missing metadata and dates, release/watched years, sorting and thresholds. Verify empty and populated views, live updates after movie changes, safe names containing HTML, 320/390px layouts, and offline reload.

0.0.1.9: verify watched movies save with blank reviews and numeric ratings 0, 0.5, and 5; reject out-of-range ratings and missing watched ratings. Backup/sync must preserve zero scores and blank reviews. Bulk import verification uses the ignored personal preparation files and an isolated browser profile.

0.0.1.10: verify the full-width table with 739 rows, equal search/sort widths at 320–1800px, sticky toolbar/header/title column, title-to-editor action, filters/sort, Pivots switching, and Shift–Control–Option–R from the main view and its search input. Plain R and the update chord inside an open dialog must not refresh.

0.0.1.11: verify eight pivot groups in the specified order, Count/Average descending on selection and reverse on repeat click, directional icons and aria-sort, inline Min with no wrapping at 320px, dense rows/multiple desktop columns, case-insensitive Other tag deduplication, and L/P view shortcuts suppressed in editors.

0.0.1.12: verify the exact score-first column order, no visible Rating/Priority words or State column, subtle Wishlist tint in light/dark themes, status-dependent Date mapping, wider Review/Notes, content-fit Other/Collections, and reduced row height. Title still opens the editor.

0.0.1.25: Verify old movies migrate as reviewed, new movies queue in either state, and editor checkbox can reopen review. Export request must contain vocabulary, IDs, movie metadata, and LLM instructions without private review/notes. Import malformed/duplicate/mismatched/unknown-tag results must block all updates. Preview valid additions, reviewed with no matches, uncertain and omitted movies; apply must save recovery, retain existing Other text and unrelated fields, and persist through reload/offline/backups/sync. Repeated imports must not duplicate tags; changes between preview/apply must require a refreshed preview. Check 320/390px dialog and download.

0.0.1.26: Check compact Movie Lookup Settings directly below Appearance; saved local/session tokens show dots, unchanged Save preserves the credential, replacement and Forget update it. Open TMDB Details for a saved movie to fetch/display full details+credits and all watch-provider regions using Authorization headers. Confirm unused properties and literal HTML appear as text, no API links remain, Reload Returned Data leaves saved fields untouched, and closing/switching aborts stale responses. Verify offline/no-token errors, desktop/mobile scrolling, and that raw responses never enter movie state or backups.

0.0.1.27: Verify the editor has no Lookup Settings button; review status and supported subgenres appear beside State, wrapping on phones. Priority buttons select/save 1–5 and repeat-click clears. Blank native dates show --/--/---- when unfocused and retain calendar/keyboard entry. Notifications follows Appearance. JSON objects/arrays expand with keyboard/click; Watch Providers starts US expanded, other countries and rent/buy collapsed. Check escaped API text and 320/390px layouts.

0.0.1.28: Mock Wishlist provider responses for available, unavailable, and API-error movies, with nonempty How and list search active. Check all Wishlist rows, exclude watched/deleted, verify recovery before writes, labeled static fallback, no inferred dates, preservation of concurrent edits, stop/partial failure counts, repeat refresh, persistence/offline display and rule source links at phone widths. Entering Wishlist must not auto-overwrite How.

0.0.1.29: Verify unknown Wishlist checks preserve existing How with one * across repeated checks, and a later provider result replaces it. Incomplete matches any missing release date, genres, actors, directors, or companies and intersects state/search. How Values lists all distinct nonempty saved values regardless of filters and copies safely. Update Wishlist How appears in the top toolbar; progress and Stop remain visible when launched from All or Watched. Check wrapping at phone widths.
