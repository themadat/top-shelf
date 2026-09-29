# Data and Persistence Reference

## Local preferences and data contracts

Identity/build settings live in config.js. Storage key topShelf.state.v5 migrates topShelf.state.v4; local schema 7. Full backups use top-shelf-backup. Content sync uses top-shelf-app-data v6/schema 10 and accepts earlier v1–v5 cloud envelopes. Keep namespace compatibility. TV uses a new envelope version so earlier clients reject TV-bearing data.

Device-local ui fields (full backups, excluded from content sync): tv (view/sort/direction/widths/pivotWidths/episodeWidths/filter/query); movieSorts by all/wishlist/watched; movieColumnWidths with separate maps per tab; pivotColumnWidths; pivotLocalSettings; pivotSubsectionSorts. Old flat movie widths migrate to independent copies. Old workspace.pivotSettings is a fallback until locally overridden; scoring baseline/weight remain shared. Reset preferences clears local overrides.

GitHub target is fixed: themadat/app-data/main/data/top-shelf.json. Imports cannot redirect it. Never write that separate repo without explicit authorization. Tokens are browser-only and excluded from config, exports, diagnostics and content sync. Provisioning instructions: docs/RESET.md. Never request tokens in chat. Keep origin git@github.com:themadat/top-shelf.git; machine SSH setup belongs in user configuration.

Sync repairs baselineHash only when baselineTarget and nonempty baselineSha match the freshly fetched remote blob. Different revisions still require normal conflict handling. No timestamp-winner guessing. Recovery precedes destructive replacements/batches; concurrent edits must not be overwritten.

Cloud download/merge and manual recovery prefer an IndexedDB recovery snapshot, committed before removing the superseded localStorage recovery key. This frees localStorage space without removing the active library, credentials, or unrelated keys. If IndexedDB is unavailable, the existing localStorage recovery path remains a fallback. Startup loads database recovery for Developer Tools and recovery from an unreadable active state; Erase All clears both stores. Replacements publish state and success only after the active library is persisted. Failed writes retain the prior live and stored library; async recovery rejects intervening edits. A cloud library larger than localStorage capacity still fails safely.

Notes buffers typing 300ms before normalization; flush on blur/close/hidden/page exit, cancel pending drafts on state replacement. Movie/pivot/subgenre views ignore edit-document redraws. Notes fills desktop height minus 2rem and is full-screen on mobile.


TV model, editor, imports and one-time data behavior: [TV.md](TV.md).
