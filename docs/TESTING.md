# Verification

Run from the repository root with Node and Python available:

```sh
for file in assets/js/*.js assets/js/core/*.js sw.js; do node --check "$file" || exit 1; done
node --test tests/*.test.mjs
node -e "const fs=require('fs'); for (const f of ['manifest.webmanifest','manifest-dark.webmanifest']) JSON.parse(fs.readFileSync(f,'utf8'));"
git diff --check
python3 -m http.server 8000
```

Open localhost:8000 at desktop and mobile sizes. Check startup without console errors, a blank main workspace, centered search, Notes autosave/reload, keyboard search selection, every Settings tab, Help no-match recovery, the empty Roadmap, the single initial release, appearance controls, hints/shortcuts, Developer Mode, and all interface SVGs. Check focus visibility, dialog focus restoration, touch reachability, reduced motion, and no horizontal overflow.

Export/import a JSON backup, verify recovery before replacement, and confirm credentials are absent from exported data and diagnostics. Exercise offline Notes and reload after the service worker takes control. Check update notices, Force Refresh, fresh online reloads, and cache isolation. Stop the local preview server afterward.

`tests/sync.test.mjs` exercises centralized states, authentication/permission/network failures, fixed targets, compact content, device preference preservation, recovery, conflict decisions, and mocked upload/download behavior. `tests/sync-preview.html` is a development-only sync state gallery. `tests/foundation.test.mjs` checks reset identity, assets, symbols, and state boundaries. Automated sync tests never contact GitHub.

Real GitHub verification remains a separate setup step: create the fixed data file and use an app-data-only token with Contents Read and write in Settings → Data Sync; Test/Save and verify a Notes round trip on a second browser. Never include credentials in test fixtures or source.
