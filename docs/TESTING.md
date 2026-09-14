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
